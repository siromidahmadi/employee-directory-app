/* Passwords are entered privately by the signed-in owner and never saved locally. */
(function () {
    'use strict';
    const store = window.EmployeeStore;
    const form = document.getElementById('shared-intern-form');
    const password = document.getElementById('shared-intern-password');
    const create = document.getElementById('shared-intern-create');
    const reset = document.getElementById('shared-intern-reset');
    const status = document.getElementById('shared-intern-status');
    if (!store || !form) return;
    let saving = false;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (saving || !form.reportValidity()) return;
        const action = event.submitter === reset ? 'reset' : 'create';
        saving = true;
        create.disabled = reset.disabled = true;
        status.textContent = action === 'reset' ? 'Resetting shared intern password…' : 'Creating shared intern login…';
        try {
            if (!await store.isSiteOwner()) throw new Error('Owner access required.');
            await store.createSharedInternLogin(password.value, action);
            status.textContent = action === 'reset'
                ? 'THE-PEOPLE password has been reset. Interns can use the new password. Your owner login is unchanged.'
                : 'THE-PEOPLE is ready. Interns can sign in with that username and the password you just set. Your owner login is separate.';
        } catch {
            status.textContent = action === 'reset'
                ? 'Password was not reset. Check your owner session and try again. Create the shared account first if it does not exist.'
                : 'Could not create the account. If THE-PEOPLE already exists, enter a new password and choose Reset THE-PEOPLE password.';
        } finally {
            password.value = '';
            saving = false;
            create.disabled = reset.disabled = false;
        }
    });
    store.onAuthChange(() => { password.value = ''; });
})();
