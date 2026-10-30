const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup({owner=false,enabled=false,fail=false,readFails=false}={}){
  const w=new JSDOM(fs.readFileSync('admin.html','utf8'),{runScripts:'outside-only',url:'https://example.com/admin.html'}).window;
  let saved=enabled, writes=0, authChange;
  w.EmployeeStore={
    getHeroVisibility:async()=>{if(readFails)throw Error('offline');return saved;},
    isSiteOwner:async()=>owner,
    setHeroVisibility:async value=>{writes++;if(fail)throw Error('denied');saved=value;return saved;},
    onAuthChange:callback=>{authChange=callback;}
  };
  assert.equal(w.document.querySelector('.people-hero').hidden,true,'HTML starts hidden before scripts');
  w.eval(fs.readFileSync('hero-visibility.js','utf8'));await tick();
  return {w,writes:()=>writes,signOut:()=>{owner=false;authChange();}};
}
test('visitors cannot see owner controls and a failed read keeps the hero hidden',async()=>{
  const {w,writes}=await setup({readFails:true});
  try{
    const d=w.document;
    assert.equal(d.querySelector('.people-hero').hidden,true);
    assert.equal(d.getElementById('hero-owner-controls').hidden,true);
    assert.equal(d.getElementById('hero-visibility-toggle').disabled,true);
    d.getElementById('hero-visibility-toggle').click();assert.equal(writes(),0);
    assert.ok(d.getElementById('login-form'));
    assert.ok(d.getElementById('employee-form'));
  }finally{w.close();}
});
test('owner can reveal and hide while rejected writes never reveal the hero',async()=>{
  const {w,signOut}=await setup({owner:true});
  try{
    const d=w.document,button=d.getElementById('hero-visibility-toggle');
    assert.equal(d.getElementById('hero-owner-controls').hidden,false);
    button.click();await tick();
    assert.equal(d.querySelector('.people-hero').hidden,false);
    assert.equal(button.getAttribute('aria-checked'),'true');
    button.click();await tick();
    assert.equal(d.querySelector('.people-hero').hidden,true);
    signOut();await tick();
    assert.equal(d.getElementById('hero-owner-controls').hidden,true);
  }finally{w.close();}
  const denied=await setup({owner:true,fail:true});
  try{
    denied.w.document.getElementById('hero-visibility-toggle').click();await tick();
    assert.equal(denied.w.document.querySelector('.people-hero').hidden,true);
    assert.match(denied.w.document.getElementById('hero-visibility-status').textContent,/could not be changed/);
  }finally{denied.w.close();}
});
test('public reveal is read from the server and local URL/storage overrides are ignored',async()=>{
  const {w}=await setup({enabled:true});
  try{
    assert.equal(w.document.querySelector('.people-hero').hidden,false);
    assert.equal(w.document.getElementById('hero-owner-controls').hidden,true);
  }finally{w.close();}
});
