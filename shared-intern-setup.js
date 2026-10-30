/* Owner signs in first and enters the new shared password privately. */
(function () {
    'use strict';
    const store = window.EmployeeStore;
    const form = document.getElementById('shared-intern-form');
    const password = document.getElementById('shared-intern-password');
    const button = document.getElementById('shared-intern-create');
    const status = document.getElementById('shared-intern-status');
    if (!store || !form) return;
    let saving = false;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (saving || !form.reportValidity()) return;
        saving = true;
        button.disabled = true;
        status.textContent = 'Creating shared intern login…';
        try {
            if (!await store.isSiteOwner()) throw new Error('Owner access required.');
            await store.createSharedInternLogin(password.value);
            password.value = '';
            form.hidden = true;
            status.textContent = 'THE-PEOPLE is ready. Interns can sign in with that username and the password you just set. Your owner login and reveal switch are separate.';
        } catch {
            status.textContent = 'Could not create the account. Sign in as owner and retry. If the account already exists, use its existing password; setup does not reset passwords.';
        } finally {
            password.value = '';
            saving = false;
            button.disabled = false;
        }
    });
    store.onAuthChange(() => { password.value = ''; });
})();
