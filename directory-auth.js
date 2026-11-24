/* Account identity is separate from owner-only management permissions. */
(function () {
    'use strict';
    const store = window.EmployeeStore;
    const login = document.getElementById('admin-login-link');
    const logout = document.getElementById('logout-button');
    const management = [...document.querySelectorAll('a[href="admin.html"]')];
    if (!logout) return;
    const account = document.createElement('details');
    account.className = 'account-menu';
    account.hidden = true;
    const trigger = document.createElement('summary');
    trigger.className = 'account-avatar';
    trigger.setAttribute('aria-label', 'Open your account');
    const panel = document.createElement('div');
    panel.className = 'account-panel';
    const name = document.createElement('strong');
    const email = document.createElement('span');
    logout.before(account);
    panel.append(name, email, logout);
    account.append(trigger, panel);
    let version = 0;
    function render(owner, user) {
        if (login) login.hidden = Boolean(user);
        account.hidden = !user;
        logout.hidden = !user;
        management.forEach(link => { link.hidden = !owner; });
        if (!user) { account.open = false; trigger.replaceChildren(); name.textContent = ''; email.textContent = ''; }
    }
    function showIdentity(user, person) {
        const label = person?.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Your account';
        name.textContent = label;
        email.textContent = user.email || '';
        trigger.title = label;
        trigger.setAttribute('aria-label', 'Open account for ' + label);
        const initials = label.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
        trigger.textContent = initials;
        const source = person?.image || user.user_metadata?.avatar_url || user.user_metadata?.picture;
        try {
            const url = new URL(source, window.location.href);
            if (!source || !['https:', 'http:'].includes(url.protocol) || url.username || url.password) return;
            const photo = document.createElement('img');
            photo.alt = '';
            photo.referrerPolicy = 'no-referrer';
            photo.addEventListener('error', () => { trigger.textContent = initials; }, { once: true });
            photo.src = url.href;
            trigger.replaceChildren(photo);
        } catch { /* Initials remain visible when no usable photo is available. */ }
    }
    async function refresh() {
        const request = ++version;
        try {
            const [owner, result] = await Promise.all([
                store.getAdmin().catch(() => null),
                store.getClient?.().auth.getUser().catch(() => null)
            ]);
            if (request !== version) return;
            const user = result?.data?.user || owner;
            render(Boolean(owner), user);
            if (!user) return;
            showIdentity(user);
            let member = null;
            try { member = await window.ChatStore?.current(); } catch { /* Email matching remains available. */ }
            const people = await store.list?.();
            if (request !== version) return;
            const person = (people || []).find(p => member?.id === user.id && p.id === member.member?.employee_id)
                || (people || []).find(p => user.email && p.email?.trim().toLowerCase() === user.email.trim().toLowerCase());
            showIdentity(user, person);
        } catch { /* Keep the verified session usable if profile loading fails. */ }
    }
    document.addEventListener('click', event => { if (!account.contains(event.target)) account.open = false; });
    account.addEventListener('keydown', event => {
        if (event.key === 'Escape') { account.open = false; trigger.focus(); }
    });
    render(false, null);
    if (!store) return;
    logout.addEventListener('click', async () => {
        logout.disabled = true;
        logout.textContent = 'Signing out…';
        try {
            await store.signOut();
            await refresh();
            login?.focus();
        } catch {
            logout.textContent = 'Retry sign out';
            logout.setAttribute('aria-label', 'Sign out failed. Try again.');
        } finally {
            logout.disabled = false;
            if (logout.hidden) { logout.textContent = 'Sign out'; logout.removeAttribute('aria-label'); }
        }
    });
    store.onAuthChange(refresh);
    window.addEventListener('pageshow', refresh);
    refresh();
})();
