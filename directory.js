const searchInput = document.querySelector('#search');
const departmentFilter = document.querySelector('#department-filter');
const sortFilter = document.querySelector('#sort-filter');
const clearButton = document.querySelector('#clear-button, #clearSearch');
const resultsCount = document.querySelector('#results-count');
const employeeList = document.querySelector('#employee-list');
const departmentGrid = document.querySelector('#department-grid');
const departmentMembers = document.querySelector('#department-members');

// Keep the existing logo image and directory link, with a small pointer tilt.
const peopleLogo = document.querySelector('.people-logo');
const logoMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (peopleLogo) {
    const resetLogo = () => {
        peopleLogo.style.removeProperty('--logo-x');
        peopleLogo.style.removeProperty('--logo-y');
    };
    peopleLogo.addEventListener('pointermove', event => {
        if (logoMotion.matches || event.pointerType !== 'mouse') return;
        const bounds = peopleLogo.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        peopleLogo.style.setProperty('--logo-x', `${-y * 10}deg`);
        peopleLogo.style.setProperty('--logo-y', `${x * 12}deg`);
    });
    peopleLogo.addEventListener('pointerleave', resetLogo);
    peopleLogo.addEventListener('pointercancel', resetLogo);
    peopleLogo.addEventListener('blur', resetLogo);
    logoMotion.addEventListener('change', resetLogo);
}

let activeDepartment = null;

let employees = [];
let directoryView = 'grid';
try { directoryView = localStorage.getItem('directoryView') === 'table' ? 'table' : 'grid'; } catch {}


function createStatisticsSection() {
    if (document.querySelector('.statistics-section')) {
        return document.querySelector('.statistics-section');
    }

    const section = document.createElement('section');

    section.className = 'statistics-section';
    section.setAttribute('aria-label', 'Employee statistics');

    section.innerHTML = `
        <article class="stat-card stat-blue">
            <div class="stat-icon">👥</div>
            <div>
                <h2 id="total-employees">0</h2>
                <p>Total Employees</p>
            </div>
        </article>

        <article class="stat-card stat-purple">
            <div class="stat-icon">▥</div>
            <div>
                <h2 id="total-departments">0</h2>
                <p>Departments</p>
            </div>
        </article>

        <article class="stat-card stat-orange">
            <div class="stat-icon">▥</div>
            <div>
                <h2 id="total-roles">0</h2>
                <p>Roles</p>
            </div>
        </article>

        <article class="stat-card stat-teal">
            <div class="stat-icon">⊕</div>
            <div>
                <h2 id="new-employees">N/A</h2>
                <p>New This Month</p>
            </div>
        </article>
    `;

    const heroSection = document.querySelector('.hero-section');
    const directorySection = document.querySelector('.directory-section');

    if (heroSection) {
        heroSection.insertAdjacentElement('afterend', section);
    } else if (directorySection) {
        directorySection.insertAdjacentElement('afterbegin', section);
    }

    return section;
}

// Count up when real statistics enter view; keep the final value available to assistive technology.
const statisticMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const statisticCounters = new Map();
const statisticObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { statisticObserver.unobserve(entry.target); runStatisticCounter(entry.target); } });
}, { threshold: 0.25 }) : null;
function runStatisticCounter(element) {
    const state = statisticCounters.get(element);
    if (!state || state.started) return;
    state.started = true;
    if (statisticMotion.matches || typeof element.animate !== 'function' || state.value === 0) {
        element.textContent = String(state.value); return;
    }
    element.replaceChildren();
    state.animations = [];
    const digits = String(state.value).split('');
    digits.forEach((digit, index) => {
        const wheel = document.createElement('span'); wheel.className = 'stat-digit'; wheel.setAttribute('aria-hidden', 'true');
        const strip = document.createElement('span'); strip.className = 'stat-digit-strip';
        const steps = 20 + Number(digit);
        for (let step = 0; step <= steps; step++) {
            const cell = document.createElement('span'); cell.textContent = String(step % 10); strip.append(cell);
        }
        wheel.append(strip); element.append(wheel);
        const animation = strip.animate([
            { transform: 'translateY(0)' },
            { transform: 'translateY(-' + (steps * 1.2) + 'em)' }
        ], { duration: 1700 + index * 120, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
        state.animations.push(animation);
    });
    Promise.all(state.animations.map(animation => animation.finished)).then(() => {
        if (statisticCounters.get(element) !== state) return;
        element.textContent = String(state.value);
        state.animations.forEach(animation => animation.cancel()); state.animations = [];
    }).catch(() => { /* A changed value or motion preference cancels the old wheels. */ });
}
function setStatistic(id, value, description) {
    const element = document.getElementById(id);
    const previous = statisticCounters.get(element);
    if (previous && previous.value === value) return;
    previous?.animations?.forEach(animation => animation.cancel());
    statisticObserver?.unobserve(element);
    element.textContent = String(value);
    element.setAttribute('aria-label', description || String(value));
    element.setAttribute('aria-live', 'off');
    const state = { value, started: false, frame: null };
    statisticCounters.set(element, state);
    if (typeof value !== 'number') { state.started = true; return; }
    if (statisticMotion.matches || !statisticObserver) runStatisticCounter(element);
    else statisticObserver.observe(element);
}
statisticMotion.addEventListener?.('change', event => {
    if (!event.matches) return;
    statisticCounters.forEach((state, element) => {
        state.animations?.forEach(animation => animation.cancel());
        state.frame = null; state.started = true; element.textContent = String(state.value);
        statisticObserver?.unobserve(element);
    });
});

function updateStatistics() {
    createStatisticsSection();
    const countDistinct = key => new Set(employees.map(e => String(e[key] || '').trim()).filter(Boolean)).size;
    setStatistic('total-employees', employees.length, employees.length + ' total employees');
    setStatistic('total-departments', countDistinct('department'), countDistinct('department') + ' departments');
    setStatistic('total-roles', countDistinct('title'), countDistinct('title') + ' roles');
    const now = new Date();
    const knownDates = employees.map(employee => {
        const value = employee.joiningDate || employee.joinedDate || employee.startDate;
        if (!value) return null;
        // A date-only value is a calendar date, not UTC midnight.
        const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }).filter(Boolean);
    const count = knownDates.filter(date => date <= now && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()).length;
    const stat = document.querySelector('#new-employees');
    setStatistic('new-employees', knownDates.length ? count : '—');
    stat.title = knownDates.length ? 'Based on available joining dates' : 'Joining dates have not been provided';
    stat.setAttribute('aria-label', knownDates.length ? count + ' new employees this month, based on available joining dates' : 'Joining dates unavailable');
}

const iconShapes = {
    code: '<rect x="2" y="3" width="20" height="18" rx="4"/><path d="M9.5 9 6.5 12l3 3M14.5 9l3 3-3 3M12.8 8l-1.6 8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    cube: '<path d="M12 2 3 6.5v9L12 21l9-4.5v-9z"/><path d="M3 6.5 12 11l9-4.5M12 11v10" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.9 2-1.8 0-.9-.6-1.4-.6-2.2 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.4" fill="#fff"/><circle cx="10.5" cy="7.5" r="1.4" fill="#fff"/><circle cx="15" cy="7.5" r="1.4" fill="#fff"/>',
    gear: '<circle cx="12" cy="12" r="5.4" fill="none" stroke="currentColor" stroke-width="3"/><rect x="10.6" y="2" width="2.8" height="5" rx="1"/><rect x="10.6" y="2" width="2.8" height="5" rx="1" transform="rotate(45 12 12)"/><rect x="10.6" y="2" width="2.8" height="5" rx="1" transform="rotate(90 12 12)"/><rect x="10.6" y="2" width="2.8" height="5" rx="1" transform="rotate(135 12 12)"/><rect x="10.6" y="2" width="2.8" height="5" rx="1" transform="rotate(180 12 12)"/><rect x="10.6" y="2" width="2.8" height="5" rx="1" transform="rotate(225 12 12)"/><rect x="10.6" y="2" width="2.8" height="5" rx="1" transform="rotate(270 12 12)"/><rect x="10.6" y="2" width="2.8" height="5" rx="1" transform="rotate(315 12 12)"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6z"/><circle cx="17" cy="9" r="2.8"/><path d="M16.2 13.3c3.2-.2 5.3 1.8 5.3 4.7v1.5h-4.4c0-2.2-.3-4-.9-6.2z"/>',
    bars: '<rect x="3" y="12" width="4.5" height="9" rx="1.2"/><rect x="9.8" y="3" width="4.5" height="18" rx="1.2"/><rect x="16.5" y="8" width="4.5" height="13" rx="1.2"/>',
    megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1z"/><path d="M15 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    briefcase: '<rect x="2.5" y="7" width="19" height="13" rx="3"/><path d="M8.5 7V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7" fill="none" stroke="currentColor" stroke-width="2"/>'
};

const departmentStyles = [
    { match: /develop|software|\bweb\b|front|back/, icon: 'code', tone: 'blue' },
    { match: /product/, icon: 'cube', tone: 'amber' },
    { match: /design|\bux\b|\bui\b|creative/, icon: 'palette', tone: 'pink' },
    { match: /engineer/, icon: 'gear', tone: 'sky' },
    { match: /\bhr\b|human|people|recruit/, icon: 'people', tone: 'orange' },
    { match: /analytic|data/, icon: 'bars', tone: 'violet' },
    { match: /market|sales|growth/, icon: 'briefcase', tone: 'teal' },
    { match: /operation/, icon: 'gear', tone: 'slate' },
    { match: /quality|\bqa\b|test/, icon: 'check', tone: 'green' }
];

function getDepartmentStyle(department) {
    const name = String(department || '').toLowerCase();
    const found = departmentStyles.find(item => item.match.test(name));

    return found || { icon: 'briefcase', tone: 'blue' };
}

function svgMarkup(shapes, extra = '') {
    return `<svg viewBox="0 0 24 24" fill="currentColor" focusable="false" aria-hidden="true" ${extra}>${shapes}</svg>`;
}

function getInitials(name) {
    return String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function makeDepartmentCard(department, members) {
    const key = department.toLowerCase();
    const count = members.length;

    const card = document.createElement('button');
    card.className = 'department-card';
    card.type = 'button';
    card.dataset.department = key;
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute(
        'aria-label',
        `${department}, ${count} ${count === 1 ? 'employee' : 'employees'}`
    );

    const style = getDepartmentStyle(department);
    card.dataset.tone = style.tone;

    const icon = document.createElement('span');
    icon.className = 'department-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = svgMarkup(iconShapes[style.icon]);

    const name = document.createElement('span');
    name.className = 'department-name';
    name.textContent = department;

    const total = document.createElement('span');
    total.className = 'department-count';
    total.textContent =
        `${count} ${count === 1 ? 'Employee' : 'Employees'}`;

    const faces = document.createElement('span');
    faces.className = 'department-faces';
    faces.setAttribute('aria-hidden', 'true');

    members.slice(0, 3).forEach(member => {
        const face = document.createElement('span');
        face.className = 'department-face';

        if (member.image) {
            const photo = document.createElement('img');
            photo.src = member.image;
            photo.alt = '';
            photo.addEventListener('error', () => { face.textContent = getInitials(member.name); }, { once: true });
            face.appendChild(photo);
        } else {
            face.textContent = getInitials(member.name);
        }

        faces.appendChild(face);
    });

    if (count > 3) {
        const more = document.createElement('span');
        more.className = 'department-face department-face-more';
        more.textContent = `+${count - 3}`;
        faces.appendChild(more);
    }

    const arrow = document.createElement('span');
    arrow.className = 'department-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = svgMarkup(
        '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"'
    );

    const footer = document.createElement('span');
    footer.className = 'department-footer';
    footer.append(faces, arrow);

    card.append(icon, name, total, footer);

    card.addEventListener('click', () => {
        selectDepartment(key);
    });

    return card;
}

function renderDepartments() {
    if (!departmentGrid) {
        return;
    }

    const groups = new Map();

    employees.forEach(employee => {
        const department = String(employee.department || '').trim();

        if (!department) {
            return;
        }

        const key = department.toLowerCase();

        if (!groups.has(key)) {
            groups.set(key, { name: department, members: [] });
        }

        groups.get(key).members.push(employee);
    });

    const cards = [...groups.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(group => makeDepartmentCard(group.name, group.members));

    departmentGrid.replaceChildren(...cards);

    if (activeDepartment && !groups.has(activeDepartment)) {
        activeDepartment = null;
    }

    if (!cards.length) {
        const message = document.createElement('p');
        message.className = 'empty-state';
        message.textContent = 'No departments to show yet.';
        departmentGrid.appendChild(message);
    }

    syncDepartmentCards();
    renderDepartmentMembers();
}

function syncDepartmentCards() {
    if (!departmentGrid) {
        return;
    }

    departmentGrid
        .querySelectorAll('.department-card')
        .forEach(card => {
            const isActive =
                card.dataset.department === activeDepartment;

            card.classList.toggle('active', isActive);
            card.setAttribute('aria-pressed', String(isActive));
        });
}

function renderDepartmentMembers() {
    if (!departmentMembers) {
        return;
    }

    departmentMembers.replaceChildren();

    const members = activeDepartment
        ? employees
            .filter(employee =>
                String(employee.department || '')
                    .trim()
                    .toLowerCase() === activeDepartment
            )
            .sort((a, b) =>
                String(a.name || '').localeCompare(
                    String(b.name || ''),
                    undefined,
                    { sensitivity: 'base' }
                )
            )
        : [];

    if (!members.length) {
        activeDepartment = null;
        departmentMembers.hidden = true;
        syncDepartmentCards();
        return;
    }

    const header = document.createElement('div');
    header.className = 'department-members-header';

    const title = document.createElement('h3');
    title.textContent =
        `${String(members[0].department).trim()} team ` +
        `(${members.length})`;

    const closeButton = document.createElement('button');
    closeButton.className = 'department-members-close';
    closeButton.type = 'button';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
        selectDepartment(activeDepartment);
    });

    header.append(title, closeButton);

    const list = document.createElement('ul');
    list.className = 'department-member-list';
    list.append(...members.map(makeMemberItem));

    departmentMembers.append(header, list);
    departmentMembers.hidden = false;
}

function makeMemberItem(employee, index) {
    const item = document.createElement('li');
    item.className = 'member-item';

    const detailsId = `member-details-${index}`;

    const row = document.createElement('button');
    row.className = 'member-row';
    row.type = 'button';
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-controls', detailsId);

    const avatar = document.createElement('span');
    avatar.className = 'member-avatar';
    avatar.setAttribute('aria-hidden', 'true');

    if (employee.image) {
        const photo = document.createElement('img');
        photo.src = employee.image;
        photo.alt = '';
        photo.addEventListener('error', () => { avatar.textContent = getInitials(employee.name); }, { once: true });
        avatar.appendChild(photo);
    } else {
        avatar.textContent = getInitials(employee.name);
    }

    const text = document.createElement('span');
    text.className = 'member-text';

    const name = document.createElement('span');
    name.className = 'member-name';
    name.textContent = employee.name;

    const title = document.createElement('span');
    title.className = 'member-title';
    title.textContent = employee.title || '';

    text.append(name, title);

    const chevron = document.createElement('span');
    chevron.className = 'member-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = svgMarkup(
        '<path d="m6 9 6 6 6-6"/>',
        'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"'
    );

    row.append(avatar, text, chevron);

    const details = document.createElement('div');
    details.className = 'member-details';
    details.id = detailsId;
    details.hidden = true;

    row.addEventListener('click', () => {
        toggleMemberDetails(item, employee);
    });

    item.append(row, details);

    return item;
}

function buildMemberDetails(employee) {
    const email = document.createElement('a');
    email.className = 'member-email';
    email.href = `mailto:${employee.email}`;
    email.textContent = employee.email;

    const actions = document.createElement('div');
    actions.className = 'member-actions';

    const profileButton = document.createElement('button');
    profileButton.className = 'profile-button';
    profileButton.type = 'button';
    profileButton.textContent = 'View Full Profile';
    profileButton.addEventListener('click', () => {
        openProfile(employee);
    });

    actions.append(makeCopyButton(employee), profileButton);

    const parts = [email, actions];
    const social = makeSocialLinks(employee);

    if (social.children.length) {
        parts.push(social);
    }

    return parts;
}

function toggleMemberDetails(item, employee) {
    const details = item.querySelector('.member-details');
    const willOpen = details.hidden;

    departmentMembers
        .querySelectorAll('.member-item')
        .forEach(other => {
            other.classList.remove('open');
            other
                .querySelector('.member-row')
                .setAttribute('aria-expanded', 'false');
            other.querySelector('.member-details').hidden = true;
        });

    if (!willOpen) {
        return;
    }

    if (!details.dataset.built) {
        details.append(...buildMemberDetails(employee));
        details.dataset.built = 'true';
    }

    details.hidden = false;
    item.classList.add('open');
    item
        .querySelector('.member-row')
        .setAttribute('aria-expanded', 'true');
}

function selectDepartment(key) {
    activeDepartment = activeDepartment === key ? null : key;

    syncDepartmentCards();
    renderDepartmentMembers();

    if (!activeDepartment || !departmentMembers) {
        return;
    }

    const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;

    if (typeof departmentMembers.scrollIntoView === 'function') {
        departmentMembers.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'nearest'
        });
    }
}

function setupBackToTopButton() {
    if (document.querySelector('.back-to-top')) {
        return;
    }

    const button = document.createElement('button');

    button.className = 'back-to-top';
    button.type = 'button';
    button.textContent = '↑';
    button.setAttribute('aria-label', 'Back to top');

    document.body.appendChild(button);

    function updateButtonVisibility() {
        button.classList.toggle(
            'show',
            window.scrollY > 300
        );
    }

    window.addEventListener(
        'scroll',
        updateButtonVisibility,
        { passive: true }
    );

    button.addEventListener('click', () => {
        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        window.scrollTo({
            top: 0,
            behavior: reducedMotion ? 'auto' : 'smooth'
        });
    });

    updateButtonVisibility();
}

setupBackToTopButton();

const socialIcons = {
    linkedin: 'img/logo/linkedInLogo.png',
    github: 'img/logo/gitHubLogo.png',
    portfolio: 'img/logo/websiteLogo.png'
};

function isSafeExternalUrl(link) {
    if (!link || typeof link !== 'string') {
        return false;
    }

    try {
        const url = new URL(link);

        return (
            url.protocol === 'https:' ||
            url.protocol === 'http:'
        );
    } catch {
        return false;
    }
}

function makeCopyButton(employee) {
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-email';
    copyButton.type = 'button';
    copyButton.textContent = 'Copy Email';

    copyButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(employee.email);
            copyButton.textContent = 'Copied ✓';

            setTimeout(() => {
                copyButton.textContent = 'Copy Email';
            }, 1500);
        } catch {
            copyButton.textContent = 'Copy failed';
        }
    });

    return copyButton;
}

function makeSocialLinks(employee) {
    const socialLinks = document.createElement('div');
    socialLinks.className = 'social-links';

    const socialProfiles = [
        {
            name: 'LinkedIn',
            url: employee.linkedin,
            icon: socialIcons.linkedin
        },
        {
            name: 'GitHub',
            url: employee.github,
            icon: socialIcons.github
        },
        {
            name: 'Portfolio',
            url: employee.portfolio,
            icon: socialIcons.portfolio
        }
    ];

    socialProfiles.forEach(profile => {
        if (!isSafeExternalUrl(profile.url)) {
            return;
        }

        const link = document.createElement('a');

        link.href = profile.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', profile.name);

        const icon = document.createElement('img');

        icon.src = profile.icon;
        icon.alt = profile.name;

        icon.addEventListener('error', () => {
            link.classList.add('social-fallback');
            link.textContent = profile.name;
        });

        link.appendChild(icon);
        socialLinks.appendChild(link);
    });

    return socialLinks;
}

function makeSkillBadges(skills) {
    const container = document.createElement('div');
    container.className = 'skill-badges';
    const colors = { javascript: 'blue', 'web development': 'red', leadership: 'purple', html: 'yellow', css: 'green', 'team collaboration': 'pink' };
    for (const skill of Array.isArray(skills) ? skills : []) {
        if (typeof skill !== 'string') continue;
        const badge = document.createElement('span');
        badge.className = 'skill-badge skill-' + (colors[skill.toLowerCase()] || 'default');
        badge.textContent = skill;
        container.append(badge);
    }
    if (!container.children.length) container.textContent = 'Skills not listed';
    return container;
}

// One avatar helper is shared by employee cards, table rows, and profiles.
function makeAvatar(employee, extraClass = '') {
    const avatar = document.createElement('div');
    avatar.className = 'employee-avatar ' + extraClass;
    avatar.setAttribute('aria-hidden', 'true');
    const initials = getInitials(employee.name) || '?';
    avatar.textContent = initials;
    if (employee.image) {
        try {
            const url = new URL(employee.image, document.baseURI);
            if (!['http:', 'https:'].includes(url.protocol)) return avatar;
            const photo = document.createElement('img');
            photo.alt = '';
            photo.loading = 'lazy';
            photo.addEventListener('error', () => { avatar.textContent = initials; }, { once: true });
            photo.src = url.href;
            avatar.replaceChildren(photo);
        } catch { /* Initials remain visible if the image address is invalid. */ }
    }
    return avatar;
}

function makeProfileButton(employee) {
    const button = document.createElement('button');
    button.className = 'profile-button';
    button.type = 'button';
    button.textContent = 'View Profile';
    button.setAttribute('aria-label', 'View profile for ' + employee.name);
    button.addEventListener('click', () => openProfile(employee));
    return button;
}

function makeEmployeeEmail(employee) {
    const email = document.createElement('a');
    email.className = 'employee-email';
    email.href = 'mailto:' + String(employee.email || '');
    email.textContent = employee.email || 'Email not listed';
    return email;
}

function makeDepartmentBadge(employee) {
    const badge = document.createElement('span');
    badge.className = 'department-badge';
    badge.textContent = employee.department || 'Department not listed';
    return badge;
}

function cardIcon(kind) {
    const icon = document.createElement('span');
    icon.className = 'card-icon';
    icon.setAttribute('aria-hidden', 'true');
    const paths = {
        bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        location: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
        people: '<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 4 5M1 21h22"/>',
        email: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>',
        message: '<path d="M3 4h18v13H8l-5 4z"/>',
        copy: '<path d="M8 8H3v13h13v-5"/><rect x="8" y="3" width="13" height="13" rx="1"/>',
        arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>'
    };
    // Only constant icon paths are inserted as markup; employee fields use textContent.
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + paths[kind] + '</svg>';
    return icon;
}

function makeCard(employee) {
    const card = document.createElement('article');
    card.className = 'employee-card';
    const main = document.createElement('div');
    main.className = 'card-main';
    const top = document.createElement('div');
    top.className = 'card-top';
    top.append(makeAvatar(employee));
    const topActions = document.createElement('div');
    topActions.className = 'card-top-actions';
    const bookmark = document.createElement('button');
    bookmark.type = 'button';
    bookmark.className = 'card-bookmark';
    const key = 'directoryBookmark:' + String(employee.id || employee.email || employee.name);
    let saved = false;
    try { saved = localStorage.getItem(key) === 'true'; } catch {}
    function updateBookmark() {
        bookmark.setAttribute('aria-pressed', String(saved));
        bookmark.setAttribute('aria-label', (saved ? 'Unsave ' : 'Save ') + employee.name);
        bookmark.title = (saved ? 'Unsave ' : 'Save ') + employee.name;
    }
    bookmark.append(cardIcon('bookmark'));
    updateBookmark();
    bookmark.addEventListener('click', () => {
        saved = !saved;
        try { localStorage.setItem(key, String(saved)); } catch {}
        updateBookmark();
    });
    topActions.append(makeDepartmentBadge(employee), bookmark);
    top.append(topActions);
    const identity = document.createElement('div');
    identity.className = 'card-identity';
    const nameRow = document.createElement('div');
    nameRow.className = 'card-name-row';
    const name = document.createElement('h3');
    const nameLink = document.createElement('button');
    nameLink.type = 'button';
    nameLink.className = 'card-name-link';
    nameLink.textContent = employee.name;
    nameLink.addEventListener('click', () => openProfile(employee));
    name.append(nameLink);
    nameRow.append(name);
    if (/manager|\bmgr\b/i.test(employee.title || '')) {
        const badge = document.createElement('span');
        badge.className = 'card-role-badge';
        badge.textContent = 'MGR';
        nameRow.append(badge);
    }
    const title = document.createElement('p');
    title.className = 'employee-title';
    title.textContent = employee.title;
    identity.append(nameRow, title);
    const details = document.createElement('div');
    details.className = 'card-details';
    function detail(kind, value) {
        const row = document.createElement('p');
        const text = document.createElement('span');
        text.textContent = value;
        row.append(cardIcon(kind), text);
        return row;
    }
    details.append(detail('location', employee.location || 'Location not listed'));
    if (window.CardLocalTime) {
        const clockRow = detail('clock', '');
        clockRow.className = 'card-time-row';
        clockRow.lastElementChild.replaceWith(window.CardLocalTime.create(employee));
        details.append(clockRow);
    }
    const reports = employee.directReports;
    details.append(detail('people', Number.isInteger(reports) && reports >= 0
        ? 'Manages ' + reports + ' direct reports'
        : employee.department || 'Department not listed'));
    const skills = Array.isArray(employee.skills) ? employee.skills.filter(skill => typeof skill === 'string' && skill.trim()).slice(0, 3) : [];
    main.append(top, identity, details, makeSkillBadges(skills));
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const email = document.createElement('a');
    email.className = 'card-email-icon';
    email.href = 'mailto:' + String(employee.email || '');
    email.setAttribute('aria-label', 'Email ' + employee.name);
    email.title = 'Email ' + employee.name;
    email.append(cardIcon('email'));
    const contact = document.createElement('button');
    contact.type = 'button';
    contact.className = 'card-contact-icon';
    contact.setAttribute('aria-label', 'View contact details for ' + employee.name);
    contact.title = 'View contact details';
    contact.append(cardIcon('message'));
    contact.addEventListener('click', () => {
        openProfile(employee);
        document.querySelector('#profile-tab-1')?.click();
    });
    actions.append(email, contact);
    const profile = makeProfileButton(employee);
    profile.replaceChildren(document.createTextNode('Profile '), cardIcon('arrow'));
    footer.append(actions, profile);
    card.append(main, footer);
    return card;
}

function makeEmployeeRow(employee) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const identity = document.createElement('div');
    identity.className = 'table-person';
    const text = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = employee.name;
    const title = document.createElement('p');
    title.textContent = employee.title;
    text.append(name, title);
    identity.append(makeAvatar(employee), text);
    nameCell.append(identity);
    const departmentCell = document.createElement('td');
    departmentCell.append(makeDepartmentBadge(employee));
    const emailCell = document.createElement('td');
    emailCell.append(makeEmployeeEmail(employee));
    const skillsCell = document.createElement('td');
    skillsCell.append(makeSkillBadges(employee.skills));
    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'table-actions';
    actions.append(makeCopyButton(employee), makeProfileButton(employee));
    actionsCell.append(actions);
    row.append(nameCell, departmentCell, emailCell, skillsCell, actionsCell);
    return row;
}

function setDirectoryView(view) {
    directoryView = view === 'table' ? 'table' : 'grid';
    employeeList.hidden = directoryView !== 'grid';
    document.querySelector('#employee-table-view').hidden = directoryView !== 'table';
    document.querySelector('#viewGridBtn').setAttribute('aria-pressed', String(directoryView === 'grid'));
    document.querySelector('#viewTableBtn').setAttribute('aria-pressed', String(directoryView === 'table'));
    try { localStorage.setItem('directoryView', directoryView); } catch {}
}

function renderDepartmentPills() {
    const container = document.querySelector('#department-pills');
    const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
    const options = [{ name: 'All', value: 'all', count: employees.length }, ...departments.map(name => ({
        name, value: name.toLowerCase(), count: employees.filter(e => String(e.department || '').toLowerCase() === name.toLowerCase()).length
    }))];
    container.replaceChildren(...options.map(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = option.name + ' (' + option.count + ')';
        button.setAttribute('aria-pressed', String(departmentFilter.value === option.value));
        button.addEventListener('click', () => { departmentFilter.value = option.value; renderEmployees(); });
        return button;
    }));
}

function openProfile(employee) {
    document.querySelector('.profile-modal .modal-close')?.click();
    const previousFocus = document.activeElement;
    const modal = document.createElement('div');
    modal.className = 'profile-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'employee-profile-name');

    const content = document.createElement('div');
    content.className = 'profile-modal-content';

    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Close profile');

    const image = makeAvatar(employee, 'profile-avatar');

    const name = document.createElement('h2');
    name.id = 'employee-profile-name';
    name.textContent = employee.name;

    const title = document.createElement('p');
    title.textContent = employee.title;

    const department = document.createElement('span');
    department.className = 'department-badge';
    department.textContent = employee.department;

    const bio = document.createElement('p');
    bio.className = 'profile-bio';
    bio.textContent =
        employee.bio ||
        `${employee.name} is a ${employee.title} on the ${employee.department} team.`;

    const skillsHeading = document.createElement('h3');
    skillsHeading.className = 'skills-heading';
    skillsHeading.textContent = 'Skills';

    const skills = makeSkillBadges(employee.skills);
    skills.classList.add('profile-skills');

    const email = document.createElement('p');

    const emailLink = document.createElement('a');
    emailLink.href = `mailto:${employee.email}`;
    emailLink.textContent = employee.email;

    email.appendChild(emailLink);

    const socialLinks = document.createElement('div');
    socialLinks.className = 'social-links';

    const socialProfiles = [
        {
            name: 'LinkedIn',
            url: employee.linkedin
        },
        {
            name: 'GitHub',
            url: employee.github
        },
        {
            name: 'Portfolio',
            url: employee.portfolio
        }
    ];

    socialProfiles.forEach(profile => {
        if (!isSafeExternalUrl(profile.url)) {
            return;
        }

        const link = document.createElement('a');

        link.href = profile.url;
        link.textContent = profile.name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        socialLinks.appendChild(link);
    });

    const header = document.createElement('div');
    header.className = 'profile-header';
    const details = document.createElement('div');
    details.append(name, title, department);
    header.append(image);
    header.append(details);
    const tabs = document.createElement('div');
    tabs.className = 'profile-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Profile details');
    const panels = document.createElement('div');
    const buttons = [];
    const sections = [];
    function activate(index, focus = false) {
        buttons.forEach((button, i) => {
            button.classList.toggle('active', i === index);
            button.setAttribute('aria-selected', String(i === index));
            button.tabIndex = i === index ? 0 : -1;
            sections[i].hidden = i !== index;
        });
        if (focus) buttons[index].focus();
    }
    ['Overview', 'Contact', 'Skills', 'Projects'].forEach((label, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'profile-tab';
        button.id = 'profile-tab-' + index;
        button.textContent = label;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', 'profile-panel-' + index);
        const panel = document.createElement('section');
        panel.className = 'profile-panel';
        panel.id = 'profile-panel-' + index;
        panel.tabIndex = 0;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', button.id);
        button.addEventListener('click', () => activate(index));
        button.addEventListener('keydown', event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % 4;
            if (event.key === 'ArrowLeft') next = (index + 3) % 4;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = 3;
            if (next !== undefined) { event.preventDefault(); activate(next, true); }
        });
        buttons.push(button); sections.push(panel); tabs.append(button); panels.append(panel);
    });
    sections[0].append(bio);
    sections[1].append(email, socialLinks);
    sections[2].append(skillsHeading, skills);
    const projectList = document.createElement('ul');
    const projects = Array.isArray(employee.projects) ? employee.projects.filter(p => typeof p === 'string' && p.trim() && p.trim().toLowerCase() !== 'tbd') : [];
    for (const project of projects) { const item = document.createElement('li'); item.textContent = project; projectList.append(item); }
    if (!projects.length) { const item = document.createElement('li'); item.textContent = 'No projects listed.'; projectList.append(item); }
    sections[3].append(projectList);
    activate(0);
    content.append(closeButton, header, tabs, panels);

    modal.appendChild(content);
    document.body.appendChild(modal);

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function closeProfile() {
        modal.remove();
        document.body.style.overflow = oldOverflow;
        document.removeEventListener('keydown', closeWithEscape);
        if (previousFocus?.isConnected) previousFocus.focus();
    }
    closeButton.addEventListener('click', closeProfile);

    modal.addEventListener('click', event => {
        if (event.target === modal) {
            closeProfile();
        }
    });

    function closeWithEscape(event) {
        if (event.key === 'Escape') {
            closeProfile();
        }
        if (event.key === 'Tab') {
            const focusable = [...content.querySelectorAll('button,a[href],[tabindex="0"]')].filter(el => !el.closest('[hidden]') && !el.disabled && el.tabIndex >= 0);
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    }

    document.addEventListener(
        'keydown',
        closeWithEscape
    );
    closeButton.focus();
}

function renderEmployees() {
    const query =
        searchInput.value.trim().toLowerCase();

    const selectedDepartment =
        departmentFilter.value;

    const selectedSort =
        sortFilter.value;

    const matchingEmployees = employees.filter(employee => {
        const matchesSearch = [
            employee.name,
            employee.title,
            employee.department,
            employee.email,
            ...(Array.isArray(employee.skills) ? employee.skills : [])
        ].some(value =>
            String(value || '')
                .toLowerCase()
                .includes(query)
        );

        const matchesDepartment =
            selectedDepartment === 'all' ||
            String(employee.department || '')
                .toLowerCase() === selectedDepartment;

        return matchesSearch && matchesDepartment;
    });

    matchingEmployees.sort((employeeA, employeeB) => {
        const nameA =
            String(employeeA.name || '').trim();

        const nameB =
            String(employeeB.name || '').trim();

        const comparison = nameA.localeCompare(
            nameB,
            undefined,
            { sensitivity: 'base' }
        );

        return selectedSort === 'za'
            ? -comparison
            : comparison;
    });

    resultsCount.textContent =
        `Showing ${matchingEmployees.length} of ${employees.length} ${
            employees.length === 1
                ? 'employee'
                : 'employees'
        }`;

    employeeList.replaceChildren();
    const tableBody = document.querySelector('#employee-table-body');
    tableBody.replaceChildren();
    renderDepartmentPills();
    setDirectoryView(directoryView);

    if (matchingEmployees.length === 0) {
        const message = document.createElement('p');

        message.className = 'empty-state';
        message.textContent =
            'No employees found. Try another search.';

        employeeList.appendChild(message);
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.className = 'empty-state';
        cell.textContent = message.textContent;
        row.append(cell); tableBody.append(row);
        return;
    }

    employeeList.append(...matchingEmployees.map(makeCard));
    tableBody.append(...matchingEmployees.map(makeEmployeeRow));
}

searchInput.addEventListener(
    'input',
    renderEmployees
);

departmentFilter.addEventListener(
    'change',
    renderEmployees
);

sortFilter.addEventListener(
    'change',
    renderEmployees
);

if (clearButton) {
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        departmentFilter.value = 'all';
        sortFilter.value = 'az';
        renderEmployees();
    });
}

let directoryRequest = 0;
async function loadEmployees() {
    const request = ++directoryRequest;
    const status = document.querySelector('#directory-status');
    status.textContent = 'Loading employees…';
    status.hidden = false;
    employeeList.setAttribute('aria-busy', 'true');
    document.querySelector('#employee-table-view').setAttribute('aria-busy', 'true');
    try {
        if (!window.EmployeeStore) throw new Error('Connection unavailable');
        const data = await window.EmployeeStore.list();
        if (request !== directoryRequest) return;
        if (!Array.isArray(data)) throw new Error('Invalid directory response');
        employees = data;
        updateStatistics();
        renderDepartments();
        const selected = departmentFilter.value;
        departmentFilter.replaceChildren();
        const all = document.createElement('option');
        all.value = 'all'; all.textContent = 'All Departments';
        departmentFilter.append(all);
        const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
        for (const department of departments) {
            const option = document.createElement('option');
            option.value = department.toLowerCase(); option.textContent = department;
            departmentFilter.append(option);
        }
        departmentFilter.value = [...departmentFilter.options].some(o => o.value === selected) ? selected : 'all';
        renderEmployees();
        status.hidden = true;
    } catch {
        if (request !== directoryRequest) return;
        status.textContent = employees.length
            ? 'Could not refresh. Showing previously loaded employees. Please try again.'
            : 'The directory is temporarily unavailable. Please reload the page to try again.';
        status.hidden = false;
        if (!employees.length) {
            resultsCount.textContent = '';
            employeeList.replaceChildren();
            document.querySelector('#employee-table-body').replaceChildren();
        }
    } finally {
        if (request === directoryRequest) {
            employeeList.setAttribute('aria-busy', 'false');
            document.querySelector('#employee-table-view').setAttribute('aria-busy', 'false');
        }
    }
}
loadEmployees();

const menuButton =
    document.querySelector('.menu-toggle');

const navigation =
    document.querySelector('.nav-links');

if (menuButton && navigation) {
    function closeMenu() {
        navigation.classList.remove('open');

        menuButton.setAttribute(
            'aria-expanded',
            'false'
        );

        menuButton.setAttribute(
            'aria-label',
            'Open navigation menu'
        );

        menuButton.textContent = '☰';
    }

    menuButton.addEventListener('click', () => {
        const isOpen =
            navigation.classList.toggle('open');

        menuButton.setAttribute(
            'aria-expanded',
            String(isOpen)
        );

        menuButton.setAttribute(
            'aria-label',
            isOpen
                ? 'Close navigation menu'
                : 'Open navigation menu'
        );

        menuButton.textContent =
            isOpen ? '×' : '☰';
    });

    navigation.querySelectorAll('a')
        .forEach(link => {
            link.addEventListener(
                'click',
                closeMenu
            );
        });

    navigation.addEventListener(
        'keydown',
        event => {
            if (event.key === 'Escape') {
                closeMenu();
                menuButton.focus();
            }
        }
    );

    function updateActiveLink() {
        const requested = window.location.hash.slice(1);
        const page = ['directory', 'Departments', 'Groups', 'About', 'Contact'].includes(requested)
            ? requested : 'directory';
        const current = '#' + page;

        document.querySelectorAll('[data-page]').forEach(section => {
            section.hidden = section.dataset.page !== page;
        });
        const titles = { 
            directory: 'Employee Directory', 
            Departments: 'Departments',
            Groups: 'Guilds & Affinity Groups',
            About: 'About Our Team', 
            Contact: 'Contact Us' };
        document.title = 'The People | ' + titles[page];

        navigation.querySelectorAll('a')
            .forEach(link => {
                const isActive =
                    link.getAttribute('href') === current;

                link.classList.toggle(
                    'active',
                    isActive
                );

                if (isActive) {
                    link.setAttribute(
                        'aria-current',
                        'location'
                    );
                } else {
                    link.removeAttribute(
                        'aria-current'
                    );
                }
            });
    }

    window.addEventListener(
        'hashchange',
        () => {
            updateActiveLink();
            closeMenu();
            const visibleSection = document.querySelector('[data-page]:not([hidden])');
            const heading = visibleSection?.querySelector('h1, h2');
            if (heading) {
                heading.setAttribute('tabindex', '-1');
                heading.focus({ preventScroll: true });
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    );

    updateActiveLink();
}


// ThemeChanger-style icon button uses the existing saved theme preference.
const darkModeToggle = document.querySelector('#darkModeToggle');
function applyTheme(dark) {
    document.body.classList.toggle('darkMode', dark);
    darkModeToggle.setAttribute('aria-pressed', String(dark));
    darkModeToggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    darkModeToggle.setAttribute('aria-label', darkModeToggle.title);
}
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let themePreference = null;
try { themePreference = localStorage.getItem('darkMode'); } catch {}
applyTheme(themePreference === null ? systemTheme.matches : themePreference === 'enabled');
darkModeToggle.addEventListener('click', () => {
    const dark = !document.body.classList.contains('darkMode');
    themePreference = dark ? 'enabled' : 'null';
    applyTheme(dark);
    try { localStorage.setItem('darkMode', themePreference); } catch {}
});
systemTheme.addEventListener?.('change', event => {
    if (themePreference === null) applyTheme(event.matches);
});
window.addEventListener('storage', event => {
    if (event.key !== 'darkMode') return;
    themePreference = event.newValue;
    applyTheme(themePreference === null ? systemTheme.matches : themePreference === 'enabled');
});

// Grid and table share the existing search, sorting, and data source.
document.querySelector('#viewGridBtn').addEventListener('click', () => setDirectoryView('grid'));
document.querySelector('#viewTableBtn').addEventListener('click', () => setDirectoryView('table'));
setDirectoryView(directoryView);
window.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('.profile-modal')) return;
    if (event.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (searchInput.closest('[hidden]')) return;
    event.preventDefault(); searchInput.focus();
});





