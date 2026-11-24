const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
const owner='10000000-0000-4000-8000-000000000001',peer='20000000-0000-4000-8000-000000000002',third='30000000-0000-4000-8000-000000000003';
const member=(id,name)=>({user_id:id,employee_id:id,active:true,employee:{id,name,email:name+'@example.com'}});
async function setup({sendFails=false,meetingFails=false,ownerAccess=false}={}){
 const w=new JSDOM(read('messaging.html'),{runScripts:'outside-only',url:'https://example.com/messaging.html?recipient='+peer}).window;
 let callback,current={id:owner,member:member(owner,'Owner')},sent=[],scheduled=[],callbacks={},unsubscribed=0;
 const saved={id:'message-one',sender_id:peer,recipient_id:owner,body:'<img src=x onerror=alert(1)>',created_at:'2026-01-01T12:00:00Z'};
 w.ChatStore={current:async()=>current,members:async()=>[member(owner,'Owner'),member(peer,'Peer'),member(third,'Third')],messages:async()=>[saved],markRead:async()=>{},meetings:async()=>[],send:async(a,b,body)=>{if(sendFails)throw Error('offline');sent.push({a,b,body});return {id:'sent-one',sender_id:a,recipient_id:b,body,created_at:new Date().toISOString()};},schedule:async(a,b,date)=>{if(meetingFails)throw Error('offline');scheduled.push({a,b,date});},subscribe:(table,cb)=>{callbacks[table]=cb;return ()=>{unsubscribed++}},revoke:async()=>{}};
 w.EmployeeStore={getAdmin:async()=>ownerAccess?{id:owner}:null,list:async()=>[],onAuthChange:fn=>{callback=fn},signOut:async()=>{current=null}};
 w.eval(read('messaging.js'));await tick();await tick();
 return {w,sent,scheduled,callbacks,get unsubscribed(){return unsubscribed},authChange:()=>callback()};
}
test('restored chat renders safe saved text, quick prompts, sends once and deduplicates realtime echoes',async()=>{
 const s=await setup();try{const d=s.w.document;
 assert.equal(d.querySelector('#chat-owner-panel').hidden,true);
 assert.equal(d.querySelector('#conversation img'),null);assert.match(d.querySelector('#conversation').textContent,/<img/);
 d.querySelector('[data-prompt]').click();assert.match(d.querySelector('#message-composer').value,/introduce/);
 d.querySelector('#message-form').dispatchEvent(new s.w.Event('submit',{cancelable:true}));await tick();
 assert.equal(s.sent.length,1);assert.equal(s.sent[0].a,owner);assert.equal(s.sent[0].b,peer);
 s.callbacks.directory_messages({eventType:'INSERT',new:{id:'sent-one',sender_id:owner,recipient_id:peer,body:'echo',created_at:new Date().toISOString()}});
 assert.equal(d.querySelectorAll('#conversation [data-message-id="sent-one"]').length,1);
 s.callbacks.directory_messages({eventType:'INSERT',new:{id:'other-chat',sender_id:third,recipient_id:owner,body:'Private other chat'}});
 assert.doesNotMatch(d.querySelector('#conversation').textContent,/Private other chat/);
 }finally{s.w.close()}
});
test('send failures preserve the message and switching conversations removes old subscriptions',async()=>{
 const s=await setup({sendFails:true});try{const d=s.w.document;
 d.querySelector('#message-composer').value='Keep this draft';d.querySelector('#message-form').dispatchEvent(new s.w.Event('submit',{cancelable:true}));await tick();
 assert.equal(d.querySelector('#message-composer').value,'Keep this draft');assert.equal(d.querySelector('#message-form button').disabled,false);
 d.querySelector('#chat-recipient').value=third;d.querySelector('#chat-recipient').dispatchEvent(new s.w.Event('change'));await tick();assert.ok(s.unsubscribed>=2);assert.equal(d.querySelector('#message-composer').value,'');
 }finally{s.w.close()}
});
test('Vera scheduling preserves minutes, rejects past dates and shows server errors',async()=>{
 const s=await setup();try{const d=s.w.document;
 d.querySelector('#meeting-date').value='2099-07-20';d.querySelector('#meeting-time').value='14:35';d.querySelector('#schedule-button').click();await tick();
 assert.equal(s.scheduled.length,1);assert.equal(s.scheduled[0].date.getMinutes(),35);assert.equal(s.scheduled[0].a,owner);assert.equal(s.scheduled[0].b,peer);
 d.querySelector('#meeting-date').value='2000-01-01';d.querySelector('#schedule-button').click();await tick();assert.equal(s.scheduled.length,1);assert.match(d.querySelector('#meeting-message').textContent,/future/);
 }finally{s.w.close()}
 const t=await setup({meetingFails:true});try{const d=t.w.document;d.querySelector('#meeting-date').value='2099-07-20';d.querySelector('#meeting-time').value='14:35';d.querySelector('#schedule-button').click();await tick();assert.match(d.querySelector('#meeting-message').textContent,/could not be scheduled/);}finally{t.w.close()}
});
test('new auth checks hide previous conversation content immediately',async()=>{
 const s=await setup();try{assert.ok(s.w.document.querySelector('#conversation').children.length);s.authChange();assert.equal(s.w.document.querySelector('#chat-workspace').hidden,true);assert.equal(s.w.document.querySelector('#conversation').children.length,0);await tick();await tick();}finally{s.w.close()}
});
function edge({isOwner=true,isAdmin=true,banned=false}={}){
 let handler,links=0,writes=[];
 const user={id:owner};
 const admin={auth:{getUser:async()=>({data:{user}}),admin:{listUsers:async()=>({data:{users:banned?[{id:peer,email:'peer@example.com',banned_until:'2099-01-01'}]:[]}}),generateLink:async options=>{links++;assert.equal(options.email,'peer@example.com');return {data:{user:{id:peer},properties:{action_link:'https://example.com/single-use'}}}}}},from:table=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:(table==='directory_site_owners'?isOwner:isAdmin)?{user_id:owner}:null}),single:async()=>({data:{id:peer,email:'peer@example.com'}})})}),upsert:async value=>{writes.push({table,value});return {}}})};
 let source=read('supabase/functions/invite-chat-member/index.ts').replace(/^import .*\n/,'').replace(':unknown','').replace(':Request','').replace(/\)!/g,')');
 vm.runInNewContext(source,{Deno:{serve:fn=>handler=fn,env:{get:()=>''}},createClient:()=>admin,Response,Date});
 return {call:token=>handler(new Request('https://example.com',{method:'POST',headers:token?{Authorization:'Bearer test'}:{},body:JSON.stringify({employeeId:peer})})),get links(){return links},writes};
}
test('invitation function rejects missing auth, nonowners and disabled accounts before issuing a credential',async()=>{
 for(const options of [{isOwner:false},{isAdmin:false},{banned:true}]){const e=edge(options);assert.ok((await e.call(true)).status>=400);assert.equal(e.links,0);assert.equal(e.writes.length,0);}
 const e=edge();assert.equal((await e.call(false)).status,401);assert.equal(e.links,0);
});
test('owner invitation creates a single-use link and only grants chat membership',async()=>{
 const e=edge();const response=await e.call(true);assert.equal(response.status,200);assert.equal((await response.json()).inviteLink,'https://example.com/single-use');assert.equal(e.links,1);assert.equal(e.writes.length,1);assert.equal(e.writes[0].table,'directory_chat_members');assert.equal(e.writes[0].value.active,true);
});
