const meetingDB = window.veraClient;

const conversation =
    document.querySelector('#conversation');

const messageForm =
    document.querySelector('#message-form');

const messageComposer =
    document.querySelector('#message-composer');

const messageStatus =
    document.querySelector('#message-status');

const recipientName =
    document.querySelector('#recipient-name');


const recipientId =
    new URLSearchParams(window.location.search)
        .get('recipient');

let currentUser = null;
let chatReady = false;
const sendButton = messageForm.querySelector('button[type="submit"]');
sendButton.disabled = true;

async function loadChat() {
    conversation.replaceChildren();

    if (!recipientId) {
        messageStatus.textContent =
            'No employee was selected.';
        return;
    }

    const {
        data: { user },
        error: userError
    } = await miguelSupabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = 'chat-login.html?recipient=' + encodeURIComponent(recipientId);
        return;
    }

    currentUser = user;

    const {
        data: recipient,
        error: recipientError
    } = await miguelSupabaseClient
        .from('profiles')
        .select('id, display_name, email')
        .eq('id', recipientId)
        .single();

    if (recipientError || !recipient) {
        messageStatus.textContent =
            'The employee could not be found.';
        return;
    }

    recipientName.textContent =
        recipient.display_name;
        showPendingNotificationMessage();
    subscribeToMessages();
    chatReady = true;
    sendButton.disabled = false;
    messageComposer.focus();
}

async function loadMessages() {
    const { data, error } =
        await miguelSupabaseClient
            .from('messages')
            .select('*')
            .or(
                `and(sender_id.eq.${currentUser.id},recipient_id.eq.${recipientId}),` +
                `and(sender_id.eq.${recipientId},recipient_id.eq.${currentUser.id})`
            )
            .order('created_at', {
                ascending: false
            })
            .limit(1);

    if (error) {
        console.error(
            'Message loading error:',
            error
        );

        messageStatus.textContent =
            'The most recent message could not load.';

        return;
    }

    conversation.replaceChildren();

    data.reverse().forEach(displayMessage);
}

function displayMessage(message) {
    const messageElement =
        document.createElement('p');

    messageElement.textContent =
        message.body;

    if (message.sender_id === currentUser.id) {
        messageElement.className = 'sent-message';
    } else {
        messageElement.className = 'received-message';
    }

    conversation.appendChild(messageElement);
}

messageForm.addEventListener('submit', async event => {
    event.preventDefault();

    const body =
        messageComposer.value.trim();

    if (!body || !chatReady) {
        return;
    }

    messageStatus.textContent =
        'Sending...';

    const { error } =
        await miguelSupabaseClient
            .from('messages')
            .insert({
                sender_id: currentUser.id,
                recipient_id: recipientId,
                body
            });

    if (error) {
        messageStatus.textContent =
            'Message could not be sent.';
        console.error(error);
        return;
    }

    messageComposer.value = '';

    messageStatus.textContent =
        'Message sent.';
});

document
    .querySelectorAll('[data-prompt]')
    .forEach(button => {
        button.addEventListener('click', () => {
            messageComposer.value =
                button.dataset.prompt;

            messageComposer.focus();
        });
    });

    function showPendingNotificationMessage() {
    const pendingKey =
        `pending-message-${recipientId}`;

    const pendingMessage =
        sessionStorage.getItem(pendingKey);

    if (!pendingMessage) {
        return;
    }

    displayMessage({
        body: pendingMessage,
        sender_id: recipientId
    });

    sessionStorage.removeItem(pendingKey);
}

function subscribeToMessages() {
    miguelSupabaseClient
        .channel('private-messages')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            },
            payload => {
                const message =
                    payload.new;

                const belongsToChat =
                    (
                        message.sender_id === currentUser.id &&
                        message.recipient_id === recipientId
                    ) ||
                    (
                        message.sender_id === recipientId &&
                        message.recipient_id === currentUser.id
                    );

                if (belongsToChat) {
                    displayMessage(message);
                }
            }
        )
        .subscribe();
}

loadChat();

window.addEventListener('pageshow', event => {
    if (event.persisted) {
        conversation.replaceChildren();
    }
});

/// Schedule
async function userID(){
    const { data: { user } } = await miguelSupabaseClient.auth.getUser();
    return user?.id;
} 
function guestID(){
    return recipientId;
}

const dateInput  = document.getElementById('meeting-date');
const timeInput  = document.getElementById('meeting-time');
const meetingButton     = document.getElementById('schedule-button');
const listEl     = document.getElementById('meeting-list');

function formatRng(startIso, endIso){
    const start = new Date(startIso);
    const end = new Date(endIso);

    return start.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' }) +
         ' – ' + end.toLocaleTimeString([], { timeStyle: 'short' });
}

function times(){
    if(!dateInput.value || !timeInput.value) return null;

    const start = new Date(`${dateInput.value}T${timeInput.value}`);
    start.setMinutes(0, 0, 0);                                       // snap to the hour
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { start, end };
}

async function loadMeetings(){
    console.log('Loading meetings...');
    const listEl = document.getElementById('meeting-list');
    const meetLi = [];

    const userId = await userID();
    const guestId = guestID();
    console.log(userId, guestId);

    const {data: meetings, error} = await meetingDB.from('meetings').select('*').in('organizer_id, guest_id', [userId, guestId]).gte('end_at', new Date().toISOString()).order('start_at',{ascending: true});

    if (error){console.error(error); listEl.textContent = 'error'; return;}
    if (!meetings.length){ listEl.textContent = 'No upcoming meetings.'; return;}

    for (const meeting of meetings){
        const li = document.createElement('li');
        li.textContent = formatRng(meeting.start_at, meeting.end_at);
        meetLi.push(li);
    }

    listEl.replaceChildren(...meetLi);
}

async function scheduleMeeting(){
    const user = await userID();
    const guest = guestID();
    if (!user || !guest) return;

    if(!dateInput.value || !timeInput.value) return;

    const start = new Date(`${dateInput.value}T${timeInput.value}`);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    try{
        const { error } = await meetingDB.from('meetings').insert({
            organizer_id: user,
            guest_id: guest,
            start_at: start.toISOString(),
            end_at: end.toISOString()
        });

        if (error) throw error;
        await loadMeetings();
    } catch (error){
        console.error(error);
    }
}
meetingButton.addEventListener('click', scheduleMeeting);

loadMeetings();