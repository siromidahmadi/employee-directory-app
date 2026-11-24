(function(){
 'use strict';
 const store=window.ChatStore,status=document.getElementById('chat-login-status'),form=document.getElementById('chat-login-form'),setup=document.getElementById('chat-password-setup');
 const params=new URLSearchParams(location.search),destination=new URL('messaging.html',location.href);
 for(const key of ['employee','recipient'])if(params.get(key))destination.searchParams.set(key,params.get(key));
 function openChat(){location.replace(destination.href);}
 let checking=false;
 async function check(){
  if(checking)return;checking=true;
  try{if(await store.current()){
   if(params.get('setup')==='1'){form.hidden=true;setup.hidden=false;status.textContent='Your invitation is accepted. Choose a password or continue to chat.';}
   else openChat();
  }}catch{status.textContent='Chat access could not be verified. Try signing in again.';}finally{checking=false;}
 }
 form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;status.textContent='Signing in…';try{await store.signIn(document.getElementById('chat-email').value,document.getElementById('chat-password').value);document.getElementById('chat-password').value='';openChat();}catch{status.textContent='Sign-in failed. Check your email, password, and invitation access.';}finally{button.disabled=false;}});
 document.getElementById('chat-password-form').addEventListener('submit',async e=>{e.preventDefault();const password=document.getElementById('chat-new-password').value,confirm=document.getElementById('chat-confirm-password').value,button=e.target.querySelector('button');if(password!==confirm){status.textContent='The passwords do not match.';return;}button.disabled=true;try{await store.setPassword(password);e.target.reset();openChat();}catch{status.textContent='Password could not be saved. Use at least 12 characters and try again.';}finally{button.disabled=false;}});
 window.EmployeeStore?.onAuthChange(check);
 if(store)check();else status.textContent='Sign-in unavailable. Please reload.';
})();
