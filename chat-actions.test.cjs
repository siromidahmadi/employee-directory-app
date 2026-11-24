const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));
const read=p=>fs.readFileSync(p,'utf8');
const person={id:'demo',name:'Demo Person',title:'Engineer',email:'demo@example.com',department:'Engineering',skills:['HTML'],chat_user_id:'recipient'};
async function directory(url='https://example.com/index.html#directory'){
 const dom=new JSDOM(read('index.html'),{runScripts:'outside-only',url,pretendToBeVisual:true});
 const w=dom.window;w.matchMedia=()=>({matches:true,addEventListener(){}});w.scrollTo=()=>{};
 w.EmployeeStore={list:async()=>[person]};w.eval(read('directory.js'));await tick();return w;
}
test('the hero search combines with department filtering and Clear all resets it',async()=>{
 const w=await directory();try{
 const d=w.document,h=d.querySelector('#spotlight-search');h.value='Nobody';h.dispatchEvent(new w.Event('input'));
 assert.equal(d.querySelectorAll('.employee-card').length,0);
 d.querySelector('#clearSearch').click();assert.equal(h.value,'');assert.equal(d.querySelectorAll('.employee-card').length,1);
 h.value='ENGINEER';h.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.employee-card').length,1);
 assert.equal(d.querySelector('#header-search-input'),null);
 }finally{w.close()}
});
test('shared links open the current full profile, copy its ID, and print alongside the restored chat entry point',async()=>{
 const w=await directory('https://example.com/index.html?employee=demo#directory');try{
 const d=w.document;let copied='',printed=0;Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{copied=t}}});w.print=()=>printed++;
 assert.equal(d.querySelectorAll('.full-profile-section').length,4);
 assert.match(d.querySelector('.profile-message-button').href,/messaging.html\?employee=demo$/);
 d.querySelector('.share-profile-button').click();await tick();assert.equal(new URL(copied).searchParams.get('employee'),'demo');
 d.querySelector('.print-profile-button').click();assert.equal(printed,1);
 d.querySelector('.modal-close').click();assert.equal(d.querySelector('.profile-modal'),null);
 }finally{w.close()}
});
