/* Apple Spotlight by Samit Kapoor: plain-JS adaptation of the supplied component.
   Searches the shared public directory and opens the existing full profile. */
(function () {
    'use strict';
    const root = document.getElementById('teammate-spotlight');
    if (!root) return;
    const input = root.querySelector('#spotlight-search');
    const results = root.querySelector('#spotlight-results');
    const placeholder = root.querySelector('.spotlight-placeholder');
    const status = root.querySelector('#spotlight-status');
    const shortcuts = root.querySelector('.spotlight-shortcuts');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const paths = {
        search: '<circle cx="10.8" cy="10.8" r="7.8"/><path d="m16.5 16.5 4.5 4.5"/>',
        person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2M19 8h4m-2-2v4"/>',
        grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        teams: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4a4 4 0 0 1 0 8m3 3a6 6 0 0 1 3 6"/>',
        mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 5 10 8L22 5"/>',
        globe: '<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20"/>',
        link: '<path d="m10 13 4-4M8 15l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0m2 1 2-2a3 3 0 0 1 4 4l-5 5a3 3 0 0 1-4 0"/>',
        arrow: '<path d="m9 5 7 7-7 7"/>'
    };
    function icon(name) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1.4');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        // Only the fixed icon paths above are inserted as SVG markup.
        svg.innerHTML = paths[name] || paths.search;
        return svg;
    }
    const entries = [
        { label: 'Add teammate', description: 'Open the teammate workspace · admin sign-in required', href: '#teammate-workspace', icon: 'person', keywords: 'new create add form login sign in' },
        { label: 'Directory', description: 'Find people, roles, departments, and skills', href: 'index.html#directory', icon: 'grid', keywords: 'search employees colleagues people' },
        { label: 'Departments', description: 'Explore departments and teams', href: 'index.html#Departments', icon: 'teams', keywords: 'division team' },
        { label: 'About', description: 'Learn about The People', href: 'index.html#About', icon: 'globe', keywords: 'project information' },
        { label: 'Contact', description: 'Visit the contact page', href: 'index.html#Contact', icon: 'mail', keywords: 'email help' },
        { label: 'Basic identity & contact', description: 'Full name, public email, and profile photo', href: '#identity-heading', focus: 'employee-name', icon: 'person', keywords: 'upload image picture identity' },
        { label: 'Role & department', description: 'Job title, department, and joining date', href: '#role-heading', focus: 'employee-title', icon: 'teams', keywords: 'job start work' },
        { label: 'Location & time zone', description: 'City, state or province, country, and local time zone', href: '#role-heading', focus: 'employee-location', icon: 'globe', keywords: 'timezone worldwide location region canada vancouver' },
        { label: 'Bio & skills', description: 'Biography, skills, and expertise', href: '#skills-heading', focus: 'employee-bio', icon: 'search', keywords: 'experience html css javascript' },
        { label: 'Professional links', description: 'LinkedIn, GitHub, and portfolio', href: '#links-heading', focus: 'employee-linkedin', icon: 'link', keywords: 'social website profile' },
        { label: 'Manage teammates', description: 'Search the roster and edit existing profiles', href: '#roster-heading', focus: 'admin-search', icon: 'teams', keywords: 'employees list edit delete remove roster' }
    ];
    const searchPrompts = ['Search by name', 'Search by role', 'Search by skill', 'Search by department', 'Search by location'];
    let currentPrompt = searchPrompts[0];
    let promptTimer = null;
    let promptVisible = true;
    function setPlaceholder(text = currentPrompt) {
        if (placeholder.textContent !== text) {
            placeholder.textContent = text;
        }
        placeholder.hidden = Boolean(input.value);
    }
    function goToSection(event, entry) {
        if (!entry.href.startsWith('#')) return;
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const manager = document.getElementById('manager-panel');
        const locked = entry.focus && manager.hidden;
        const target = document.querySelector(locked ? '#teammate-workspace' : entry.href);
        if (!target) return;
        const focus = locked
            ? document.querySelector('#login-panel:not([hidden]) #login-email') || target
            : entry.focus ? document.getElementById(entry.focus) : target;
        if (!focus.hasAttribute('tabindex') && !focus.matches('input,select,textarea,button,a')) focus.setAttribute('tabindex', '-1');
        focus.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: motion.matches ? 'auto' : 'smooth', block: 'start' });
        if (locked) status.textContent = 'Sign in with an approved admin account to use this form field.';
    }
    function makeLink(entry, shortcut = false) {
        const link = document.createElement('a');
        link.href = entry.href;
        link.className = shortcut ? 'spotlight-shortcut' : 'spotlight-result';
        link.append(icon(entry.icon));
        if (shortcut) {
            link.setAttribute('aria-label', entry.label);
            link.title = entry.label;
        } else {
            const copy = document.createElement('span');
            copy.className = 'spotlight-result-copy';
            const label = document.createElement('strong');
            label.textContent = entry.label;
            const description = document.createElement('small');
            description.textContent = entry.description;
            copy.append(label, description);
            const arrow = icon('arrow');
            arrow.classList.add('spotlight-chevron');
            link.append(copy, arrow);
        }
        link.addEventListener('click', event => goToSection(event, entry));
        return link;
    }
    [entries[0], entries[1], entries[2], entries[4]].forEach(entry => shortcuts.append(makeLink(entry, true)));
    const suggestions = document.createElement('nav');
    suggestions.className = 'spotlight-suggestions';
    suggestions.setAttribute('aria-label', 'Ways to find people');
    const find = document.createElement('button');
    find.type = 'button';
    find.textContent = 'Find a teammate';
    find.addEventListener('click', () => input.focus({ preventScroll: true }));
    const browse = document.createElement('button');
    browse.type = 'button';
    browse.textContent = 'Browse skills';
    browse.setAttribute('aria-expanded', 'false');
    browse.setAttribute('aria-controls', 'spotlight-skills');
    const departments = document.createElement('a');
    departments.href = 'index.html#Departments';
    departments.textContent = 'Explore departments';
    suggestions.append(find, browse, departments);
    const skillPanel = document.createElement('div');
    skillPanel.id = 'spotlight-skills';
    skillPanel.className = 'spotlight-skill-options';
    skillPanel.setAttribute('role', 'group');
    skillPanel.setAttribute('aria-label', 'Search by a directory skill');
    skillPanel.hidden = true;
    root.querySelector('.spotlight-row').after(suggestions, skillPanel);
    browse.addEventListener('click', () => {
        skillPanel.hidden = !skillPanel.hidden;
        browse.setAttribute('aria-expanded', String(!skillPanel.hidden));
        if (!skillPanel.hidden) {
            if (loadState === 'idle' || loadState === 'error' || Date.now() - loadedAt > 30000) loadPeople();
            else renderSkills();
        }
    });
    let people = [];
    let loadState = 'idle';
    let loadedAt = 0;
    function renderSkills() {
        if (skillPanel.hidden) return;
        skillPanel.replaceChildren();
        const note = document.createElement('span');
        note.className = 'spotlight-skill-note';
        if (loadState !== 'ready') {
            note.textContent = loadState === 'error' ? 'Skills unavailable. Try typing a search or reopen Browse skills.' : 'Loading directory skills…';
            skillPanel.append(note);
            return;
        }
        const skills = new Map();
        people.forEach(employee => (Array.isArray(employee.skills) ? employee.skills : []).forEach(skill => {
            if (typeof skill === 'string' && skill.trim()) skills.set(normalize(skill.trim()), skill.trim());
        }));
        [...skills.values()].sort((a, b) => a.localeCompare(b)).slice(0, 8).forEach(skill => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = skill;
            button.addEventListener('click', () => {
                input.value = skill.slice(0, input.maxLength);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.focus({ preventScroll: true });
            });
            skillPanel.append(button);
        });
        if (!skills.size) {
            note.textContent = 'No skills listed yet. Search by name, role, or location instead.';
            skillPanel.append(note);
        }
    }
    function normalize(value) {
        return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    }
    function searchable(employee) {
        return normalize([
            employee.name, employee.title, employee.email, employee.department,
            employee.location, employee.region, employee.country, employee.timeZone,
            employee.bio, employee.joiningDate, employee.linkedin, employee.github,
            employee.portfolio, ...(Array.isArray(employee.skills) ? employee.skills : [])
        ].filter(Boolean).join(' '));
    }
    async function loadPeople() {
        if (loadState === 'loading') return;
        loadState = 'loading';
        renderSkills();
        render();
        try {
            if (!window.EmployeeStore) throw new Error('Directory unavailable');
            const data = await window.EmployeeStore.list();
            if (!Array.isArray(data)) throw new Error('Invalid directory response');
            people = data.filter(employee => employee && employee.id != null);
            loadState = 'ready';
            loadedAt = Date.now();
        } catch {
            loadState = 'error';
        }
        // Always render the latest input, even if it changed during the request.
        renderSkills();
        render();
    }
    function feedback(text) {
        const message = document.createElement('p');
        message.className = 'spotlight-empty';
        message.textContent = text;
        results.append(message);
        status.textContent = text;
    }
    function render() {
        const query = normalize(input.value.trim());
        root.dataset.searching = String(Boolean(query));
        suggestions.hidden = Boolean(query);
        if (query) {
            skillPanel.hidden = true;
            browse.setAttribute('aria-expanded', 'false');
        }
        results.replaceChildren();
        results.hidden = !query;
        results.setAttribute('aria-busy', String(loadState === 'loading'));
        input.setAttribute('aria-expanded', String(Boolean(query)));
        setPlaceholder();
        schedulePrompt();
        if (!query) { status.textContent = ''; return; }
        if (loadState === 'idle') { loadPeople(); return; }
        if (loadState === 'loading') { feedback('Searching the People Directory…'); return; }
        if (loadState === 'error') {
            feedback('Could not load the directory. Please try again.');
            const retry = document.createElement('button');
            retry.type = 'button';
            retry.className = 'spotlight-retry';
            retry.textContent = 'Try again';
            retry.addEventListener('click', loadPeople);
            results.append(retry);
            return;
        }
        const terms = query.split(/\s+/);
        const matches = people.filter(employee => terms.every(term => searchable(employee).includes(term)));
        matches.forEach((employee, i) => {
            const entry = {
                label: employee.name || 'Teammate',
                description: [employee.title, employee.department, employee.location,
                    employee.country && !String(employee.location || '').includes(employee.country) ? employee.country : '']
                    .filter(Boolean).join(' · ') || 'View directory profile',
                href: `index.html?employee=${encodeURIComponent(employee.id)}#directory`,
                icon: 'person'
            };
            const link = makeLink(entry);
            const avatar = document.createElement('span');
            avatar.className = 'spotlight-avatar';
            avatar.setAttribute('aria-hidden', 'true');
            const initials = document.createElement('span');
            initials.textContent = entry.label.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
            avatar.append(initials);
            if (employee.image) {
                try {
                    const url = new URL(employee.image, document.baseURI);
                    if (['https:', 'http:'].includes(url.protocol)) {
                        const photo = document.createElement('img');
                        photo.alt = '';
                        photo.loading = 'lazy';
                        photo.decoding = 'async';
                        photo.addEventListener('error', () => photo.remove(), { once: true });
                        photo.src = url.href;
                        avatar.append(photo);
                    }
                } catch { /* Keep initials when a photo URL is invalid. */ }
            }
            link.firstElementChild.replaceWith(avatar);
            link.setAttribute('aria-label', `View profile for ${entry.label}`);
            link.style.setProperty('--result-delay', `${Math.min(i, 6) * 35}ms`);
            results.append(link);
        });
        if (!matches.length) {
            feedback('No people found. Try a name, skill, role, city, or country.');
            const reset = document.createElement('button');
            reset.type = 'button';
            reset.className = 'spotlight-reset';
            reset.textContent = 'Clear search';
            reset.addEventListener('click', () => {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.focus({ preventScroll: true });
            });
            results.append(reset);
        }
        else status.textContent = `${matches.length} matching ${matches.length === 1 ? 'person' : 'people'}. Choose a result to open their profile.`;
    }
    input.addEventListener('input', render);
    root.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            input.value = '';
            skillPanel.hidden = true;
            browse.setAttribute('aria-expanded', 'false');
            render();
            input.focus({ preventScroll: true });
            return;
        }
        const links = Array.from(results.querySelectorAll('a'));
        if (!links.length) return;
        const index = links.indexOf(document.activeElement);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            // Only intercept navigation inside the search and its results, not appearance controls.
            if (document.activeElement !== input && index < 0) return;
            event.preventDefault();
            const next = event.key === 'ArrowDown' ? index + 1 : index < 0 ? links.length - 1 : index - 1;
            if (next < 0) input.focus({ preventScroll: true });
            else links[next % links.length].focus();
        } else if (event.key === 'Enter' && document.activeElement === input) {
            event.preventDefault();
            links[0].click();
        }
    });
    input.addEventListener('focus', () => {
        if (input.value.trim() && loadState !== 'loading' && (loadState !== 'ready' || Date.now() - loadedAt > 30000)) loadPeople();
    });
    const voice = root.querySelector('#spotlight-voice');
    const voiceStatus = root.querySelector('#spotlight-voice-status');
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let voiceActive = false;
    let voiceRun = 0;
    function resetVoice() {
        voiceActive = false;
        voice.setAttribute('aria-pressed', 'false');
        voice.setAttribute('aria-label', 'Search by voice');
        voice.title = 'Search by voice';
    }
    function stopVoice() {
        const current = recognition;
        recognition = null;
        voiceRun++;
        resetVoice();
        if (current) { try { current.abort(); } catch {} }
    }
    voice.addEventListener('click', () => {
        if (voiceActive) {
            stopVoice();
            voiceStatus.textContent = 'Voice search stopped.';
            return;
        }
        if (!Recognition) {
            voiceStatus.textContent = 'Voice search is not supported in this browser. You can type your search instead.';
            input.focus({ preventScroll: true });
            return;
        }
        const run = ++voiceRun;
        let heard = false;
        try {
            recognition = new Recognition();
            recognition.lang = document.documentElement.lang || 'en-US';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onstart = () => {
                if (run !== voiceRun) return;
                voiceStatus.textContent = 'Listening… Say a name, skill, role, city, or country. Click again to stop.';
            };
            recognition.onresult = event => {
                if (run !== voiceRun) return;
                const transcript = event.results[0]?.[0]?.transcript?.trim();
                if (!transcript) return;
                heard = true;
                input.value = transcript.slice(0, input.maxLength);
                render();
                input.focus({ preventScroll: true });
                voiceStatus.textContent = `Searching for “${input.value}”.`;
                stopVoice();
            };
            recognition.onerror = event => {
                if (run !== voiceRun) return;
                heard = true;
                const messages = {
                    'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser, or type your search.',
                    'service-not-allowed': 'Voice search is unavailable in this browser. Please type your search.',
                    'audio-capture': 'No microphone is available. Connect a microphone or type your search.',
                    'no-speech': 'No speech was heard. Try again or type your search.',
                    network: 'Voice search could not connect. Try again or type your search.'
                };
                voiceStatus.textContent = messages[event.error] || 'Voice search stopped. Try again or type your search.';
                stopVoice();
            };
            recognition.onend = () => {
                if (run !== voiceRun) return;
                recognition = null;
                resetVoice();
                if (!heard) voiceStatus.textContent = 'No speech was heard. Try again or type your search.';
            };
            voiceActive = true;
            voice.setAttribute('aria-pressed', 'true');
            voice.setAttribute('aria-label', 'Stop voice search');
            voice.title = 'Stop voice search';
            voiceStatus.textContent = 'Starting voice search… Allow microphone access if asked.';
            recognition.start();
        } catch {
            stopVoice();
            voiceStatus.textContent = 'Voice search could not start. Please type your search or try again.';
        }
    });
    // Stop capture when leaving the page/hero or cancelling with Escape.
    window.addEventListener('pagehide', stopVoice);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopVoice(); });
    root.addEventListener('keydown', event => {
        if (event.key === 'Escape' && voiceActive) {
            stopVoice();
            voiceStatus.textContent = 'Voice search stopped.';
        }
    });
    root.addEventListener('click', event => { if (event.target.closest('a')) stopVoice(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting && voiceActive) {
            stopVoice();
            voiceStatus.textContent = 'Voice search stopped.';
        }
    }).observe(root);
    // One shared clock: hold 4.4s, fade out 0.2s, swap, fade in 0.2s.
    // Each prompt gets the same 4.8s cycle and one shine, in a fixed order.
    function stopPrompt() {
        if (promptTimer !== null) window.clearTimeout(promptTimer);
        promptTimer = null;
        placeholder.classList.remove('is-prompt-fading', 'is-prompt-shining');
    }
    function schedulePrompt() {
        stopPrompt();
        if (motion.matches || document.hidden || !promptVisible || input.value) return;
        placeholder.classList.add('is-prompt-shining');
        promptTimer = window.setTimeout(() => {
            placeholder.classList.remove('is-prompt-shining');
            placeholder.classList.add('is-prompt-fading');
            promptTimer = window.setTimeout(() => {
                currentPrompt = searchPrompts[(searchPrompts.indexOf(currentPrompt) + 1) % searchPrompts.length];
                // Swap while fully faded, so old and new words never flash together.
                setPlaceholder();
                placeholder.classList.remove('is-prompt-fading');
                promptTimer = window.setTimeout(schedulePrompt, 200);
            }, 200);
        }, 4400);
    }
    input.addEventListener('input', () => { if (voiceActive) stopVoice(); schedulePrompt(); });
    motion.addEventListener?.('change', schedulePrompt);
    document.addEventListener('visibilitychange', schedulePrompt);
    window.addEventListener('pagehide', stopPrompt);
    window.addEventListener('pageshow', schedulePrompt);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
        promptVisible = entries[0].isIntersecting;
        schedulePrompt();
    }).observe(root);
    // Fixed appearance requested for the Add Teammate page.
    root.dataset.size = 'compact';
    root.style.setProperty('--spotlight-width', '1024px');
    root.style.setProperty('--spotlight-opacity', '.88');
    root.dataset.glass = 'false';
    render();
    schedulePrompt();
})();
