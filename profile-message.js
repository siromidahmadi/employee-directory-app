/* Profile composer uses the existing invited chat membership and message permissions. */
(function () {
    'use strict';
    function node(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    }
    window.ProfileMessageComposer = {
        create(employee) {
            const card = node('article', 'profile-message-card');
            const headingId = 'direct-message-' + employee.id;
            card.setAttribute('aria-labelledby', headingId);
            const header = node('div', 'direct-message-header');
            const titleGroup = node('div', 'direct-message-title');
            const badge = node('span', 'direct-message-icon');
            badge.setAttribute('aria-hidden', 'true');
            badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"/></svg>';
            const titles = node('div');
            const heading = node('h3', '', 'Send Direct Message to ' + employee.name);
            heading.id = headingId;
            const subtitle = node('p', 'direct-message-subtitle', 'Private in-app messaging');
            titles.append(heading, subtitle);
            titleGroup.append(badge, titles);
            const channels = node('div', 'direct-message-channels');
            channels.setAttribute('role', 'group');
            channels.setAttribute('aria-label', 'Message channel');
            let channel = 'chat';
            const chat = node('button', '', 'In-app');
            const email = node('button', '', 'Email');
            const channelButtons = [chat, email];
            const form = node('form', 'direct-message-form');
            const prompts = node('div', 'direct-message-prompts');
            prompts.append(node('span', '', 'Quick prompts:'));
            const firstName = String(employee.name || 'there').split(/\s+/)[0];
            const field = node('textarea', 'direct-message-input');
            field.rows = 3;
            field.maxLength = 500;
            field.required = true;
            field.setAttribute('aria-label', 'Private message to ' + employee.name);
            field.placeholder = 'Type a private message to ' + employee.name + '… Enter to send, Shift+Enter for a new line';
            function insert(before, after = '') {
                const start = field.selectionStart, end = field.selectionEnd;
                const selected = field.value.slice(start, end);
                const text = before + selected + after;
                if (field.value.length - selected.length + text.length > field.maxLength) return;
                field.setRangeText(text, start, end, 'end');
                field.focus();
                field.dispatchEvent(new Event('input', { bubbles: true }));
            }
            for (const [label, text] of [
                ['👋 Introduce yourself', 'Hi ' + firstName + ', I wanted to introduce myself and learn more about your work.'],
                ['🗓️ Request 15m chat', 'Hi ' + firstName + ', would you have 15 minutes for a quick chat this week?'],
                ['🎨 Design System query', 'Hi ' + firstName + ', I have a question about the design system. Could you point me in the right direction?'],
                ['🚀 Project sync', 'Hi ' + firstName + ', could we sync on our project and next steps?']
            ]) {
                const button = node('button', '', label);
                button.type = 'button';
                button.addEventListener('click', () => { field.value = text; field.focus(); field.dispatchEvent(new Event('input')); });
                prompts.append(button);
            }
            const compose = node('div', 'direct-message-compose');
            const footer = node('div', 'direct-message-footer');
            const tools = node('div', 'direct-message-tools');
            for (const [label, symbol, action] of [
                ['Bold (adds ** around selected text)', 'B', () => insert('**', '**')],
                ['Insert link', '↗', () => insert('https://')],
                ['Insert greeting emoji', '☺', () => insert('👋')]
            ]) {
                const button = node('button', '', symbol);
                button.type = 'button'; button.title = label; button.setAttribute('aria-label', label);
                button.addEventListener('click', action); tools.append(button);
            }
            const attachment = node('button', '', '📎');
            attachment.type = 'button'; attachment.disabled = true;
            attachment.title = 'File attachments are not supported in app messages';
            attachment.setAttribute('aria-label', attachment.title); tools.append(attachment);
            const count = node('span', 'direct-message-count', '0 / 500');
            field.addEventListener('input', () => { count.textContent = field.value.length + ' / 500'; });
            const send = node('button', 'direct-message-send', 'Send Message');
            send.type = 'submit';
            const status = node('p', 'direct-message-status');
            status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
            const signIn = node('a', 'direct-message-signin', 'Sign in to chat');
            signIn.href = 'chat-login.html?employee=' + encodeURIComponent(employee.id);
            signIn.target = '_blank'; signIn.rel = 'noopener noreferrer'; signIn.hidden = true;
            function selectChannel(next) {
                channel = next;
                chat.setAttribute('aria-pressed', String(next === 'chat'));
                email.setAttribute('aria-pressed', String(next === 'email'));
                subtitle.textContent = next === 'chat' ? 'Private in-app messaging' : 'Opens a draft in your email app';
                send.textContent = next === 'chat' ? 'Send Message' : 'Open Email Draft';
                status.textContent = ''; signIn.hidden = true;
            }
            channelButtons.forEach((button, index) => {
                button.type = 'button';
                button.addEventListener('click', () => selectChannel(index ? 'email' : 'chat'));
                channels.append(button);
            });
            for (const label of ['Slack', 'MS Teams']) {
                const button = node('button', '', label); button.type = 'button'; button.disabled = true;
                button.title = label + ' is not connected'; button.setAttribute('aria-label', button.title); channels.append(button);
            }
            if (!employee.email) { email.disabled = true; email.title = 'No email listed'; }
            selectChannel('chat');
            header.append(titleGroup, channels);
            footer.append(tools, count, send);
            compose.append(field, footer);
            form.append(prompts, compose, status, signIn);
            card.append(header, form);
            let sending = false;
            form.addEventListener('submit', async event => {
                event.preventDefault();
                const body = field.value.trim();
                if (sending || !body) return;
                if (channel === 'email') {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email || '')) { status.textContent = 'No valid email is listed for this person.'; return; }
                    window.location.href = 'mailto:' + encodeURIComponent(employee.email) + '?subject=' + encodeURIComponent('Connecting with ' + employee.name) + '&body=' + encodeURIComponent(body);
                    status.textContent = 'Email draft requested. Send it from your email app.';
                    return;
                }
                sending = true; send.disabled = true; channelButtons.forEach(b => { b.disabled = true; });
                status.textContent = 'Sending…'; signIn.hidden = true;
                try {
                    const store = window.ChatStore;
                    if (!store) throw Error('Messaging is unavailable. Please reload and try again.');
                    const user = await store.current();
                    if (!user) { signIn.hidden = false; throw Error('Sign in with an invited account to send. Your message is still here.'); }
                    const members = await store.members();
                    const recipient = members.find(member => member.active && member.employee_id === employee.id);
                    if (!recipient) throw Error('This person has not been invited to in-app chat yet. You can use Email instead.');
                    if (recipient.user_id === user.id) throw Error('This is your own profile. Choose a teammate to message.');
                    await store.send(user.id, recipient.user_id, body);
                    if (field.value.trim() === body) { field.value = ''; field.dispatchEvent(new Event('input')); }
                    status.textContent = 'Message sent.';
                } catch (error) {
                    status.textContent = error.message && /^(Sign in|This person|This is your|Messaging is)/.test(error.message)
                        ? error.message : 'Message could not be sent. Your text is still here; try again.';
                } finally {
                    sending = false; send.disabled = false; channelButtons.forEach(b => { b.disabled = false; });
                    email.disabled = !employee.email;
                }
            });
            field.addEventListener('keydown', event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
            });
            return card;
        }
    };
})();
