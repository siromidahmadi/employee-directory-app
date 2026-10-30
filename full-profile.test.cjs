const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise(resolve => setImmediate(resolve));
const person = { id: 'demo-1', name: 'Alex Example', title: 'Engineer', department: 'Engineering', email: 'alex@example.com', skills: ['HTML','CSS','JavaScript','SQL'], bio: 'Builds useful tools.', location: 'Vancouver, British Columbia, Canada', timeZone: 'America/Vancouver', joiningDate: '2026-10-01', projects: ['Search improvements','TBD',' '], linkedin: 'https://www.linkedin.com/in/example', github: 'javascript:alert(1)', image: '' };
async function setup(employee = person) {
    const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { runScripts:'outside-only', url:'https://example.com/index.html#directory', pretendToBeVisual:true });
    const w = dom.window;
    w.matchMedia = () => ({ matches:true, addEventListener() {} });
    w.EmployeeStore = { list:async () => [employee] };
    w.eval(fs.readFileSync('card-local-time.js','utf8'));
    w.eval(fs.readFileSync('directory.js','utf8'));
    await tick();
    return w;
}
test('compact cards open all profile sections together with full saved information', async () => {
    const w = await setup();
    try {
        const d = w.document, card = d.querySelector('.employee-card');
        assert.equal(card.querySelector('.employee-profile-grid'), null);
        assert.equal(card.querySelectorAll('.skill-badge').length, 3);
        card.querySelector('.profile-button').click();
        const modal = d.querySelector('.profile-modal');
        assert.equal(modal.querySelector('[role="tablist"]'), null);
        assert.equal(modal.querySelector('[role="tabpanel"]'), null);
        const sections = [...modal.querySelectorAll('.full-profile-section')];
        assert.equal(sections.length, 4);
        assert.ok(sections.every(section => !section.hidden));
        assert.deepEqual(sections.map(s => s.querySelector('h3').textContent), ['Overview','Contact','Skills','Projects']);
        assert.match(sections[0].textContent, /Vancouver/);
        assert.match(sections[0].textContent, /October 1, 2026/);
        assert.equal(modal.querySelector('.card-local-time').dataset.timeZone, 'America/Vancouver');
        assert.equal(modal.querySelectorAll('.profile-skills .skill-badge').length, 4);
        assert.equal(modal.querySelectorAll('.profile-project-list li').length, 1);
        assert.equal(modal.querySelectorAll('.social-links a').length, 1);
    } finally { w.close(); }
});
test('full profile keeps safe text and clear empty states', async () => {
    const w = await setup({ ...person, bio:'<img src=x onerror=alert(1)>', skills:[], projects:[], email:'' });
    try {
        const d = w.document;
        d.querySelector('.employee-card .profile-button').click();
        const modal = d.querySelector('.profile-modal');
        assert.equal(modal.querySelector('.profile-bio img'), null);
        assert.match(modal.querySelector('.profile-bio').textContent, /<img/);
        assert.match(modal.querySelector('#profile-section-contact').textContent, /Email not listed/);
        assert.match(modal.querySelector('#profile-section-skills').textContent, /Skills not listed/);
        assert.match(modal.querySelector('#profile-section-projects').textContent, /No projects listed/);
    } finally { w.close(); }
});
test('full profile traps keyboard focus and Escape restores the opening control', async () => {
    const w = await setup();
    try {
        const d = w.document, opener = d.querySelector('.employee-card .profile-button');
        opener.focus(); opener.click();
        const close = d.querySelector('.modal-close');
        assert.equal(d.activeElement, close);
        close.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
        assert.equal(d.activeElement, d.querySelector('.full-profile .social-links a'));
        d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
        assert.equal(d.activeElement, close);
        close.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        assert.equal(d.querySelector('.profile-modal'), null);
        assert.equal(d.activeElement, opener);
        assert.equal(d.body.style.overflow, '');
    } finally { w.close(); }
});
test('full-profile copy email preserves its icon and reports the result', async () => {
    const w = await setup();
    try {
        let copied;
        Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text => {copied=text;}},configurable:true});
        const d = w.document;
        d.querySelector('.employee-card .profile-button').click();
        const button = d.querySelector('.full-profile .copy-email-icon');
        button.click(); await tick();
        assert.equal(copied, person.email);
        assert.ok(button.querySelector('svg'));
        assert.match(button.getAttribute('aria-label'), /Email copied/);
    } finally { w.close(); }
});
