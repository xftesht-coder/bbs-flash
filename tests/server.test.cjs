"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{spawn}=require("node:child_process"),{once}=require("node:events");
test("optional server enables same-origin account API and never serves secrets, database or server source",{timeout:15000},async t=>{
  const parent=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,"bbs-account-smoke-"));
  const env={...process.env,BBS_ORIGIN:"https://example.test",BBS_PORT:"0",BBS_ACCOUNT_SECRET:"test-only-not-a-production-secret-".repeat(3),BBS_ACCOUNT_DB:path.join(dir,"accounts.sqlite"),BBS_PRIVACY_URL:"",SMTP_HOST:"",SMTP_USER:"",SMTP_PASSWORD:"",SMTP_FROM:""};
  const child=spawn(process.execPath,[path.join(__dirname,"../server/main.cjs")],{env,stdio:["ignore","pipe","pipe"],windowsHide:true});
  t.after(async()=>{
    if(child.exitCode===null){const ended=once(child,"exit");child.kill();await ended;}
    const resolved=fs.realpathSync(dir);
    if(path.dirname(resolved)!==parent || !path.basename(resolved).startsWith("bbs-account-smoke-"))throw Error("Unexpected cleanup path");
    fs.rmSync(resolved,{recursive:true,force:true});
  });
  const port=await new Promise((resolve,reject)=>{let output="";const timer=setTimeout(()=>reject(Error("Server did not start")),5000);child.once("error",e=>{clearTimeout(timer);reject(e);});child.stdout.on("data",chunk=>{output+=chunk;const match=/127\.0\.0\.1:(\d+)/.exec(output);if(match){clearTimeout(timer);resolve(match[1]);}});child.once("exit",()=>{clearTimeout(timer);reject(Error("Server exited before startup"));});});
  const base=`http://127.0.0.1:${port}`;
  const html=await(await fetch(base+"/bbs-flash.html")).text();assert.match(html,/<meta name="bbs-account-api" content="\/api\/"/);
  const response=await fetch(base+"/api/account"),account=await response.json();assert.equal(account.authEnabled,false);assert.equal(account.checkoutEnabled,false);assert.equal(account.user,null);assert.equal(response.headers.get("cache-control"),"no-store");
  for(const file of ["/.env","/server/.env","/server/main.cjs","/accounts.sqlite","/.git/config","/node_modules/nodemailer/package.json"])assert.equal((await fetch(base+file)).status,404,file);
  assert.equal((await fetch(base+"/src/account.js")).status,200);
});
