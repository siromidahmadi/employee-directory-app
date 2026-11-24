/* Miguel Arias's in-app notifications (PR #104/#112), using invite-only RLS. */
(function(){
 'use strict';
 const root=document.getElementById('message-notification-root'),badge=document.getElementById('chat-unread-count'),store=window.ChatStore;
 if(!root||!store)return;
 let stop=null,version=0,user=null;
 function clear(){if(stop)stop();stop=null;root.replaceChildren();if(badge){badge.hidden=true;badge.textContent='';}}
 function showMessageNotification(message){
  const notification=document.createElement('aside');notification.className='message-notification';
  const text=document.createElement('p');text.textContent='You received a new message.';
  const open=document.createElement('a');open.textContent='Open chat';open.href='messaging.html?recipient='+encodeURIComponent(message.sender_id);
  const close=document.createElement('button');close.type='button';close.className='notification-close';close.textContent='×';close.setAttribute('aria-label','Dismiss notification');close.addEventListener('click',()=>notification.remove());
  notification.append(close,text,open);root.append(notification);while(root.children.length>3)root.firstElementChild.remove();
 }
 async function updateBadge(run){try{const rows=await store.unread(user.id);if(run!==version)return;if(badge){badge.hidden=!rows.length;badge.textContent=rows.length===20?'20+':String(rows.length);badge.setAttribute('aria-label',rows.length+' unread messages');}}catch{if(run===version&&badge)badge.hidden=true;}}
 async function startMessageNotifications(){
  const run=++version;clear();
  try{const current=await store.current();if(run!==version||!current)return;user=current;await updateBadge(run);if(run!==version)return;
   stop=store.subscribe('directory_messages',payload=>{if(run!==version)return;if(payload.eventType==='INSERT')showMessageNotification(payload.new);updateBadge(run);},'recipient_id=eq.'+user.id);
  }catch{/* Directory stays public when chat is unavailable. */}
 }
 window.EmployeeStore.onAuthChange(startMessageNotifications);
 window.addEventListener('pagehide',()=>{version++;clear();});
 window.addEventListener('pageshow',startMessageNotifications);
 startMessageNotifications();
})();
