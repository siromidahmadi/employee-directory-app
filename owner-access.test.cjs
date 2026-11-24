const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
function setup({user={id:'owner',email:'owner@example.com'},admin=true,owner=true}={}){
 const w=new JSDOM('',{runScripts:'outside-only'}).window;
 const calls=[];let signedOut=false;
 w.DIRECTORY_CONFIG={url:'https://example.com',publishableKey:'public'};
 w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user}}),signInWithPassword:async value=>{calls.push(value);return {data:{user}}},signOut:async()=>{signedOut=true;return {data:{}}}},from:table=>({select:()=>({eq:async()=>({data:(table==='directory_admins'?admin:owner)?[{user_id:user?.id}]:[]})})})})};
 w.eval(read('employee-store.js'));return {w,calls,get signedOut(){return signedOut}};
}
test('only both server-side owner and admin memberships allow management',async()=>{
 for(const [admin,owner] of [[true,true],[true,false],[false,true],[false,false]]){
  const s=setup({admin,owner});try{assert.equal(Boolean(await s.w.EmployeeStore.getAdmin()),admin&&owner)}finally{s.w.close()}
 }
});
test('shared username cannot sign in; owner email uses private credentials without username mapping',async()=>{
 const s=setup();try{
  await assert.rejects(s.w.EmployeeStore.signIn('THE-PEOPLE','test-only'),/owner email/);assert.equal(s.calls.length,0);
  await s.w.EmployeeStore.signIn(' OWNER@EXAMPLE.COM ','test-only');assert.equal(s.calls[0].email,'owner@example.com');
  assert.equal(typeof s.w.EmployeeStore.createSharedInternLogin,'undefined');
 }finally{s.w.close()}
});
test('valid non-owner credentials are signed out and denied management',async()=>{
 const s=setup({owner:false});try{await assert.rejects(s.w.EmployeeStore.signIn('former@example.com','test-only'),/Owner access/);assert.equal(s.signedOut,true)}finally{s.w.close()}
});
test('public visitors stay on Directory; only owner sees management and sign out hides it again',async()=>{
 const w=new JSDOM(read('directory.html'),{runScripts:'outside-only',url:'https://example.com/directory.html#directory'}).window;
 let current=null,onAuth;
 w.EmployeeStore={getAdmin:async()=>current,onAuthChange:fn=>{onAuth=fn},signOut:async()=>{current=null}};
 try{
  w.eval(read('directory-auth.js'));await tick();const d=w.document,login=d.getElementById('admin-login-link'),logout=d.getElementById('logout-button');
  assert.equal(w.location.pathname,'/directory.html');assert.equal(login.hidden,false);assert.equal(logout.hidden,true);assert.ok([...d.querySelectorAll('a[href="admin.html"]')].every(a=>a.hidden));
  current={id:'owner'};onAuth();await tick();assert.equal(login.hidden,true);assert.equal(logout.hidden,false);assert.ok([...d.querySelectorAll('a[href="admin.html"]')].every(a=>!a.hidden));
  logout.click();await tick();assert.equal(logout.hidden,true);assert.equal(login.hidden,false);
 }finally{w.close()}
});
test('restored collaboration never loads former external databases or shared intern provisioning',()=>{
 for(const page of ['directory.html','admin.html','chat-login.html','messaging.html']){
  const html=read(page);assert.doesNotMatch(html,/src="(?:miguel-supabase-config|veraSupabaseConfig|shared-intern-setup)\.js/);assert.doesNotMatch(html,/shared-intern-form/);
 }
 const dom=new JSDOM(read('chat-login.html'));assert.ok(dom.window.document.querySelector('#chat-login-form'));assert.equal(dom.window.document.querySelector('meta[http-equiv="refresh"]'),null);dom.window.close();
});
test('retired provisioning endpoint cannot create or reset accounts',async()=>{
 let handler;
 vm.runInNewContext(read('supabase/functions/provision-shared-intern/index.ts'),{Deno:{serve:fn=>{handler=fn}},Response,fetch:()=>{throw Error('Unexpected network request')}});
 for(const action of ['create','reset']){const r=await handler(new Request('https://example.com',{method:'POST',body:JSON.stringify({action})}));assert.equal(r.status,410)}
});
