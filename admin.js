(function () {
    'use strict';
    const store = window.EmployeeStore;
    const $ = id => document.getElementById(id);
    const fields = ['name', 'title', 'department', 'location', 'region', 'country', 'timeZone', 'email', 'bio', 'skills', 'linkedin', 'github', 'portfolio', 'joiningDate'];
    let employees = [];
    let editing = null;
    let pendingDelete = null;
    let previewObjectUrl = null;
    let busy = false;
    let sessionVersion = 0;
    let activeAdminId = null;

    function message(text, error = false) {
        $('admin-status').textContent = text;
        $('admin-status').dataset.error = String(error);
    }
    function setBusy(value) {
        busy = value;
        $('employee-fields').disabled = value;
        document.querySelectorAll('#manager-panel button, #sign-in, #sign-out, #confirm-delete').forEach(b => { b.disabled = value; });
    }
    function preview(url) {
        if (previewObjectUrl) { URL.revokeObjectURL(previewObjectUrl); previewObjectUrl = null; }
        $('photo-preview').hidden = !url;
        if (url) $('photo-preview').src = url;
        else $('photo-preview').removeAttribute('src');
        syncPreview();
    }
    function clearEditor() {
        editing = null;
        $('employee-form').reset();
        $('editor-title').textContent = 'Add teammate';
        $('save-employee').textContent = 'Add teammate →';
        $('save-draft').hidden = false;
        updateDraftButton();
        preview('');
    }
    function edit(employee) {
        if (busy) return;
        clearEditor();
        editing = employee;
        for (const key of fields) $('employee-' + key).value = key === 'skills' ? employee.skills.join(', ') : (key === 'location' ? (employee.locationRaw ?? employee.location ?? '') : (employee[key] || ''));
        $('editor-title').textContent = 'Edit teammate';
        $('save-draft').hidden = true;
        $('save-employee').textContent = 'Save changes';
        preview(employee.image);
        $('employee-name').focus();
        message('Editing ' + employee.name + '. Changes are saved only when you click Save changes.');
    }
    function renderList() {
        const list = $('admin-employees');
        list.replaceChildren();
        $('admin-count').textContent = '(' + employees.length + ')';
        const query = $('admin-search').value.trim().toLowerCase();
        const filtered = employees.filter(e => [e.name, e.title, e.department].some(v => v.toLowerCase().includes(query)));
        for (const employee of filtered.sort((a,b) => a.name.localeCompare(b.name))) {
            const item = document.createElement('li');
            item.className = 'admin-employee';
            const details = document.createElement('div');
            const name = document.createElement('strong'); name.textContent = employee.name;
            const description = document.createElement('p'); description.textContent = employee.title + ' · ' + employee.department;
            details.append(name, description);
            const actions = document.createElement('div'); actions.className = 'employee-row-actions';
            const editButton = document.createElement('button'); editButton.type = 'button'; editButton.textContent = 'Edit'; editButton.setAttribute('aria-label', 'Edit ' + employee.name);
            editButton.addEventListener('click', () => edit(employee));
            const removeButton = document.createElement('button'); removeButton.type = 'button'; removeButton.textContent = 'Remove'; removeButton.className = 'admin-danger'; removeButton.setAttribute('aria-label', 'Remove ' + employee.name);
            removeButton.addEventListener('click', () => {
                if (busy) return;
                pendingDelete = employee;
                $('delete-description').textContent = 'Remove ' + employee.name + ' from the public directory? This cannot be undone from this page.';
                $('delete-dialog').showModal();
            });
            actions.append(editButton, removeButton); item.append(details, actions); list.append(item);
        }
        if (!filtered.length) { const empty = document.createElement('li'); empty.textContent = query ? 'No matching employees.' : 'No employees yet. Add your first employee using the form.'; list.append(empty); }
        $('department-options').replaceChildren(...[...new Set(employees.map(e => e.department))].sort().map(department => {
            const option = document.createElement('option'); option.value = department; return option;
        }));
    }
    async function reloadEmployees() { employees = await store.list(); renderList(); }
    async function refreshSession() {
        const version = ++sessionVersion;
        try {
            const admin = await store.getAdmin();
            if (version !== sessionVersion) return;
            $('login-panel').hidden = !!admin;
            $('manager-panel').hidden = !admin;
            $('session-bar').hidden = !admin;
            if (!admin) {
                activeAdminId = null;
                employees = []; clearEditor();
                message('Sign in to manage employees. Only approved admin accounts can make changes.');
                return;
            }
            $('signed-in-as').textContent = 'Signed in as ' + (admin.email === 'interns.thepeople@example.com' ? 'THE-PEOPLE (shared intern account)' : admin.email);
            if (activeAdminId !== admin.id) {
                clearEditor();
                await reloadEmployees();
                if (version !== sessionVersion) return;
                activeAdminId = admin.id;
                updateDraftButton();
                if (version === sessionVersion) message('Ready. Saved employee changes are available to everyone viewing the directory.');
            }
        } catch {
            if (version !== sessionVersion) return;
            activeAdminId = null;
            $('manager-panel').hidden = true; $('session-bar').hidden = true; $('login-panel').hidden = false;
            message('Could not connect. Please refresh and try again.', true);
        }
    }
    // UI enhancements use the same fields and save service as the existing manager.
    function skillValues() {
        return $('employee-skills').value.split(',').map(value => value.trim()).filter(Boolean);
    }
    function syncPreview() {
        const name = $('employee-name').value.trim();
        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => [...part][0]).join('').toUpperCase() || '?';
        $('card-name').textContent = name || 'Your new teammate';
        $('card-title').textContent = $('employee-title').value.trim() || 'Role / job title';
        $('card-department').textContent = $('employee-department').value.trim() || 'Department';
        $('card-email').textContent = $('employee-email').value.trim() || 'Public email';
        $('card-location').textContent = [$('employee-location').value.trim(), $('employee-region').value.trim(), $('employee-country').value].filter(Boolean).join(', ') || 'Location not listed';
        $('card-initials').textContent = initials;
        $('upload-initials').textContent = initials === '?' ? '+' : initials;
        const photo = $('photo-preview');
        $('card-photo').hidden = photo.hidden;
        if (!photo.hidden) $('card-photo').src = photo.src;
        else $('card-photo').removeAttribute('src');
        const bio = $('employee-bio').value.trim();
        $('card-bio').textContent = bio;
        $('card-bio').hidden = !bio;
        $('card-skills').replaceChildren();
        const skills = skillValues();
        for (const skill of skills.slice(0, 3)) {
            const tag = document.createElement('span'); tag.className = 'skill-chip'; tag.textContent = skill; $('card-skills').append(tag);
        }
        let complete = 0;
        for (const key of ['name', 'email', 'title', 'department']) {
            const input = $('employee-' + key);
            const valid = !!input.value.trim() && input.validity.valid;
            const item = document.querySelector('[data-check="' + key + '"]');
            item.dataset.complete = String(valid);
            item.querySelector('span').textContent = valid ? '✓' : '○';
            item.setAttribute('aria-label', item.textContent.trim() + (valid ? ', complete' : ', incomplete'));
            if (valid) complete++;
        }
        $('readiness-label').textContent = complete + ' of 4 required';
        $('readiness-progress').value = complete;
        $('readiness-progress').textContent = complete + ' of 4';
        $('employee-skills').setCustomValidity(skills.length > 20 || skills.some(skill => skill.length > 80) ? 'Use up to 20 skills, with at most 80 characters each.' : '');
        $('skill-chip-list').replaceChildren();
        skills.forEach((skill, index) => {
            const chip = document.createElement('span'); chip.className = 'skill-chip';
            const label = document.createElement('span'); label.textContent = skill;
            const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.disabled = busy;
            remove.setAttribute('aria-label', 'Remove skill ' + skill);
            remove.addEventListener('click', () => {
                if (busy) return;
                const updated = skillValues(); updated.splice(index, 1); $('employee-skills').value = updated.join(', '); syncPreview(); $('employee-skills').focus();
            });
            chip.append(label, remove); $('skill-chip-list').append(chip);
        });
    }
    function draftKey() { return 'thePeople.teammateDraft.' + activeAdminId; }
    function updateDraftButton() {
        let available = false;
        try { available = !!activeAdminId && !!localStorage.getItem(draftKey()); } catch {}
        $('restore-draft').hidden = !available;
    }
    $('employee-form').addEventListener('input', syncPreview);
    document.querySelectorAll('[data-skill]').forEach(button => button.addEventListener('click', () => {
        if (busy) return;
        const skills = skillValues();
        if (skills.some(skill => skill.toLowerCase() === button.dataset.skill.toLowerCase())) return;
        if (skills.length >= 20) { message('Use up to 20 skills.', true); return; }
        $('employee-skills').value = skills.concat(button.dataset.skill).join(', '); syncPreview();
    }));
    $('save-draft').addEventListener('click', () => {
        if (busy || !activeAdminId || editing) return;
        try {
            const draft = Object.fromEntries(fields.map(key => [key, $('employee-' + key).value]));
            localStorage.setItem(draftKey(), JSON.stringify(draft)); updateDraftButton();
            message('Draft saved in this browser. It is not published. Choose the photo again when restoring.');
        } catch { message('This browser could not save the draft. Your entries are still in the form.', true); }
    });
    $('restore-draft').addEventListener('click', () => {
        if (busy || !activeAdminId) return;
        try {
            const draft = JSON.parse(localStorage.getItem(draftKey()) || 'null');
            if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return;
            clearEditor();
            for (const key of fields) if (typeof draft[key] === 'string') $('employee-' + key).value = draft[key];
            syncPreview(); $('employee-name').focus();
            message('Draft restored. Choose a photo if needed, then Add teammate to publish.');
        } catch { message('This draft could not be restored.', true); }
    });
    const theme = $('admin-theme');
    function applyTheme(dark) {
        document.body.classList.toggle('darkMode', dark); theme.setAttribute('aria-pressed', String(dark));
        theme.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
        theme.setAttribute('aria-label', theme.title);
    }
    let savedTheme = null;
    try { savedTheme = localStorage.getItem('darkMode'); } catch {}
    applyTheme(savedTheme === null ? !!window.matchMedia?.('(prefers-color-scheme: dark)').matches : savedTheme === 'enabled');
    theme.addEventListener('click', () => {
        const dark = !document.body.classList.contains('darkMode'); applyTheme(dark);
        try { localStorage.setItem('darkMode', dark ? 'enabled' : 'null'); } catch {}
    });
    window.addEventListener('storage', event => {
        if (event.key === 'darkMode') applyTheme(event.newValue === 'enabled');
    });
    syncPreview();
    if (!store) { message('The login service could not load. Please refresh the page.', true); return; }
    $('login-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (busy || !$('login-form').reportValidity()) return;
        setBusy(true); message('Signing in…');
        try {
            await store.signIn($('login-email').value.trim(), $('login-password').value);
            $('login-password').value = '';
            const admin = await store.getAdmin();
            if (!admin) {
                await store.signOut();
                message('This account is not approved to manage employees. Contact the project owner.', true);
            } else await refreshSession();
        } catch { message('Sign-in failed. Check your email and password, then try again.', true); }
        finally { setBusy(false); }
    });
    $('sign-out').addEventListener('click', async () => {
        try { await store.signOut(); activeAdminId = null; await refreshSession(); }
        catch { message('Could not sign out. Please try again.', true); }
    });
    $('employee-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (busy || !$('employee-form').reportValidity()) return;
        setBusy(true); message(editing ? 'Saving changes…' : 'Adding employee…');
        let uploaded = '';
        let persisted = false;
        const oldPhoto = editing?.image;
        try {
            const input = Object.fromEntries(fields.map(key => [key, $('employee-' + key).value]));
            input.skills = input.skills.split(',').map(s => s.trim()).filter(Boolean);
            const file = $('employee-photo').files[0];
            input.image = $('remove-photo').checked ? '' : (editing?.image || '');
            if (file) input.image = uploaded = await store.uploadPhoto(file);
            const saved = await store.save(input, editing);
            persisted = true;
            employees = employees.filter(e => e.id !== saved.id).concat(saved);
            if (!editing) { try { localStorage.removeItem(draftKey()); } catch {} }
            renderList(); clearEditor(); message(saved.name + ' saved. Refresh the public directory to see the update.');
            if (oldPhoto && oldPhoto !== saved.image) {
                try { await store.removePhotoIfUnused(oldPhoto); }
                catch { message(saved.name + ' saved. The old photo could not be cleaned up yet.'); }
            }
        } catch (error) {
            if (uploaded && !persisted) { try { await store.removePhotoIfUnused(uploaded); } catch { /* Preserve original save error. */ } }
            message(error.message || 'Could not save this employee. Please try again.', true);
        } finally { setBusy(false); }
    });
    $('employee-photo').addEventListener('change', () => {
        const file = $('employee-photo').files[0];
        if (!file) { preview(editing?.image || ''); return; }
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2097152) {
            $('employee-photo').value = ''; preview(editing?.image || ''); message('Choose a JPG, PNG, or WebP photo smaller than 2 MB.', true); return;
        }
        preview(''); previewObjectUrl = URL.createObjectURL(file);
        $('photo-preview').src = previewObjectUrl; $('photo-preview').hidden = false; $('remove-photo').checked = false; syncPreview();
    });
    $('remove-photo').addEventListener('change', () => {
        if ($('remove-photo').checked) { $('employee-photo').value = ''; preview(''); }
        else preview(editing?.image || '');
    });
    $('new-employee').addEventListener('click', () => { if (!busy) { clearEditor(); message('Ready to add a new employee.'); } });
    $('reload-employees').addEventListener('click', async () => {
        if (busy) return;
        setBusy(true);
        try { await reloadEmployees(); message('Employee list refreshed.'); }
        catch { message('Could not refresh employees. Please try again.', true); }
        finally { setBusy(false); }
    });
    $('admin-search').addEventListener('input', renderList);
    $('cancel-delete').addEventListener('click', () => $('delete-dialog').close());
    $('delete-dialog').addEventListener('close', () => { pendingDelete = null; });
    $('confirm-delete').addEventListener('click', async () => {
        if (busy || !pendingDelete) return;
        const employee = pendingDelete; setBusy(true);
        try {
            await store.remove(employee);
            employees = employees.filter(e => e.id !== employee.id); renderList();
            if (editing?.id === employee.id) clearEditor();
            $('delete-dialog').close(); message(employee.name + ' removed from the directory.');
            try { await store.removePhotoIfUnused(employee.image); }
            catch { message(employee.name + ' removed. Photo cleanup could not finish yet.'); }
        } catch (error) { $('delete-dialog').close(); message(error.message || 'Could not remove this employee.', true); }
        finally { setBusy(false); }
    });
    store.onAuthChange(refreshSession);
    refreshSession();
})();

