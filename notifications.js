
const notificationRoot =
    document.querySelector('#message-notification-root');

async function startMessageNotifications() {
    const {
        data: { user }
    } = await miguelSupabaseClient.auth.getUser();

    if (!user || !notificationRoot) {
        return;
    }

    miguelSupabaseClient
        .channel('directory-notifications')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `recipient_id=eq.${user.id}`
            },
            payload => {
                showMessageNotification(payload.new);
            }
        )
        .subscribe();
}

function showMessageNotification(message) {
    const notification =
        document.createElement('aside');

    notification.className = 'message-notification';

    const text =
        document.createElement('p');

    text.textContent =
        'You received a new message.';

    const openButton =
        document.createElement('button');

    openButton.type = 'button';
    openButton.textContent = 'Open chat';

    openButton.addEventListener('click', () => {
    const pendingKey =
        `pending-message-${message.sender_id}`;

    sessionStorage.setItem(
        pendingKey,
        message.body
    );

    window.location.href =
        `messaging.html?recipient=${encodeURIComponent(
            message.sender_id
        )}`;
});

    const closeButton =
        document.createElement('button');

    closeButton.type = 'button';
    closeButton.className = 'notification-close';
    closeButton.textContent = '×';
    closeButton.setAttribute(
        'aria-label',
        'Dismiss notification'
    );

    closeButton.addEventListener('click', () => {
        notification.remove();
    });

    notification.append(
        closeButton,
        text,
        openButton
    );

    notificationRoot.appendChild(notification);
}

startMessageNotifications();
