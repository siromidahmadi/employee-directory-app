const origin = 'https://siromidahmadi.github.io';
const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:cors});
  if(req.method!=='POST') return reply({error:'Method not allowed'},405);
  const authorization=req.headers.get('Authorization') || '';
  if(!authorization.startsWith('Bearer '))return reply({error:'Sign in as owner'},401);
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const userHeaders={apikey:anon,Authorization:authorization};
  const auth=await fetch(url+'/auth/v1/user',{headers:userHeaders});
  if(!auth.ok)return reply({error:'Sign in as owner'},401);
  const user=await auth.json();
  const membership=await fetch(url+'/rest/v1/directory_site_owners?select=user_id&user_id=eq.'+encodeURIComponent(user.id),{headers:userHeaders});
  if(!membership.ok || !(await membership.json()).some((row:{user_id:string})=>row.user_id===user.id))return reply({error:'Owner access required'},403);
  let body;
  try{body=await req.json();}catch{return reply({error:'Invalid request'},400);}
  if(typeof body.password!=='string'||body.password.length<8||body.password.length>128)return reply({error:'Use a password between 8 and 128 characters'},400);
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
  const action=body.action || 'create';
  if(!['create','reset'].includes(action))return reply({error:'Invalid action'},400);
  if(action==='reset'){
    const lookup=await fetch(url+'/auth/v1/admin/users?page=1&per_page=1000',{headers});
    if(!lookup.ok)return reply({error:'Could not locate shared account'},502);
    const listing=await lookup.json();
    const target=(listing.users || []).find((account:{id:string,email?:string})=>account.email?.toLowerCase()==='interns.thepeople@example.com');
    if(!target)return reply({error:'Create THE-PEOPLE first'},404);
    const ownerCheck=await fetch(url+'/rest/v1/directory_site_owners?select=user_id&user_id=eq.'+encodeURIComponent(target.id),{headers});
    if(!ownerCheck.ok || (await ownerCheck.json()).length || target.id===user.id)return reply({error:'Owner accounts cannot be reset here'},403);
    const changed=await fetch(url+'/auth/v1/admin/users/'+encodeURIComponent(target.id),{method:'PUT',headers,body:JSON.stringify({password:body.password})});
    if(!changed.ok)return reply({error:'Shared password could not be reset'},502);
    return reply({reset:true});
  }
  const created=await fetch(url+'/auth/v1/admin/users',{method:'POST',headers,body:JSON.stringify({email:'interns.thepeople@example.com',password:body.password,email_confirm:true,user_metadata:{display_name:'THE-PEOPLE interns'}})});
  if(!created.ok)return reply({error:'Account could not be created. It may already exist.'},409);
  const createdUser=await created.json();
  const grant=await fetch(url+'/rest/v1/directory_admins',{method:'POST',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({user_id:createdUser.id})});
  if(!grant.ok)return reply({error:'Account created but admin access needs owner review.'},500);
  return reply({created:true});
});