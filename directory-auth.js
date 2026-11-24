/* Public viewing; management controls share the owner session with admin.html. */
(function () {
    'use strict';
    const store = window.EmployeeStore;
    const login = document.getElementById('admin-login-link');
    const logout = document.getElementById('logout-button');
    const management = [...document.querySelectorAll('a[href="admin.html"]')];
    let version = 0;
    function render(owner) {
        if (login) login.hidden = owner;
        if (logout) logout.hidden = !owner;
        management.forEach(link => { link.hidden = !owner; });
    }
    async function refresh() {
        const request = ++version;
        render(false);
        try {
            const owner = store && await store.getAdmin();
            if (request === version) render(Boolean(owner));
        } catch { /* Public viewing remains available if authorization cannot be verified. */ }
    }
    render(false);
    if (!store) return;
    if (logout) logout.addEventListener('click', async () => {
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
            if (logout.hidden) {
                logout.textContent = 'Sign out';
                logout.removeAttribute('aria-label');
            }
        }
    });
    store.onAuthChange(refresh);
    window.addEventListener('pageshow', refresh);
    refresh();
})();
