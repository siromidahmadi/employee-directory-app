/* Adapted from Miguel Arias's chat (PR #104/#112) and Kassandra Vera's
   scheduling (PR #111). Shared client, invite-only membership and RLS replace
   the former separate databases and hardcoded employee/account mappings. */
(function(){
 'use strict';
 const store=window.ChatStore,byId=id=>document.getElementById(id);
 const conversation=byId('conversation'),messageForm=byId('message-form'),messageComposer=byId('message-composer'),messageStatus=byId('message-status'),recipientName=byId('recipient-name');
 const select=byId('chat-recipient'),sendButton=messageForm.querySelector('button[type="submit"]'),meetingButton=byId('schedule-button'),dateInput=byId('meeting-date'),timeInput=byId('meeting-time');
 let currentUser=null,recipientId='',people=[],chatReady=false,version=0,stops=[],owner=false,authVersion=0;
 const seen=new Set();
 function controls(ready){chatReady=ready;sendButton.disabled=!ready;messageComposer.disabled=!ready;meetingButton.disabled=!ready;document.querySelectorAll('[data-prompt]').forEach(b=>b.disabled=!ready);}
 function clearInvite(){byId('chat-invite-link').value='';byId('invite-link-panel').hidden=true;}
 function cleanup(){version++;stops.forEach(stop=>stop());stops=[];controls(false);conversation.replaceChildren();messageComposer.value='';dateInput.value='';timeInput.value='';byId('meeting-list').replaceChildren();seen.clear();clearInvite();}
 function displayMessage(message){
  if(seen.has(message.id))return;seen.add(message.id);
  const p=document.createElement('p');p.textContent=message.body;p.className=message.sender_id===currentUser.id?'sent-message':'received-message';p.dataset.messageId=message.id;p.dataset.createdAt=message.created_at;const later=[...conversation.children].find(node=>node.dataset.createdAt>message.created_at);conversation.insertBefore(p,later||null);conversation.scrollTop=conversation.scrollHeight;
 }
 async function loadMessages(run){
  try{const messages=await store.messages(currentUser.id,recipientId);if(run!==version)return;messages.forEach(displayMessage);await store.markRead(currentUser.id,recipientId);}catch{if(run===version)messageStatus.textContent='Messages could not load. Reselect this teammate to retry.';}
 }
 async function loadMeetings(run){
  try{
   const meetings=await store.meetings(currentUser.id,recipientId);if(run!==version)return;
   const list=byId('meeting-list');list.replaceChildren();
   if(!meetings.length){const li=document.createElement('li');li.textContent='No upcoming meetings.';list.append(li);}
   meetings.forEach(meeting=>{
    const li=document.createElement('li');li.textContent=new Date(meeting.start_at).toLocaleString([], {dateStyle:'full',timeStyle:'short'})+' – '+new Date(meeting.end_at).toLocaleTimeString([], {timeStyle:'short'});
    if(meeting.organizer_id===currentUser.id){const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel meeting';cancel.addEventListener('click',async()=>{cancel.disabled=true;try{await store.cancelMeeting(meeting.id);if(run===version)await loadMeetings(run);}catch{if(run===version)byId('meeting-message').textContent='Meeting could not be canceled.';}finally{cancel.disabled=false;}});li.append(' ',cancel);}
    list.append(li);
   });
  }catch{if(run===version)byId('meeting-message').textContent='Meetings could not load. Reselect this teammate to retry.';}
 }
 async function loadChat(){
  cleanup();recipientId=select.value;const run=version;
  messageStatus.textContent='';byId('meeting-message').textContent='';recipientName.textContent=people.find(m=>m.user_id===recipientId)?.employee?.name||'Choose an invited teammate';
  if(!recipientId)return;
  controls(true);messageStatus.textContent='Loading conversation…';
  stops.push(store.subscribe('directory_messages',payload=>{
   const m=payload.new;if(run!==version||!m?.id)return;
   if((m.sender_id===currentUser.id&&m.recipient_id===recipientId)||(m.sender_id===recipientId&&m.recipient_id===currentUser.id)){
    if(payload.eventType==='INSERT')displayMessage(m);
    if(m.recipient_id===currentUser.id)store.markRead(currentUser.id,recipientId).catch(()=>{});
   }
  }));
  stops.push(store.subscribe('directory_meetings',()=>{if(run===version)loadMeetings(run);}));
  await Promise.all([loadMessages(run),loadMeetings(run)]);
  if(run===version&&messageStatus.textContent==='Loading conversation…')messageStatus.textContent='Conversation ready.';
 }
 messageForm.addEventListener('submit',async event=>{
  event.preventDefault();const body=messageComposer.value.trim();if(!body||!chatReady||sendButton.disabled)return;
  const run=version;sendButton.disabled=true;messageStatus.textContent='Sending…';
  try{const message=await store.send(currentUser.id,recipientId,body);if(run!==version)return;displayMessage(message);messageComposer.value='';messageStatus.textContent='Message sent.';}catch{if(run===version)messageStatus.textContent='Message could not be sent. Your text is still here; try again.';}finally{if(run===version)sendButton.disabled=!chatReady;}
 });
 document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{if(chatReady){messageComposer.value=button.dataset.prompt;messageComposer.focus();}}));
 meetingButton.addEventListener('click',async()=>{
  if(!chatReady)return;const run=version;
  if(!dateInput.value||!timeInput.value){byId('meeting-message').textContent='Choose a date and time.';return;}
  const start=new Date(`${dateInput.value}T${timeInput.value}`);
  if(!Number.isFinite(start.getTime())||start<=new Date()){byId('meeting-message').textContent='Choose a future date and time.';return;}
  meetingButton.disabled=true;
  try{await store.schedule(currentUser.id,recipientId,start);if(run!==version)return;byId('meeting-message').textContent='One-hour meeting scheduled. It appears for both participants in this app.';await loadMeetings(run);}catch{if(run===version)byId('meeting-message').textContent='Meeting could not be scheduled. It may already exist; try another time.';}finally{if(run===version)meetingButton.disabled=!chatReady;}
 });
 select.addEventListener('change',loadChat);
 byId('chat-sign-out').addEventListener('click',async()=>{cleanup();byId('chat-workspace').hidden=true;await window.EmployeeStore.signOut();location.replace('chat-login.html');});
 async function ownerPanel(){
  byId('chat-owner-panel').hidden=!owner;if(!owner)return;
  const employees=await window.EmployeeStore.list(),invites=byId('invite-employee'),list=byId('chat-member-list');invites.replaceChildren();list.replaceChildren();
  const active=new Set(people.filter(m=>m.active).map(m=>m.employee_id));
  employees.filter(e=>!active.has(e.id)).forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=`${e.name} · ${e.email}`;invites.append(o);});
  byId('create-chat-invite').disabled=!invites.options.length;
  people.forEach(m=>{const li=document.createElement('li');li.textContent=(m.employee?.name||'Teammate')+(m.active?' · Chat enabled':' · Access revoked');if(m.user_id!==currentUser.id&&m.active){const b=document.createElement('button');b.type='button';b.textContent='Revoke chat access';b.addEventListener('click',async()=>{b.disabled=true;try{await store.revoke(m.user_id);await initialize();}catch{byId('invite-status').textContent='Access could not be revoked.';b.disabled=false;}});li.append(' ',b);}list.append(li);});
 }
 byId('create-chat-invite').addEventListener('click',async()=>{
  const run=authVersion,b=byId('create-chat-invite'),status=byId('invite-status');b.disabled=true;clearInvite();status.textContent='Creating a private invitation…';
  try{const result=await store.invite(byId('invite-employee').value);if(run!==authVersion)return;people=await store.members();if(run!==authVersion)return;await ownerPanel();if(run!==authVersion)return;byId('chat-invite-link').value=result.inviteLink;byId('invite-link-panel').hidden=false;status.textContent='Share this single-use sign-in link privately with '+result.email+'. No email has been sent.';await populateRecipients();}catch(e){if(run===authVersion)status.textContent=e.message||'Invite could not be created.';}finally{if(run===authVersion)b.disabled=!byId('invite-employee').options.length;}
 });
 byId('copy-chat-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(byId('chat-invite-link').value);byId('invite-status').textContent='Private invite link copied.';}catch{byId('invite-status').textContent='Select and copy the private link below.';byId('chat-invite-link').select();}});
 byId('clear-chat-invite').addEventListener('click',clearInvite);
 async function populateRecipients(){
  const old=select.value;select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Choose an invited teammate';select.append(empty);
  people.filter(m=>m.active&&m.user_id!==currentUser.id).forEach(m=>{const option=document.createElement('option');option.value=m.user_id;option.textContent=m.employee?.name||'Teammate';select.append(option);});
  select.value=old;
 }
 async function initialize(){
  const request=++authVersion;cleanup();byId('chat-workspace').hidden=true;
  try{
   const user=await store.current();if(request!==authVersion)return;
   if(!user){const url=new URL('chat-login.html',location.href);for(const key of ['employee','recipient']){const value=new URLSearchParams(location.search).get(key);if(value)url.searchParams.set(key,value);}location.replace(url.href);return;}
   currentUser=user;people=await store.members();if(request!==authVersion)return;owner=Boolean(await window.EmployeeStore.getAdmin());if(request!==authVersion)return;
   byId('chat-session').textContent='Signed in as '+(user.member.employee?.name||user.email);byId('chat-workspace').hidden=false;
   byId('meeting-timezone').textContent='One hour · Times shown in '+Intl.DateTimeFormat().resolvedOptions().timeZone+'.';
   await populateRecipients();await ownerPanel();
   const params=new URLSearchParams(location.search),target=people.find(m=>m.active&&m.user_id!==user.id&&(m.user_id===params.get('recipient')||m.employee_id===params.get('employee')));
   if(target){select.value=target.user_id;await loadChat();}
   else if(params.has('employee')||params.has('recipient'))messageStatus.textContent='This person has not been invited to chat. The owner can invite them below.';
   else if(people.filter(m=>m.active).length===1)messageStatus.textContent=owner?'Invite a teammate below to start chatting and scheduling.':'No other chat participants are available yet.';
  }catch{if(request===authVersion){byId('chat-workspace').hidden=false;messageStatus.textContent='Chat could not load. Reload the page to retry.';}}
 }
 controls(false);window.EmployeeStore?.onAuthChange(()=>{if(document.visibilityState!=='hidden')initialize();});
 window.addEventListener('pagehide',()=>{cleanup();byId('chat-workspace').hidden=true;});
 window.addEventListener('pageshow',e=>{if(e.persisted)initialize();});
 if(store)initialize();
})();
