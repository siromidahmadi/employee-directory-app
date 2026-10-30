const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise(resolve => setImmediate(resolve));
const people = [
  { id:'1', name:'Zoë Example', title:'Engineer', department:'Engineering', email:'zoe@example.com', country:'Canada', skills:['JavaScript'] },
  { id:'2', name:'Alex Sample', title:'Designer', department:'Design', email:'alex@example.com', country:'United States', skills:['Figma'] },
  { id:'3', name:'No Department', title:'Intern', department:'', email:'intern@example.com', skills:[] }
];
async function setup(openings = {}) {
  const w = new JSDOM(fs.readFileSync('index.html','utf8'), { runScripts:'outside-only', url:'https://example.com/index.html#Departments', pretendToBeVisual:true }).window;
  w.matchMedia = () => ({matches:true,addEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView = function() {};
  w.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
  w.HTMLDialogElement.prototype.close = function() { this.open = false; };
  w.EmployeeStore = {list:async()=>people};
  w.fetch = async()=>({ok:true,json:async()=>openings});
  w.eval(fs.readFileSync('departments-page.js','utf8'));
  w.eval(fs.readFileSync('directory.js','utf8'));
  await tick();
  return w;
}
test('department totals use all people and absent openings never become zero', async()=>{
  const w=await setup();
  try {
    const d=w.document;
    assert.equal(d.getElementById('department-summary-count').textContent,'2');
    assert.equal(d.getElementById('department-summary-headcount').textContent,'3');
    assert.equal(d.getElementById('department-summary-openings').textContent,'Not listed');
    d.querySelector('.department-openings').click();
    assert.equal(d.getElementById('department-openings-dialog').open,true);
    assert.match(d.getElementById('department-openings-content').textContent,/not been provided/);
    d.getElementById('team-search').value='Engineering';
    d.getElementById('team-search').dispatchEvent(new w.Event('input'));
    assert.equal(d.querySelectorAll('.department-card').length,1);
    assert.equal(d.querySelectorAll('.department-openings').length,1);
    assert.equal(d.getElementById('department-summary-count').textContent,'2');
    assert.equal(d.getElementById('department-summary-headcount').textContent,'3');
    d.getElementById('department-view-list').click();
    assert.equal(d.getElementById('department-grid').dataset.layout,'list');
    assert.equal(w.localStorage.getItem('departmentView'),'list');
    d.getElementById('clear-all-teams').click();
    assert.equal(d.querySelectorAll('.department-card').length,2);
    assert.equal(d.getElementById('department-grid').dataset.layout,'list');
  } finally {w.close();}
});
test('openings distinguish known zero, partial totals, and safe role text',async()=>{
  const w=await setup({Engineering:[{title:'<img src=x onerror=alert(1)>',location:'Remote'}]});
  try {
    const d=w.document;
    assert.equal(d.getElementById('department-summary-openings').textContent,'1+ Roles');
    d.querySelector('[aria-label="View openings for Engineering"]').click();
    assert.match(d.getElementById('department-openings-content').textContent,/<img src=x/);
    assert.equal(d.getElementById('department-openings-content').querySelector('img'),null);
  } finally {w.close();}
  const v=await setup({Engineering:[],Design:[]});
  try {assert.equal(v.document.getElementById('department-summary-openings').textContent,'0 Roles');}
  finally {v.close();}
});
test('header search opens matching profiles and submits location and multiword queries to Directory',async()=>{
  const w=await setup();
  try {
    const d=w.document, input=d.getElementById('header-directory-search');
    input.value='ZOE Canada';
    input.dispatchEvent(new w.Event('input'));
    assert.equal(d.querySelectorAll('#header-directory-results a').length,1);
    assert.match(d.querySelector('#header-directory-results a').href,/employee=1#directory$/);
    input.focus();
    input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
    assert.equal(d.activeElement,d.querySelector('#header-directory-results a'));
    d.getElementById('header-directory-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    await tick();
    assert.equal(w.location.hash,'#directory');
    assert.equal(d.querySelectorAll('#employee-list .employee-card').length,1);
    assert.equal(d.querySelector('.department-header-tools').hidden,true);
  } finally {w.close();}
});
