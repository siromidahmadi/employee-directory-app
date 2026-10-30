const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise(resolve => setImmediate(resolve));
const people = [
    { id: 'person-1', name: 'Zoë Example', title: 'Developer', department: 'Engineering', email: 'zoe@example.com', location: 'Vancouver, British Columbia, Canada', country: 'Canada', skills: ['JavaScript', 'CSS'], bio: 'Builds accessible websites.' },
    { id: 'person-2', name: 'Alex Sample', title: 'Designer', department: 'Design', email: 'alex@example.com', location: 'Los Angeles, California, United States', country: 'United States', skills: ['Figma'], bio: '' }
];
function setup(list = async () => people) {
    const dom = new JSDOM(fs.readFileSync('admin.html', 'utf8'), {
        runScripts: 'outside-only', url: 'https://example.com/admin.html'
    });
    const w = dom.window;
    w.matchMedia = () => ({ matches: true, addEventListener() {} });
    w.EmployeeStore = { list };
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.eval(fs.readFileSync('apple-spotlight.js', 'utf8'));
    return w;
}
function search(w, query) {
    const input = w.document.getElementById('spotlight-search');
    input.value = query;
    input.dispatchEvent(new w.Event('input'));
    return input;
}
test('Spotlight finds directory profiles by name, skill, country, role, email and bio', async () => {
    const w = setup();
    try {
        const d = w.document;
        for (const query of ['  ZOE  ', 'javaScript', 'Canada', 'Developer', 'zoe@example.com', 'accessible websites', 'Canada CSS']) {
            search(w, query); await tick();
            assert.equal(d.querySelectorAll('.spotlight-result').length, 1, query);
            assert.match(d.querySelector('.spotlight-result').textContent, /Zoë Example/);
            assert.match(d.querySelector('.spotlight-result').href, /index.html\?employee=person-1#directory$/);
        }
        search(w, 'xyz-no-such-person');
        assert.equal(d.querySelectorAll('.spotlight-result').length, 0);
        assert.match(d.getElementById('spotlight-results').textContent, /No people found/);
        search(w, '   ');
        assert.equal(d.getElementById('spotlight-results').hidden, true);
        assert.equal(d.querySelectorAll('.spotlight-shortcut').length, 4);
    } finally { w.close(); }
});
test('keyboard arrows reach profiles and Escape clears and returns focus to search', async () => {
    const w = setup();
    try {
        const d = w.document;
        const input = search(w, 'CSS'); await tick();
        input.focus();
        input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        assert.equal(d.activeElement, d.querySelector('.spotlight-result'));
        d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        assert.equal(d.activeElement, input);
        assert.equal(input.value, '');
        assert.equal(d.getElementById('spotlight-results').hidden, true);
    } finally { w.close(); }
});
test('pending searches use the newest query, while failed requests offer retry', async () => {
    let complete;
    let attempts = 0;
    const w = setup(() => ++attempts === 1 ? Promise.reject(new Error('Offline')) : new Promise(resolve => { complete = resolve; }));
    try {
        const d = w.document;
        search(w, 'Canada'); await tick();
        assert.match(d.getElementById('spotlight-results').textContent, /Could not load/);
        d.querySelector('.spotlight-retry').click();
        search(w, 'Figma');
        complete(people); await tick();
        assert.equal(d.querySelectorAll('.spotlight-result').length, 1);
        assert.match(d.querySelector('.spotlight-result').textContent, /Alex Sample/);
    } finally { w.close(); }
});
test('default appearance is small, long width and lightly glassy at 0 percent', () => {
    const w = setup();
    try {
        const d = w.document, root = d.getElementById('teammate-spotlight');
        assert.equal(root.dataset.size, 'compact');
        assert.equal(root.style.getPropertyValue('--spotlight-width'), '1024px');
        assert.equal(d.querySelector('.spotlight-appearance'), null);
        assert.equal(d.getElementById('spotlight-help'), null);
        assert.equal(Number(root.style.getPropertyValue('--spotlight-opacity')), .88);
    } finally { w.close(); }
});
async function directory(url) {
    const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { runScripts: 'outside-only', url, pretendToBeVisual: true });
    const w = dom.window;
    w.matchMedia = () => ({ matches: true, addEventListener() {} });
    w.EmployeeStore = { list: async () => people };
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.eval(fs.readFileSync('directory.js', 'utf8'));
    await tick();
    return w;
}
test('selecting a Spotlight profile opens the matching existing directory modal', async () => {
    const w = await directory('https://example.com/index.html?employee=person-1#directory');
    try {
        assert.equal(w.document.querySelector('#employee-profile-name').textContent, 'Zoë Example');
        assert.equal(w.document.querySelector('.profile-modal').getAttribute('role'), 'dialog');
        w.document.querySelector('.modal-close').click();
        assert.equal(w.document.querySelector('.profile-modal'), null);
        assert.equal(w.document.querySelectorAll('#employee-list .employee-card').length, 2);
    } finally { w.close(); }
});
test('a removed profile link keeps the directory usable and explains the missing profile', async () => {
    const w = await directory('https://example.com/index.html?employee=removed#directory');
    try {
        assert.equal(w.document.querySelector('.profile-modal'), null);
        assert.match(w.document.querySelector('#directory-status').textContent, /no longer available/);
        assert.equal(w.document.querySelectorAll('#employee-list .employee-card').length, 2);
    } finally { w.close(); }
});

test('voice search starts only on click, uses speech for profile results, and stops capture', async () => {
    let instance;
    class Recognition {
        constructor() { instance = this; this.started = false; this.aborted = false; }
        start() { this.started = true; this.onstart?.(); }
        abort() { this.aborted = true; this.onend?.(); }
    }
    const w = setup();
    try {
        // Recreate the page with SpeechRecognition present before script initialization.
        const dom = new JSDOM(fs.readFileSync('admin.html', 'utf8'), { runScripts: 'outside-only', url: 'https://example.com/admin.html' });
        const v = dom.window;
        try {
            v.matchMedia = () => ({ matches: true });
            v.EmployeeStore = { list: async () => people };
            v.SpeechRecognition = Recognition;
            v.eval(fs.readFileSync('apple-spotlight.js', 'utf8'));
            const d = v.document, button = d.getElementById('spotlight-voice');
            assert.equal(instance, undefined);
            button.click();
            assert.equal(instance.started, true);
            assert.equal(button.getAttribute('aria-pressed'), 'true');
            instance.onresult({ results: [[{ transcript: 'Canada' }]] });
            await tick();
            assert.equal(d.getElementById('spotlight-search').value, 'Canada');
            assert.match(d.querySelector('.spotlight-result').textContent, /Zoë Example/);
            assert.equal(button.getAttribute('aria-pressed'), 'false');
            assert.equal(instance.aborted, true);
            button.click();
            instance.onerror({ error: 'not-allowed' });
            assert.match(d.getElementById('spotlight-voice-status').textContent, /permission was denied/);
            assert.equal(button.getAttribute('aria-pressed'), 'false');
            search(v, 'Figma'); await tick();
            assert.match(d.querySelector('.spotlight-result').textContent, /Alex Sample/);
        } finally { v.close(); }
    } finally { w.close(); }
});
test('unsupported browsers explain voice availability and retain typed search', async () => {
    const w = setup();
    try {
        const d = w.document;
        d.getElementById('spotlight-voice').click();
        assert.match(d.getElementById('spotlight-voice-status').textContent, /not supported/);
        search(w, 'CSS'); await tick();
        assert.match(d.querySelector('.spotlight-result').textContent, /Zoë Example/);
    } finally { w.close(); }
});
test('reduced-motion hero keeps complete accessible copy and does not start animation', () => {
    const w = setup();
    try {
        w.eval(fs.readFileSync('admin-hero-motion.js', 'utf8'));
        const d = w.document;
        assert.equal(d.getElementById('people-hero-title').getAttribute('aria-label'), 'Great teams start with great people.');
        assert.equal(d.querySelector('.typing-copy').textContent, 'Every teammate brings something different. Give them a place to share it.|');
        assert.equal(d.querySelector('.typing-cursor').hidden, true);
        assert.equal(d.querySelector('.people-hero').dataset.motionPaused, 'true');
        assert.equal(d.querySelector('.tagline-morph-visual>span').textContent, 'A face. A story. A new connection.');
        assert.ok([...d.querySelectorAll('.prism-char')].every(char => !char.style.transform));
    } finally { w.close(); }
});

test('random search prompts stay together and pause while a person types', async () => {
    const dom = new JSDOM(fs.readFileSync('admin.html', 'utf8'), { runScripts: 'outside-only', url: 'https://example.com/admin.html', pretendToBeVisual: true });
    const w = dom.window;
    try {
        const scheduled = new Map(); let id = 0;
        w.matchMedia = () => ({ matches: false, addEventListener() {} });
        w.setTimeout = callback => { scheduled.set(++id, callback); return id; };
        w.clearTimeout = timer => scheduled.delete(timer);
        w.EmployeeStore = { list: async () => people };
        w.eval(fs.readFileSync('apple-spotlight.js', 'utf8'));
        const d = w.document, prompt = d.querySelector('.spotlight-placeholder');
        const initial = prompt.textContent;
        const [timer, rotate] = scheduled.entries().next().value;
        scheduled.delete(timer); rotate();
        assert.notEqual(prompt.textContent, initial);
        assert.match(prompt.textContent, /^Search (people|departments|positions|skills|countries|cities|email)$/);
        const input = search(w, 'Canada'); await tick();
        assert.equal(prompt.hidden, true);
        assert.equal(input.value, 'Canada');
        assert.equal(scheduled.size, 0);
        input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        assert.equal(prompt.hidden, false);
        assert.equal(scheduled.size, 1);
    } finally { w.close(); }
});
