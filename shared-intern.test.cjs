const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const vm=require('node:vm');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('shared username maps to its own account while owner email stays unchanged',async()=>{
 const w=new JSDOM('',{runScripts:'outside-only'}).window;
 const calls=[];
 w.DIRECTORY_CONFIG={url:'https://example.com',publishableKey:'public'};
 w.supabase={createClient:()=>({auth:{signInWithPassword:async args=>{calls.push(args);return {data:{},error:null};}}})};
 w.eval(fs.readFileSync('employee-store.js','utf8'));
 await w.EmployeeStore.signIn(' the-people ','private-test-password');
 await w.EmployeeStore.signIn('owner@example.com','owner-test-password');
 assert.equal(calls[0].email,'interns.thepeople@example.com');
 assert.equal(calls[0].password,'private-test-password');
 assert.equal(calls[1].email,'owner@example.com');
 w.close();
});
test('only an authenticated owner reaches shared-account creation in the server function',async()=>{
 const source=fs.readFileSync('supabase/functions/provision-shared-intern/index.ts','utf8')
 .replace('(data:unknown,status=200)','(data,status=200)').replace('let body;','let body;').replace(/\)!/g,')').replace('(row:{user_id:string})','row');
 for(const allowed of [false,true]){
  let handler; const calls=[];
  vm.runInNewContext(source,{Deno:{serve:fn=>{handler=fn;},env:{get:name=>name==='SUPABASE_URL'?'https://example.com':name}},Response,fetch:async(url,options)=>{
   calls.push(url);
   if(url.endsWith('/auth/v1/user'))return Response.json({id:'owner-id'});
   if(url.includes('directory_site_owners'))return Response.json(allowed?[{user_id:'owner-id'}]:[]);
   if(url.endsWith('/auth/v1/admin/users'))return Response.json({id:'intern-id'});
   return new Response(null,{status:201});
  }});
  const response=await handler(new Request('https://example.com/function',{method:'POST',headers:{Authorization:'Bearer valid-test-token','Content-Type':'application/json'},body:JSON.stringify({password:'private-test-password'})}));
  assert.equal(response.status,allowed?200:403);
  assert.equal(calls.some(url=>url.endsWith('/auth/v1/admin/users')),allowed);
  const unsigned=await handler(new Request('https://example.com/function',{method:'POST'}));
  assert.equal(unsigned.status,401);
 }
});
