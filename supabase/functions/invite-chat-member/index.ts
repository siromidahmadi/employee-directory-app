import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const headers={ 'Access-Control-Allow-Origin':'https://siromidahmadi.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin' };
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return respond({error:'Sign in as owner.'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user)return respond({error:'Sign in as owner.'},401);
  const {data:owner}=await admin.from('directory_site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
  const {data:manager}=await admin.from('directory_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!owner||!manager)return respond({error:'Only the owner can invite chat users.'},403);
  const {employeeId}=await req.json();
  if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(employeeId||''))return respond({error:'Choose an employee.'},400);
  const {data:employee,error:employeeError}=await admin.from('employees').select('id,email').eq('id',employeeId).single();
  if(employeeError||!employee)return respond({error:'Employee not found.'},404);
  const email=employee.email.trim().toLowerCase();
  let existing=null;
  for(let page=1;page<=50;page++){
   const {data,error}=await admin.auth.admin.listUsers({page,perPage:200});if(error)throw error;
   existing=data.users.find(u=>u.email?.toLowerCase()===email)||null;
   if(existing||data.users.length<200)break;
   if(page===50)return respond({error:'Account lookup limit reached. Contact support.'},503);
  }
  if(existing?.id===user.id)return respond({error:'Your owner account already has access.'},400);
  if(existing?.banned_until&&new Date(existing.banned_until)>new Date())return respond({error:'This account was disabled. Review it in Supabase before inviting.'},409);
  const {data,error}=await admin.auth.admin.generateLink({type:existing?'magiclink':'invite',email,options:{redirectTo:'https://siromidahmadi.github.io/employee-directory-app/chat-login.html?setup=1'}});
  if(error||!data.user||!data.properties?.action_link)throw Error('Invite link unavailable.');
  const {error:memberError}=await admin.from('directory_chat_members').upsert({user_id:data.user.id,employee_id:employee.id,active:true},{onConflict:'user_id'});
  if(memberError)throw memberError;
  // Never log or persist this single-use credential. The owner shares it privately.
  return respond({inviteLink:data.properties.action_link,email});
 }catch{return respond({error:'Invite could not be created. Check the employee account and try again.'},400);}
});
