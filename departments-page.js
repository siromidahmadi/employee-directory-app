/* Department summary, alternate view, openings and header actions.
   Does not change the team toolbar, creation flow, or department card contents. */
(function () {
    'use strict';
    const page = document.getElementById('Departments');
    const grid = document.getElementById('department-grid');
    if (!page || !grid) return;
    const byId = id => document.getElementById(id);
    const header = document.querySelector('.department-header-tools');
    const input = byId('header-directory-search');
    const results = byId('header-directory-results');
    const dialog = byId('department-openings-dialog');
    let people = [], departments = [], openings = Object.create(null), openingsState = 'loading';
    let view = 'grid';
    try { view = localStorage.getItem('departmentView') === 'list' ? 'list' : 'grid'; } catch {}
    const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    function setView(next) {
        view = next;
        grid.dataset.layout = view;
        byId('department-view-grid').setAttribute('aria-pressed', String(view === 'grid'));
        byId('department-view-list').setAttribute('aria-pressed', String(view === 'list'));
        try { localStorage.setItem('departmentView', view); } catch {}
    }
    byId('department-view-grid').addEventListener('click', () => setView('grid'));
    byId('department-view-list').addEventListener('click', () => setView('list'));
    setView(view);
    function listedFor(key) {
        return Object.hasOwn(openings, key) && Array.isArray(openings[key]) ? openings[key] : null;
    }
    function updateSummary() {
        byId('department-summary-count').textContent = String(departments.length);
        byId('department-summary-headcount').textContent = String(people.length);
        const known = departments.filter(dept => listedFor(dept.key) !== null);
        const count = known.reduce((sum, dept) => sum + listedFor(dept.key).length, 0);
        const complete = departments.length > 0 && known.length === departments.length;
        byId('department-summary-openings').textContent = complete ? String(count) + ' Roles' : known.length ? String(count) + '+ Roles' : 'Not listed';
        byId('department-openings-note').textContent = openingsState === 'error'
            ? 'Openings could not load. Try reloading the page.'
            : complete ? 'Listed roles across all departments.'
            : known.length ? 'Some departments have no openings information yet.'
            : 'Openings information has not been provided.';
    }
    function decorateTiles() {
        grid.querySelectorAll('.department-tile').forEach(tile => {
            if (tile.querySelector('.department-openings')) return;
            const card = tile.querySelector('.department-card');
            const name = card.querySelector('.department-name').textContent;
            const key = normalize(name);
            const roles = listedFor(key);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'department-openings';
            button.textContent = roles === null ? 'Openings: not listed' : `${roles.length} ${roles.length === 1 ? 'opening' : 'openings'}`;
            button.setAttribute('aria-label', `View openings for ${name}`);
            button.addEventListener('click', () => showOpenings(key));
            tile.append(button);
        });
    }
    function showOpenings(key) {
        const selected = key ? departments.filter(dept => dept.key === key) : departments;
        const content = byId('department-openings-content');
        content.replaceChildren();
        byId('department-openings-title').textContent = key && selected[0] ? `${selected[0].name} openings` : 'Department openings';
        selected.forEach(dept => {
            const section = document.createElement('section');
            const heading = document.createElement('h3');
            heading.textContent = dept.name;
            section.append(heading);
            const roles = listedFor(dept.key);
            if (!roles || !roles.length) {
                const note = document.createElement('p');
                note.textContent = roles === null ? 'Openings information has not been provided for this department.' : 'No open roles listed.';
                section.append(note);
            } else {
                const list = document.createElement('ul');
                roles.forEach(role => {
                    const item = document.createElement('li');
                    const title = document.createElement('strong');
                    title.textContent = role.title;
                    item.append(title);
                    if (role.location) {
                        const location = document.createElement('p');
                        location.textContent = role.location;
                        item.append(location);
                    }
                    list.append(item);
                });
                section.append(list);
            }
            content.append(section);
        });
        if (!selected.length) content.textContent = 'No departments are available yet.';
        if (!dialog.open) dialog.showModal();
    }
    byId('department-view-openings').addEventListener('click', () => showOpenings());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    document.addEventListener('departments-rendered', event => {
        people = event.detail.employees;
        const groups = new Map();
        people.forEach(person => {
            const name = String(person.department || '').trim();
            if (name && !groups.has(normalize(name))) groups.set(normalize(name), { key: normalize(name), name });
        });
        departments = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
        updateSummary();
        decorateTiles();
        renderHeaderResults();
    });
    function syncHeader() {
        header.hidden = !['#Departments', '#Groups'].includes(window.location.hash);
        if (header.hidden) { results.hidden = true; input.setAttribute('aria-expanded', 'false'); }
    }
    window.addEventListener('hashchange', syncHeader);
    syncHeader();
    function showDirectory() {
        const search = byId('search');
        search.value = input.value.trim();
        byId('department-filter').value = 'all';
        search.dispatchEvent(new Event('input', { bubbles: true }));
        window.addEventListener('hashchange', () => search.focus({ preventScroll: true }), { once: true });
        window.location.hash = '#directory';
        results.hidden = true;
        input.setAttribute('aria-expanded', 'false');
    }
    function renderHeaderResults() {
        const query = normalize(input.value);
        results.replaceChildren();
        results.hidden = !query || header.hidden;
        input.setAttribute('aria-expanded', String(!results.hidden));
        if (results.hidden) return;
        const words = query.split(/\s+/);
        const matches = people.filter(person => {
            const text = normalize([person.name, person.title, person.department, person.email, person.location, person.region, person.country, ...(Array.isArray(person.skills) ? person.skills : [])].join(' '));
            return words.every(word => text.includes(word));
        });
        matches.slice(0, 6).forEach(person => {
            const link = document.createElement('a');
            link.href = `index.html?employee=${encodeURIComponent(person.id)}#directory`;
            const name = document.createElement('strong');
            name.textContent = person.name || 'Teammate';
            const role = document.createElement('small');
            role.textContent = [person.title, person.department].filter(Boolean).join(' · ');
            link.append(name, role);
            results.append(link);
        });
        if (!matches.length) {
            const note = document.createElement('p');
            note.textContent = 'No matches. Try a name, skill, role, or location.';
            results.append(note);
        }
    }
    input.addEventListener('input', renderHeaderResults);
    input.addEventListener('focus', renderHeaderResults);
    byId('header-directory-form').addEventListener('submit', event => { event.preventDefault(); showDirectory(); });
    header.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            results.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            input.focus();
        }
        if (!['ArrowDown', 'ArrowUp'].includes(event.key) || results.hidden) return;
        const links = [...results.querySelectorAll('a')];
        if (!links.length) return;
        const index = links.indexOf(document.activeElement);
        if (document.activeElement !== input && index < 0) return;
        event.preventDefault();
        if (event.key === 'ArrowUp' && index === 0) input.focus();
        else if (index < 0) links[event.key === 'ArrowDown' ? 0 : links.length - 1].focus();
        else links[(index + (event.key === 'ArrowDown' ? 1 : links.length - 1)) % links.length].focus();
    });
    document.addEventListener('click', event => {
        if (!header.contains(event.target)) { results.hidden = true; input.setAttribute('aria-expanded', 'false'); }
    });
    fetch('department-openings.json').then(response => {
        if (!response.ok) throw new Error('Openings unavailable');
        return response.json();
    }).then(data => {
        if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Invalid openings data');
        for (const [name, roles] of Object.entries(data)) {
            if (Array.isArray(roles)) openings[normalize(name)] = roles.filter(role => role && typeof role.title === 'string' && role.title.trim());
        }
        openingsState = 'ready';
    }).catch(() => { openingsState = 'error'; }).finally(() => {
        updateSummary();
        grid.querySelectorAll('.department-openings').forEach(button => button.remove());
        decorateTiles();
    });
})();
