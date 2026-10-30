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
 .replace('(data:unknown,status=200)','(data,status=200)').replace('let body;','let body;').replace(/\)!/g,')').replace('(row:{user_id:string})','row').replace('(account:{id:string,email?:string})','account');
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

test('reset targets only the fixed non-owner intern account and never an owner',async()=>{
 const source=fs.readFileSync('supabase/functions/provision-shared-intern/index.ts','utf8')
 .replace('(data:unknown,status=200)','(data,status=200)').replace(/\)!/g,')')
 .replace('(row:{user_id:string})','row').replace('(account:{id:string,email?:string})','account');
 for(const targetOwner of [false,true]){
  let handler;const updates=[];
  vm.runInNewContext(source,{Deno:{serve:fn=>{handler=fn;},env:{get:name=>name==='SUPABASE_URL'?'https://example.com':name}},Response,fetch:async(url,options)=>{
   if(url.endsWith('/auth/v1/user'))return Response.json({id:'owner-id'});
   if(url.includes('directory_site_owners'))return Response.json(url.endsWith('owner-id')||targetOwner?[{user_id:'owner-id'}]:[]);
   if(url.includes('/admin/users?page='))return Response.json({users:[{id:'owner-id',email:'owner@example.com'},{id:'intern-id',email:'interns.thepeople@example.com'}]});
   if(options?.method==='PUT'){updates.push({url,body:JSON.parse(options.body)});return Response.json({id:'intern-id'});}
   throw Error('Unexpected request');
  }});
  const response=await handler(new Request('https://example.com/function',{method:'POST',headers:{Authorization:'Bearer valid-test-token','Content-Type':'application/json'},body:JSON.stringify({action:'reset',password:'new-private-test-password'})}));
  assert.equal(response.status,targetOwner?403:200);
  assert.equal(updates.length,targetOwner?0:1);
  if(!targetOwner){assert.match(updates[0].url,/admin\/users\/intern-id$/);assert.equal(updates[0].body.password,'new-private-test-password');}
 }
});
test('owner reset form sends the explicit reset action and clears the password',async()=>{
 const w=new JSDOM(fs.readFileSync('admin.html','utf8'),{runScripts:'outside-only',url:'https://example.com/admin.html'}).window;
 try{
  const calls=[];
  w.EmployeeStore={isSiteOwner:async()=>true,createSharedInternLogin:async(...args)=>{calls.push(args);},onAuthChange(){}};
  w.eval(fs.readFileSync('shared-intern-setup.js','utf8'));
  const d=w.document;
  d.getElementById('shared-intern-password').value='private-test-password';
  d.getElementById('shared-intern-form').dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:d.getElementById('shared-intern-reset')}));
  await tick();
  assert.equal(calls.length,1);assert.equal(calls[0][1],'reset');
  assert.equal(d.getElementById('shared-intern-password').value,'');
  assert.match(d.getElementById('shared-intern-status').textContent,/has been reset/);
 }finally{w.close();}
});
