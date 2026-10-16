"use strict";
const http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const {createAccountService} = require("./account-service.cjs");
const env = process.env, origin = env.BBS_ORIGIN;
if (!origin || !env.BBS_ACCOUNT_DB || !env.BBS_ACCOUNT_SECRET) throw Error("Configure BBS_ORIGIN, BBS_ACCOUNT_DB and BBS_ACCOUNT_SECRET");
const root = path.resolve(__dirname,".."), filename = path.resolve(env.BBS_ACCOUNT_DB);
const relative = path.relative(root,filename);
if (!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative)) throw Error("Keep account database outside the public checkout");
process.umask(0o077);
fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
const mailReady = ["SMTP_HOST","SMTP_USER","SMTP_PASSWORD","SMTP_FROM"].every(key=>env[key]);
let sendCode = null;
if (mailReady) {
  const port = Number(env.SMTP_PORT || 465);
  if (![465,587].includes(port)) throw Error("Use SMTP TLS on port 465 or STARTTLS on 587");
  const transport = require("nodemailer").createTransport({host:env.SMTP_HOST,port,secure:port===465,requireTLS:true,
    auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},tls:{minVersion:"TLSv1.2"},
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
    disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
  sendCode = async (email, code) => {
    await transport.sendMail({from:env.SMTP_FROM,to:email,subject:"BBS Flash — код входа / sign-in code",
      text:`Код входа в BBS Flash: ${code}\nДействует 10 минут. Не передавайте его другим. Если вы не запрашивали вход, проигнорируйте письмо.\n\nBBS Flash sign-in code: ${code}\nValid for 10 minutes. Do not share it. Ignore this email if you did not request it.`});
  };
}
const accounts = createAccountService({filename,origin,secret:env.BBS_ACCOUNT_SECRET,privacyUrl:env.BBS_PRIVACY_URL || null,sendCode});
const files = new Set(["index.html","bbs-flash.html","landing.html","privacy.html","terms.html","assets/icon.svg","assets/RussoOne-Regular.ttf","assets/OFL-RussoOne.txt","assets/BBSTool.zip"]);
const types = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".ttf":"font/ttf",".txt":"text/plain; charset=utf-8",".zip":"application/zip"};
const server = http.createServer(async (req,res)=>{
  let pathname;
  try { pathname = new URL(req.url,origin).pathname; } catch { res.writeHead(400).end(); return; }
  if (pathname.startsWith("/api/")) return accounts.handle(req,res);
  const file = pathname.slice(1) || "index.html";
  if (!["GET","HEAD"].includes(req.method) || (!files.has(file) && !/^src\/[a-z0-9-]+\.(?:js|css)$/.test(file))) { res.writeHead(404).end(); return; }
  try {
    let data = await fs.promises.readFile(path.join(root,file));
    if (file.endsWith(".html")) data = Buffer.from(data.toString().replace('<meta name="bbs-account-api" content="" />','<meta name="bbs-account-api" content="/api/" />'));
    res.writeHead(200,{"Content-Type":types[path.extname(file)],"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"same-origin","X-Frame-Options":"DENY"});
    res.end(req.method==="HEAD"?undefined:data);
  } catch { res.writeHead(404).end(); }
});
server.requestTimeout=20000; server.headersTimeout=10000;
server.listen(Number(env.BBS_PORT || 8787),"127.0.0.1",()=>console.log(`BBS Flash account service on 127.0.0.1:${server.address().port}. Checkout disabled.`));
for (const signal of ["SIGINT","SIGTERM"]) process.on(signal,()=>server.close(()=>{accounts.close();process.exit(0);}));
