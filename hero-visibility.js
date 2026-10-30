/* Visibility comes from the server. No URL or local-storage override is accepted. */
(function () {
    'use strict';
    const store = window.EmployeeStore;
    const hero = document.querySelector('.people-hero');
    const panel = document.getElementById('hero-owner-controls');
    const toggle = document.getElementById('hero-visibility-toggle');
    const status = document.getElementById('hero-visibility-status');
    if (!hero || !panel || !store) return;
    let enabled = false, owner = false, saving = false, ownerVersion = 0;
    function apply(value) {
        enabled = value === true;
        hero.hidden = !enabled;
        hero.dispatchEvent(new Event('hero-visibility-change'));
        toggle.setAttribute('aria-checked', String(enabled));
        toggle.textContent = enabled ? 'Hide search hero' : 'Show search hero';
    }
    async function readVisibility() {
        try { apply(await store.getHeroVisibility()); }
        catch { apply(false); }
    }
    async function readOwner() {
        const version = ++ownerVersion;
        owner = false;
        panel.hidden = true;
        toggle.disabled = true;
        try {
            const allowed = await store.isSiteOwner();
            if (version !== ownerVersion) return;
            owner = allowed === true;
            panel.hidden = !owner;
            toggle.disabled = !owner || saving;
            status.textContent = enabled ? 'The search hero is visible to visitors.' : 'The search hero is hidden. The teammate form is still available.';
        } catch { /* Keep owner controls hidden when membership cannot be verified. */ }
    }
    toggle.addEventListener('click', async () => {
        if (!owner || saving) return;
        saving = true;
        toggle.disabled = true;
        status.textContent = 'Saving visibility…';
        try {
            // RLS authorizes the write even if somebody modifies this button locally.
            apply(await store.setHeroVisibility(!enabled));
            status.textContent = enabled ? 'Search hero is on. Visitors will see it when they open or refresh this page.' : 'Search hero is off. Visitors will go straight to the teammate form.';
        } catch {
            status.textContent = 'Visibility could not be changed. Your owner session may have expired. Sign in again and retry.';
        } finally {
            saving = false;
            toggle.disabled = !owner;
        }
    });
    apply(false);
    readVisibility().then(readOwner);
    store.onAuthChange(() => { readVisibility().then(readOwner); });
    window.addEventListener('pageshow', () => { readVisibility(); });
})();
