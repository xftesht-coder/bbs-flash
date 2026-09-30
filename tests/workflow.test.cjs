const {test} = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js");
const R = require("../src/ride-profiles.js");
const {FakePort, profile, frames, checksumFrame} = require("./helpers.cjs");
const captures = require("./fixtures/legacy-rx.json");
const parse = s => s.split(" ").map(b => parseInt(b, 16));
const writes = port => port.sent.filter(f => f[0] === 22);
async function open(t) {
  const port = new FakePort(), session = new C.SerialSession(port, {timeout:150});
  await session.open();
  t.after(() => session.close());
  return {port, session};
}
function options(session, overrides = {}) {
  const target = C.clone(profile); target.bas.LC = 17;
  return {session, target, benchEnabled:true, saveBackup:async () => {}, confirm:async () => true, ...overrides};
}
test("connect/raw read cannot grant write permission or bypass the workflow", async t => {
  const {port, session} = await open(t);
  await session.readAll();
  assert.equal(C.isWriteReady(session), false);
  await assert.rejects(C.safeWrite(options(session)), /READ_REQUIRED/);
  await assert.rejects(session.request(82, "write", profile), /WRITE_GUARD/);
  assert.equal(writes(port).length, 0);
});
test("READ → BACKUP completes before editing baseline is exposed; disconnect revokes it", async t => {
  const {port, session} = await open(t);
  let persisted = false;
  const snapshot = await C.readAndBackup({session, saveBackup:async snap => {
    assert.equal(C.isWriteReady(session), false);
    assert.deepEqual(port.sent.map(f => f[1]), [81,82,83,84,82,83,84]);
    assert.deepEqual(C.fromEl(snap.el), profile);
    // Callback and caller get copies, not the trusted baseline object.
    snap.raw.bas[3] = 1;
    persisted = true;
  }});
  assert.ok(persisted && C.isWriteReady(session));
  snapshot.raw.bas[3] = 1;
  snapshot.profile.bas.LC = 1;
  const result = await C.safeWrite(options(session));
  assert.equal(result.status, "written");
  await session.close();
  assert.equal(C.isWriteReady(session), false);
  await session.open();
  assert.equal(C.isWriteReady(session), false);
  await assert.rejects(C.safeWrite(options(session)), /READ_REQUIRED/);
});
test("storage failure or unstable initial read never establishes an editing baseline", async t => {
  for (const mode of ["storage", "unstable"]) {
    const {port, session} = await open(t);
    let basicReads = 0, backupCalls = 0;
    port.intercept = (sent, reply) => {
      if (mode === "unstable" && sent[1] === 82 && ++basicReads === 2) {
        const b = reply.slice(0,-1); b[3] = 17; return checksumFrame(b);
      }
      return reply;
    };
    await assert.rejects(C.readAndBackup({session, saveBackup:async () => {
      backupCalls++; throw Error("STORAGE");
    }}), /STORAGE|UNSTABLE_READ/);
    if (mode === "unstable") assert.equal(backupCalls, 0);
    assert.equal(C.isWriteReady(session), false);
    await assert.rejects(C.safeWrite(options(session)), /READ_REQUIRED/);
    assert.equal(writes(port).length, 0);
  }
});
test("controller changes during EDIT cannot be blessed by taking a new backup at WRITE", async t => {
  const {port, session} = await open(t);
  await C.readAndBackup({session, saveBackup:async () => {}});
  const changed = frames[82].slice(0,-1); changed[3] = 16;
  port.frames[82] = checksumFrame(changed);
  let confirmed = false, backedUp = false;
  await assert.rejects(C.safeWrite(options(session, {
    saveBackup:async () => {backedUp = true;},
    confirm:async () => {confirmed = true; return true;},
  })), /STALE_BACKUP/);
  assert.equal(backedUp, false);
  assert.equal(confirmed, false);
  assert.equal(C.isWriteReady(session), false);
  assert.equal(writes(port).length, 0);
});
test("missing confirmation and callback mutations cannot authorize a different write", async t => {
  const {port, session} = await open(t);
  await C.readAndBackup({session, saveBackup:async () => {}});
  await assert.rejects(C.safeWrite(options(session, {confirm:null})), /CONFIRM_REQUIRED/);
  const result = await C.safeWrite(options(session, {confirm:async preview => {
    preview.target.bas.LC = 25;
    preview.snapshot.raw.bas[3] = 25;
    await assert.rejects(session.request(82,"write",preview.target), /WRITE_GUARD/);
    return true;
  }}));
  assert.equal(result.profile.bas.LC, 17);
  assert.equal(writes(port).length, 1);
});
test("owner's complete read survives Penoff roundtrip and Full ahead write/verify in replay", async t => {
  const port = new FakePort(); port.readChecksum = "legacy";
  port.frames = {
    81:require("./fixtures/szz9-general-capture.json").chunks.flat(),
    82:parse(captures.ownerBasic), 83:parse(captures.ownerPAS), 84:parse(captures.ownerThrottle),
  };
  const session = new C.SerialSession(port); t.after(() => session.close()); await session.open();
  const original = await C.readAndBackup({session, saveBackup:async snap => {
    assert.deepEqual(C.fromEl(snap.el), snap.profile);
  }});
  const target = R.apply(original.profile, "forward");
  const result = await C.safeWrite(options(session,{target}));
  assert.equal(result.status,"written");
  assert.deepEqual(writes(port).map(f=>f[1]),[82,83]);
  assert.equal(result.profile.bas.LC,24);
  assert.equal(result.profile.bas.LBP,40);
  assert.deepEqual(result.profile.thr, original.profile.thr);
  assert.ok(C.isWriteReady(session));
  // A second write starts from the verified result, not the original motor data.
  const unchanged = await C.safeWrite(options(session,{target}));
  assert.equal(unchanged.status,"unchanged");
  assert.equal(writes(port).length,2);
});
