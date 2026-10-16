"use strict";
const {test} = require("node:test"), assert = require("node:assert/strict"), http = require("node:http");
const {createAccountService} = require("../server/account-service.cjs");
const model = require("../src/account-model.js");
async function setup(t, options = {}) {
  let service, clock=Date.now();const mail=[];
  const server=http.createServer((req,res)=>service.handle(req,res));
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const base=`http://127.0.0.1:${server.address().port}`;
  service=createAccountService({filename:":memory:",origin:base,secret:"test-only-secret-".repeat(4),privacyUrl:"/privacy",now:()=>clock,sendCode:async(email,code)=>mail.push({email,code}),...options});
  t.after(async()=>{await new Promise(r=>server.close(r));service.close();});
  const call=async(path,data,cookie="",headers={})=>{
    const res=await fetch(base+"/api/"+path,{method:data===undefined?"GET":"POST",headers:{Origin:base,"Content-Type":"application/json",Cookie:cookie,...headers},body:data===undefined?undefined:JSON.stringify(data)});
    return {status:res.status,data:await res.json(),cookie:res.headers.get("set-cookie")};
  };
  async function login(email="rider@example.test") {
    const sent=await call("auth/request",{email,privacyVersion:"account-v1"});assert.equal(sent.status,200);
    const response=await call("auth/verify",{challenge:sent.data.challenge,code:mail.at(-1).code});assert.equal(response.status,200);return response;
  }
  return {base,call,mail,login,advance:ms=>clock+=ms};
}
test("account card validates ranges, rejects nested values and does not accept entitlement fields",()=>{
  assert.equal(model.profile({capacity:"19.2",chainring:32,name:"  Антон  ",paid:true}).name,"Антон");
  assert.equal(model.profile({paid:true}).paid,undefined);
  for(const value of [{capacity:0},{chainring:32.5},{name:"x\n"},{name:"x".repeat(61)},{voltage:true},{display:{html:"x"}}])assert.throws(()=>model.profile(value));
});
test("email login verifies a code once, creates a user, uses an opaque HttpOnly session and revokes it on logout",async t=>{
  const s=await setup(t),sent=await s.call("auth/request",{email:" Rider@Example.test ",privacyVersion:"account-v1"});
  assert.equal(sent.status,200);assert.equal(sent.data.code,undefined);assert.equal(s.mail[0].email,"rider@example.test");
  const input={challenge:sent.data.challenge,code:s.mail[0].code},login=await s.call("auth/verify",input);
  assert.equal(login.data.user.email,"rider@example.test");assert.equal(login.data.access.status,"none");assert.deepEqual(login.data.orders,[]);
  assert.match(login.cookie,/HttpOnly/);assert.match(login.cookie,/SameSite=Strict/);assert.ok(!login.cookie.includes("rider"));
  assert.equal((await s.call("auth/verify",input)).status,401);
  assert.equal((await s.call("account",undefined,login.cookie)).data.user.email,"rider@example.test");
  assert.equal((await s.call("auth/logout",{},login.cookie)).status,200);
  assert.equal((await s.call("account",undefined,login.cookie)).data.user,null);
});
test("codes expire, are replaced on resend and lock after five incorrect attempts",async t=>{
  const s=await setup(t),first=await s.call("auth/request",{email:"rider@example.test",privacyVersion:"account-v1"});
  const old=s.mail[0].code;s.advance(61000);
  const second=await s.call("auth/request",{email:"rider@example.test",privacyVersion:"account-v1"});
  assert.equal((await s.call("auth/verify",{challenge:first.data.challenge,code:old})).status,401);
  const correct=s.mail[1].code,wrong=correct==="000000"?"111111":"000000";
  for(let i=0;i<5;i++)assert.equal((await s.call("auth/verify",{challenge:second.data.challenge,code:wrong})).status,401);
  assert.equal((await s.call("auth/verify",{challenge:second.data.challenge,code:correct})).status,401);
  s.advance(61000);const third=await s.call("auth/request",{email:"rider@example.test",privacyVersion:"account-v1"});s.advance(600001);
  assert.equal((await s.call("auth/verify",{challenge:third.data.challenge,code:s.mail.at(-1).code})).status,401);
});
test("email sending is throttled and malformed/cross-site requests never send mail",async t=>{
  const s=await setup(t),data={email:"rider@example.test",privacyVersion:"account-v1"};
  assert.equal((await s.call("auth/request",data,"",{Origin:"https://foreign.example"})).status,403);
  assert.equal((await s.call("auth/request",{...data,email:"x\r\nBcc: other@example.test"})).status,400);
  assert.equal((await s.call("auth/request",{email:data.email})).status,400);
  assert.equal((await s.call("auth/request",data,"",{"Content-Type":"text/plain"})).status,415);
  assert.equal(s.mail.length,0);
  assert.equal((await s.call("auth/request",data)).status,200);
  assert.equal((await s.call("auth/request",data)).status,429);assert.equal(s.mail.length,1);
});
test("accounts isolate bike cards, reject stale changes and never grant access from client fields",async t=>{
  const s=await setup(t),a=await s.login(),b=await s.login("second@example.test");
  const update=await s.call("profile",{profile:{bike:"Trek Roscoe",paid:true,access:{status:"active"}},revision:0},a.cookie);
  assert.equal(update.status,200);assert.equal(update.data.user.profile.bike,"Trek Roscoe");assert.equal(update.data.user.revision,1);assert.equal(update.data.access.status,"none");
  assert.equal((await s.call("account",undefined,b.cookie)).data.user.profile.bike,"");
  assert.equal((await s.call("profile",{profile:{bike:"stale"},revision:0},a.cookie)).status,409);
  assert.equal((await s.call("profile",{profile:{bike:"anon"},revision:1})).status,401);
  assert.equal((await s.call("checkout",{paid:true,price:1},a.cookie)).status,503);
  assert.equal((await s.call("account",undefined,a.cookie)).data.checkoutEnabled,false);
  s.advance(7*86400000+1);assert.equal((await s.call("account",undefined,a.cookie)).data.user,null);
});
test("SMTP or privacy configuration missing keeps sign-in unavailable; mail errors return no credentials",async t=>{
  const a=await setup(t,{sendCode:null}),b=await setup(t,{privacyUrl:null}),c=await setup(t,{sendCode:async()=>{throw Error("secret SMTP details");}});
  for(const s of [a,b]){assert.equal((await s.call("account")).data.authEnabled,false);assert.equal((await s.call("auth/request",{email:"rider@example.test",privacyVersion:"account-v1"})).status,503);}
  const response=await c.call("auth/request",{email:"rider@example.test",privacyVersion:"account-v1"});assert.deepEqual(response.data,{error:"MAIL_UNAVAILABLE"});
});
test("service rejects an insecure public origin or short secret",()=>{
  for(const params of [{origin:"http://public.example",secret:"x".repeat(64)},{origin:"https://example.test",secret:"short"}])assert.throws(()=>createAccountService({filename:":memory:",...params}));
});
