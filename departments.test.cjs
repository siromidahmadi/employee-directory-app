const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const tick = () => new Promise(resolve => setImmediate(resolve));

const sample = [
  { id: '1', name: 'Ada Lovelace', title: 'Engineer', department: 'Engineering', email: 'a@example.com', image: 'img/1.png' },
  { id: '2', name: 'Grace Hopper', title: 'Lead', department: 'Engineering', email: 'g@example.com', image: '' },
  { id: '3', name: 'Linus T', title: 'Engineer', department: 'engineering', email: 'l@example.com', image: '' },
  { id: '4', name: 'Don Draper', title: 'Marketer', department: 'Marketing', email: 'd@example.com', image: '' },
  { id: '5', name: 'No Dept', title: 'Intern', department: '', email: 'n@example.com', image: '' }
];

async function setup(list = sample) {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
    runScripts: 'outside-only',
    url: 'https://example.com/index.html',
    pretendToBeVisual: true
  });
  const w = dom.window;
  w.EmployeeStore = { list: async () => list };
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.HTMLElement.prototype.scrollIntoView = function () { w.__scrolled = this.id; };
  w.eval(fs.readFileSync('directory.js', 'utf8'));
  await tick();
  return w;
}

test('renders one card per department with correct counts', async () => {
  const w = await setup();
  const cards = [...w.document.querySelectorAll('.department-card')];
  assert.equal(cards.length, 2);
  const eng = cards.find(c => c.dataset.department === 'engineering');
  assert.match(eng.querySelector('.department-count').textContent, /^3 Employees$/);
  const mkt = cards.find(c => c.dataset.department === 'marketing');
  assert.match(mkt.querySelector('.department-count').textContent, /^1 Employee$/);
  w.close();
});

test('departments section sits below the directory, above the footer', async () => {
  const w = await setup();
  const d = w.document;
  const FOLLOWING = w.Node.DOCUMENT_POSITION_FOLLOWING;
  assert.ok(d.querySelector('#directory').compareDocumentPosition(d.querySelector('#Departments')) & FOLLOWING);
  assert.ok(d.querySelector('#Departments').compareDocumentPosition(d.querySelector('footer')) & FOLLOWING);
  w.close();
});

test('clicking a card shows that department in a panel and leaves the full list alone', async () => {
  const w = await setup();
  const d = w.document;
  assert.equal(d.querySelector('#department-members').hidden, true);
  d.querySelector('[data-department="marketing"]').click();
  const panel = d.querySelector('#department-members');
  assert.equal(panel.hidden, false);
  assert.equal(panel.querySelectorAll('.member-item').length, 1);
  assert.match(panel.querySelector('h3').textContent, /Marketing team \(1\)/);
  assert.equal(d.querySelectorAll('#employee-list .employee-card').length, 5);
  assert.equal(d.querySelector('#department-filter').value, 'all');
  assert.equal(d.querySelector('[data-department="marketing"]').getAttribute('aria-pressed'), 'true');
  assert.equal(d.querySelector('[data-department="engineering"]').getAttribute('aria-pressed'), 'false');
  assert.equal(w.__scrolled, 'department-members');
  w.close();
});

test('clicking another card switches the panel; clicking the active card closes it', async () => {
  const w = await setup();
  const d = w.document;
  d.querySelector('[data-department="engineering"]').click();
  assert.equal(d.querySelectorAll('#department-members .member-item').length, 3);
  d.querySelector('[data-department="marketing"]').click();
  assert.equal(d.querySelectorAll('#department-members .member-item').length, 1);
  d.querySelector('[data-department="marketing"]').click();
  assert.equal(d.querySelector('#department-members').hidden, true);
  assert.equal(d.querySelectorAll('.department-card.active').length, 0);
  assert.equal(d.querySelectorAll('#employee-list .employee-card').length, 5);
  w.close();
});

test('Close button hides the panel', async () => {
  const w = await setup();
  const d = w.document;
  d.querySelector('[data-department="engineering"]').click();
  d.querySelector('.department-members-close').click();
  assert.equal(d.querySelector('#department-members').hidden, true);
  assert.equal(d.querySelectorAll('.department-card.active').length, 0);
  w.close();
});

test('department names render as text, not HTML', async () => {
  const w = await setup([{ id: '1', name: 'X', title: 'T', department: '<img src=x onerror=alert(1)>', email: 'x@example.com' }]);
  const d = w.document;
  assert.equal(d.querySelector('#department-grid img'), null);
  assert.match(d.querySelector('.department-name').textContent, /<img src=x/);
  w.close();
});

test('every department card has an arrow, and it is hidden from screen readers', async () => {
  const w = await setup();
  const cards = [...w.document.querySelectorAll('.department-card')];
  assert.ok(cards.length > 0);
  for (const card of cards) {
    const arrow = card.querySelector('.department-arrow');
    assert.ok(arrow);
    assert.equal(arrow.getAttribute('aria-hidden'), 'true');
  }
  w.close();
});

test('social links are readable text in the current profile', async () => {
  const w = await setup([{ id: '1', name: 'X', title: 'T', department: 'Design', email: 'x@example.com', linkedin: 'https://www.linkedin.com/in/x' }]);
  const d = w.document;
  d.querySelector('#employee-list .profile-button').click();
  const link = d.querySelector('.profile-modal .social-links a');
  assert.ok(link);
  assert.equal(d.querySelector('.profile-modal .social-links img'), null);
  assert.equal(link.textContent, 'LinkedIn');
  assert.equal(link.getAttribute('href'), 'https://www.linkedin.com/in/x');
  w.close();
});

test('department cards use drawn icons and a color tone per department type', async () => {
  const names = ['Development', 'Product', 'Design', 'Engineering', 'Human Resources', 'Analytics'];
  const tones = { development: 'blue', product: 'amber', design: 'pink', engineering: 'sky', 'human resources': 'orange', analytics: 'violet' };
  const w = await setup(names.map((department, i) => ({ id: String(i), name: 'Person ' + i, title: 'T', department, email: `p${i}@example.com` })));
  const d = w.document;
  for (const [key, tone] of Object.entries(tones)) {
    const card = d.querySelector(`[data-department="${key}"]`);
    assert.ok(card, key);
    assert.equal(card.dataset.tone, tone, key);
    assert.ok(card.querySelector('.department-icon svg'), key);
    assert.equal(card.querySelector('.department-icon').textContent.trim(), '', key);
  }
  w.close();
});

test('an unknown department still gets an icon and a tone', async () => {
  const w = await setup([{ id: '1', name: 'X', title: 'T', department: 'Zebra Care', email: 'x@example.com' }]);
  const card = w.document.querySelector('.department-card');
  assert.ok(card.querySelector('.department-icon svg'));
  assert.ok(card.dataset.tone);
  w.close();
});

test('the department panel is a compact list; details stay hidden until a name is pressed', async () => {
  const w = await setup();
  const d = w.document;
  d.querySelector('[data-department="engineering"]').click();
  const rows = d.querySelectorAll('#department-members .member-row');
  assert.equal(rows.length, 3);
  assert.equal(d.querySelectorAll('#department-members .employee-card').length, 0);
  assert.equal(d.querySelectorAll('#department-members .member-details:not([hidden])').length, 0);
  assert.equal(d.querySelectorAll('#department-members .member-details').length, 3);
  assert.equal(d.querySelector('#department-members .member-details').children.length, 0);
  w.close();
});

test('pressing a name opens a small info box; only one is open at a time', async () => {
  const w = await setup();
  const d = w.document;
  d.querySelector('[data-department="engineering"]').click();
  const rows = [...d.querySelectorAll('#department-members .member-row')];
  rows[0].click();
  let open = d.querySelectorAll('#department-members .member-details:not([hidden])');
  assert.equal(open.length, 1);
  assert.equal(rows[0].getAttribute('aria-expanded'), 'true');
  assert.match(open[0].textContent, /@example\.com/);
  assert.ok(open[0].querySelector('.copy-email'));
  assert.ok(open[0].querySelector('.profile-button'));
  rows[1].click();
  open = d.querySelectorAll('#department-members .member-details:not([hidden])');
  assert.equal(open.length, 1);
  assert.equal(rows[0].getAttribute('aria-expanded'), 'false');
  assert.equal(rows[1].getAttribute('aria-expanded'), 'true');
  rows[1].click();
  assert.equal(d.querySelectorAll('#department-members .member-details:not([hidden])').length, 0);
  w.close();
});

test('View Full Profile in the info box opens the existing profile popup', async () => {
  const w = await setup();
  const d = w.document;
  d.querySelector('[data-department="marketing"]').click();
  d.querySelector('#department-members .member-row').click();
  d.querySelector('#department-members .profile-button').click();
  const modal = d.querySelector('.profile-modal');
  assert.ok(modal);
  assert.match(modal.textContent, /Don Draper/);
  w.close();
});

test('D2: each card shows its share of department headcount with a bar', async () => {
  const w = await setup();
  try {
    const eng = w.document.querySelector('[data-department="engineering"]');
    const mkt = w.document.querySelector('[data-department="marketing"]');
    assert.equal(eng.querySelector('.department-share').textContent, '60.0% of headcount');
    assert.equal(mkt.querySelector('.department-share').textContent, '20.0% of headcount');
    assert.equal(eng.querySelector('.department-bar-fill').style.width, '60%');
    assert.match(eng.getAttribute('aria-label'), /3 employees, 60\.0% of headcount/);
  } finally { w.close(); }
});

test('D3: View Directory opens the directory filtered to that department', async () => {
  const w = await setup();
  try {
    const d = w.document;
    d.querySelector('#search').value = 'leftover search';
    const links = [...d.querySelectorAll('.department-directory-link')];
    assert.equal(links.length, 2);
    links.find(l => /Marketing/.test(l.getAttribute('aria-label'))).click();
    assert.equal(w.location.hash, '#directory');
    assert.equal(d.querySelector('#department-filter').value, 'marketing');
    assert.equal(d.querySelector('#search').value, '');
    const cards = d.querySelectorAll('#employee-list .employee-card');
    assert.equal(cards.length, 1);
    assert.match(cards[0].textContent, /Don Draper/);
  } finally { w.close(); }
});

test('D3: the link is not nested inside the card button', async () => {
  const w = await setup();
  try {
    const link = w.document.querySelector('.department-directory-link');
    assert.equal(link.closest('button'), null);
  } finally { w.close(); }
});
