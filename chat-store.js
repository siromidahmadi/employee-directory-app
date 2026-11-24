/* Miguel's shared messaging and Vera's scheduling now use the owner's existing client. */
(function () {
 'use strict';
 const client=window.EmployeeStore?.getClient();
 if(!client)return;
 const fields='user_id,employee_id,active,employee:employees(id,name,email,title,department)';
 function check(r){if(r.error)throw r.error;return r.data;}
 function uuid(value){if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value||''))throw Error('Choose a valid chat participant.');return value;}
 async function current(){
  const {data,error}=await client.auth.getUser();if(error||!data.user)return null;
  const member=check(await client.from('directory_chat_members').select(fields).eq('user_id',data.user.id).eq('active',true).maybeSingle());
  return member?{...data.user,member}:null;
 }
 function pair(a,b){uuid(a);uuid(b);return `and(sender_id.eq.${a},recipient_id.eq.${b}),and(sender_id.eq.${b},recipient_id.eq.${a})`;}
 window.ChatStore=Object.freeze({
  current,
  async members(){return check(await client.from('directory_chat_members').select(fields).order('created_at'));},
  async signIn(email,password){check(await client.auth.signInWithPassword({email:email.trim().toLowerCase(),password}));if(!await current()){await client.auth.signOut();throw Error('Chat access is by invitation. Ask the owner for an invite.');}},
  async setPassword(password){if(password.length<12)throw Error('Use at least 12 characters.');return check(await client.auth.updateUser({password}));},
  async messages(user,recipient){return check(await client.from('directory_messages').select('*').or(pair(user,recipient)).order('created_at',{ascending:false}).limit(100)).reverse();},
  async send(user,recipient,body){body=body.trim();if(!body||body.length>500)throw Error('Use 1–500 characters.');return check(await client.from('directory_messages').insert({sender_id:uuid(user),recipient_id:uuid(recipient),body}).select().single());},
  async unread(user){return check(await client.from('directory_messages').select('id,sender_id,recipient_id,body,created_at').eq('recipient_id',uuid(user)).is('read_at',null).order('created_at',{ascending:false}).limit(20));},
  async markRead(user,recipient){return check(await client.from('directory_messages').update({read_at:new Date().toISOString()}).eq('recipient_id',uuid(user)).eq('sender_id',uuid(recipient)).is('read_at',null));},
  async meetings(user,recipient){uuid(user);uuid(recipient);return check(await client.from('directory_meetings').select('*').or(`and(organizer_id.eq.${user},guest_id.eq.${recipient}),and(organizer_id.eq.${recipient},guest_id.eq.${user})`).gte('end_at',new Date().toISOString()).order('start_at'));},
  async schedule(user,recipient,start){if(!(start instanceof Date)||!Number.isFinite(start.getTime())||start<=new Date())throw Error('Choose a future date and time.');return check(await client.from('directory_meetings').insert({organizer_id:uuid(user),guest_id:uuid(recipient),start_at:start.toISOString(),end_at:new Date(start.getTime()+3600000).toISOString()}).select().single());},
  async cancelMeeting(id){return check(await client.from('directory_meetings').delete().eq('id',uuid(id)).select('id').single());},
  subscribe(table,callback,filter){const channel=client.channel(`${table}-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table,...(filter?{filter}:{})},callback).subscribe();return ()=>{client.removeChannel(channel);};},
  async invite(employeeId){const r=await client.functions.invoke('invite-chat-member',{body:{employeeId:uuid(employeeId)}});if(r.error)throw Error('Invite could not be created. Check your owner session and try again.');if(r.data?.error)throw Error(r.data.error);return r.data;},
  async revoke(userId){return check(await client.from('directory_chat_members').update({active:false}).eq('user_id',uuid(userId)).select('user_id').single());}
 });
})();
