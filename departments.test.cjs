const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const tick = () => new Promise(resolve => setImmediate(resolve));

const people = [
  { id: '1', name: 'Ada Lovelace', title: 'Engineer', department: 'Engineering', email: 'a@example.com', image: '' },
  { id: '2', name: 'Grace Hopper', title: 'Lead', department: 'Engineering', email: 'g@example.com', image: '' },
  { id: '3', name: 'Linus T', title: 'Engineer', department: 'engineering', email: 'l@example.com', image: '' },
  { id: '4', name: 'Don Draper', title: 'Marketer', department: 'Marketing', email: 'd@example.com', image: '' },
  { id: '5', name: 'No Dept', title: 'Intern', department: '', email: 'n@example.com', image: '' }
];

async function setup() {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
    runScripts: 'outside-only',
    url: 'https://example.com/index.html#Departments',
    pretendToBeVisual: true
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.EmployeeStore = { list: async () => people };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.eval(fs.readFileSync('directory.js', 'utf8'));
  await tick();
  return w;
}

test('D2: each card shows its share of department headcount with a bar', async () => {
  const w = await setup();
  try {
    const eng = w.document.querySelector('[data-department="engineering"]');
    const mkt = w.document.querySelector('[data-department="marketing"]');
    assert.equal(eng.querySelector('.department-share').textContent, '75.0% of headcount');
    assert.equal(mkt.querySelector('.department-share').textContent, '25.0% of headcount');
    assert.equal(eng.querySelector('.department-bar-fill').style.width, '75%');
    assert.match(eng.getAttribute('aria-label'), /3 employees, 75\.0% of headcount/);
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
