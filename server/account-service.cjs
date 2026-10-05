/* Optional email account API. No UART, profile upload or payment processing. */
"use strict";
const {DatabaseSync} = require("node:sqlite");
const {randomBytes, randomInt, createHmac, timingSafeEqual} = require("node:crypto");
const model = require("../src/account-model.js");
const HOUR = 3600000, CODE_TTL = 10 * 60000, SESSION_TTL = 7 * 24 * HOUR;
const fail = (code, status = 400) => Object.assign(new Error(code), {code, status});
function createAccountService({filename, origin, secret, sendCode = null, privacyUrl = null, now = Date.now}) {
  const site = new URL(origin);
  if (site.origin !== origin || (site.protocol !== "https:" && !(site.protocol === "http:" && ["127.0.0.1", "localhost"].includes(site.hostname)))) throw Error("HTTPS_OR_LOOPBACK_REQUIRED");
  if (typeof secret !== "string" || secret.length < 32) throw Error("ACCOUNT_SECRET_REQUIRED");
  if (privacyUrl && new URL(privacyUrl, origin).origin !== origin) throw Error("PRIVACY_MUST_BE_SAME_ORIGIN");
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, created INTEGER NOT NULL, profile TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, privacy_version TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY, email TEXT NOT NULL, digest TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), provider_id TEXT UNIQUE, amount_kopecks INTEGER NOT NULL CHECK(amount_kopecks>0), currency TEXT NOT NULL CHECK(currency='RUB'), status TEXT NOT NULL CHECK(status IN ('pending','succeeded','canceled','refunded')), created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS entitlements(user_id TEXT PRIMARY KEY REFERENCES users(id), order_id TEXT UNIQUE NOT NULL REFERENCES orders(id));`);
  const hash = text => createHmac("sha256", secret).update(text).digest("hex");
  const token = () => randomBytes(32).toString("hex");
  const secure = site.protocol === "https:";
  const cookieName = secure ? "__Host-bbs-session" : "bbs-session-dev";
  const cookie = (value, maxAge) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
  const privacyVersion = "account-v1";
  const authEnabled = !!sendCode && !!privacyUrl;
  function clean() {
    for (const table of ["sessions", "challenges", "limits"]) db.prepare(`DELETE FROM ${table} WHERE expires <= ?`).run(now());
  }
  function limit(key, count, ms) {
    key = hash("limit:" + key);
    const row = db.prepare("SELECT * FROM limits WHERE key=?").get(key);
    if (row && row.expires > now() && row.count >= count) throw fail("RATE_LIMIT", 429);
    if (!row || row.expires <= now()) db.prepare("INSERT OR REPLACE INTO limits VALUES(?,1,?)").run(key, now() + ms);
    else db.prepare("UPDATE limits SET count=count+1 WHERE key=?").run(key);
  }
  function userFor(req) {
    const value = (req.headers.cookie || "").split(";").map(s => s.trim()).find(s => s.startsWith(cookieName + "="))?.slice(cookieName.length + 1);
    if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
    return db.prepare("SELECT users.*, sessions.digest AS session_digest FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.digest=? AND sessions.expires>?").get(hash("session:" + value), now()) || null;
  }
  function view(user) {
    if (!user) return {user: null, access: {status: "guest", expiresAt: null}, orders: []};
    const paid = db.prepare("SELECT 1 FROM entitlements JOIN orders ON orders.id=entitlements.order_id WHERE entitlements.user_id=? AND orders.user_id=? AND orders.status='succeeded'").get(user.id, user.id);
    const orders = db.prepare("SELECT id,amount_kopecks AS amountKopecks,currency,status,created FROM orders WHERE user_id=? ORDER BY created DESC").all(user.id);
    return {user: {email:user.email, profile:JSON.parse(user.profile), revision:user.revision}, access: {status:paid ? "active" : "none", expiresAt:null}, orders};
  }
  async function body(req) {
    if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) throw fail("CONTENT_TYPE", 415);
    let size = 0, parts = [];
    for await (const part of req) { size += part.length; if (size > 8192) throw fail("BODY_TOO_LARGE", 413); parts.push(part); }
    try { const data = JSON.parse(Buffer.concat(parts).toString()); if (!data || typeof data !== "object" || Array.isArray(data)) throw Error(); return data; }
    catch { throw fail("JSON"); }
  }
  function json(res, status, data, headers = {}) {
    res.writeHead(status, {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff", ...headers});
    res.end(JSON.stringify(data));
  }
  async function handle(req, res) {
    try {
      const route = new URL(req.url, origin).pathname;
      if (req.method === "GET" && route === "/api/account") {
        return json(res,200,{...view(userFor(req)), authEnabled, checkoutEnabled:false, privacyUrl, privacyVersion, product:{id:"personal-lifetime", billing:"one_time", scope:"user", expiresAt:null, priceKopecks:null}});
      }
      if (req.method !== "POST") throw fail("NOT_FOUND",404);
      // Origin is checked even for login/logout: no cross-site account replacement.
      if (req.headers.origin !== origin || req.headers["sec-fetch-site"] === "cross-site") throw fail("ORIGIN",403);
      const data = await body(req); clean();
      if (route === "/api/auth/request") {
        if (!authEnabled) throw fail("AUTH_UNAVAILABLE",503);
        const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
        if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/i.test(email)) throw fail("EMAIL");
        if (data.privacyVersion !== privacyVersion) throw fail("CONSENT");
        // Proxy headers are deliberately ignored. Configure edge limits as well.
        limit("ip:" + req.socket.remoteAddress, 20, HOUR);
        limit("email-hour:" + email, 5, HOUR); limit("email-minute:" + email, 1, 60000);
        const id = token(), code = String(randomInt(0,1000000)).padStart(6,"0");
        db.prepare("DELETE FROM challenges WHERE email=?").run(email);
        db.prepare("INSERT INTO challenges(id,email,digest,expires) VALUES(?,?,?,?)").run(id,email,hash(id + ":" + code),now()+CODE_TTL);
        try { await sendCode(email, code); }
        catch { db.prepare("DELETE FROM challenges WHERE id=?").run(id); throw fail("MAIL_UNAVAILABLE",503); }
        return json(res,200,{challenge:id, expiresIn:600});
      }
      if (route === "/api/auth/verify") {
        if (!authEnabled) throw fail("AUTH_UNAVAILABLE",503);
        limit("verify:" + req.socket.remoteAddress, 60, HOUR);
        if (typeof data.challenge !== "string" || !/^[a-f0-9]{64}$/.test(data.challenge) || typeof data.code !== "string" || !/^\d{6}$/.test(data.code)) throw fail("CODE",401);
        const row = db.prepare("SELECT * FROM challenges WHERE id=? AND expires>?").get(data.challenge, now());
        if (!row || row.attempts >= 5) throw fail("CODE",401);
        db.prepare("UPDATE challenges SET attempts=attempts+1 WHERE id=?").run(row.id);
        if (!timingSafeEqual(Buffer.from(row.digest,"hex"),Buffer.from(hash(row.id + ":" + data.code),"hex"))) throw fail("CODE",401);
        const session = token();
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("DELETE FROM challenges WHERE id=?").run(row.id);
          db.prepare("INSERT OR IGNORE INTO users(id,email,created,profile,privacy_version) VALUES(?,?,?,?,?)").run(token(),row.email,now(),JSON.stringify(model.empty()),privacyVersion);
          const user = db.prepare("SELECT * FROM users WHERE email=?").get(row.email);
          const old = userFor(req);
          if (old) db.prepare("DELETE FROM sessions WHERE digest=?").run(old.session_digest);
          db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(hash("session:" + session),user.id,now()+SESSION_TTL);
          db.exec("COMMIT");
          return json(res,200,view(user),{"Set-Cookie":cookie(session, SESSION_TTL/1000)});
        } catch (error) { db.exec("ROLLBACK"); throw error; }
      }
      if (route === "/api/auth/logout") {
        const user = userFor(req);
        if (user) db.prepare("DELETE FROM sessions WHERE digest=?").run(user.session_digest);
        return json(res,200,{ok:true},{"Set-Cookie":cookie("",0)});
      }
      const user = userFor(req);
      if (!user) throw fail("SESSION",401);
      if (route === "/api/profile") {
        let profile;
        try { profile = model.profile(data.profile); } catch { throw fail("PROFILE"); }
        if (!Number.isInteger(data.revision) || data.revision !== user.revision) throw fail("CONFLICT",409);
        db.prepare("UPDATE users SET profile=?,revision=revision+1 WHERE id=?").run(JSON.stringify(profile),user.id);
        return json(res,200,view(db.prepare("SELECT * FROM users WHERE id=?").get(user.id)));
      }
      // A browser flag, demo screen or return URL can never grant paid access.
      if (route === "/api/checkout") throw fail("CHECKOUT_UNAVAILABLE",503);
      throw fail("NOT_FOUND",404);
    } catch (error) { json(res,error.status || 500,{error:error.code || "UNAVAILABLE"},error.status===429 ? {"Retry-After":"60"} : {}); }
  }
  return {handle,close:()=>db.close()};
}
module.exports = {createAccountService};
