const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const C = require("../src/core.js"),
  { profile, frames, FakePort, checksumFrame } = require("./helpers.cjs");
const copy = () => structuredClone(profile);
test("fixed reference frames decode, with independent write golden vectors", () => {
  for (const block of [81, 82, 83, 84])
    assert.deepEqual(C.checkFrame(frames[block], block), frames[block]);
  assert.deepEqual(
    C.writeFrame(83, profile),
    [22, 83, 11, 3, 255, 255, 10, 4, 4, 255, 25, 8, 0, 60, 205],
  );
  assert.deepEqual(C.writeFrame(82, profile), [22, ...frames[82]]);
  assert.deepEqual(C.writeFrame(84, profile), [22, ...frames[84]]);
  assert.deepEqual(C.readFrame(81), [17, 81, 4, 176, 5]);
  for (const b of [82, 83, 84])
    assert.deepEqual(C.decode(b, frames[b]), profile[C.KEYS[b]]);
});
test("reject every single-byte corruption in every fixed frame", () => {
  for (const b of [81, 82, 83, 84])
    for (let i = 0; i < frames[b].length; i++) {
      const damaged = [...frames[b]];
      damaged[i] ^= 1;
      assert.throws(() => C.decode(b, damaged));
    }
});
test("reject truncation, extension, wrong block and invalid sensor / wheel", () => {
  assert.throws(() => C.decode(81, frames[81].slice(0, -1)));
  assert.throws(() => C.decode(82, [...frames[82], 0]));
  assert.throws(() => C.decode(83, frames[82]));
  assert.throws(() => C.wheelDecode(53));
  assert.equal(C.wheelDecode(55), 12);
  assert.equal(C.wheelEncode(12), 55);
  const wrong = frames[82].slice(0, -1);
  wrong[25] = 129;
  assert.throws(() => C.decode(82, checksumFrame(wrong)), /SENSOR/);
});
test("all numeric boundaries reject NaN, negatives, fractions and overflow before serialization", () => {
  for (const [part, key, values] of [
    ["bas", "LC", [NaN, 0, 31, 20.5]],
    ["bas", "LBP", [NaN, 17, 56]],
    ["pas", "SC", [0, 101, Infinity]],
    ["pas", "SSM", [0, 9]],
    ["pas", "SL", [14, 41]],
    ["pas", "WM", [0, 9, 81]],
    ["thr", "SV", [-1, 51]],
  ])
    for (const value of values) {
      const p = copy();
      p[part][key] = value;
      assert.throws(
        () => C.writeFrame(82, p),
        undefined,
        `${part}.${key}=${value}`,
      );
    }
  const p = copy();
  p.bas.ALC[3] = -1;
  assert.throws(() => C.writeFrame(82, p));
  p.bas.ALC[3] = 100;
  p.thr.SV = 35;
  assert.throws(() => C.validate(p), /THROTTLE_RANGE/);
});
test("General current and voltage are binding; unknown devices do not inherit BBS02", () => {
  const dev = C.decode(81, frames[81]);
  assert.equal(C.identify(dev), "BBS02");
  assert.equal(C.identify({ ...dev, model: "ZZZZ" }), null);
  assert.equal(C.identify({ ...dev, fw: "2.0.1.2" }), null);
  const p = copy();
  p.bas.LC = 24;
  assert.throws(
    () => C.validate(p, { ...dev, maxCurrent: 18 }, "BBS02"),
    /CURRENT/,
  );
  p.bas.LC = 18;
  p.bas.LBP = 32;
  assert.throws(() => C.validate(p, dev), /VALUE/);
  p.bas.LBP = 41;
  p.bas.LC = 19;
  assert.throws(() => C.validate(p, null, "BBS01"), /CURRENT/);
});
test("Penoff fixture imports combo indices using expected independent values", () => {
  const text = fs.readFileSync(
      __dirname + "/fixtures/penoff-default.el",
      "utf8",
    ),
    p = C.fromEl(text);
  assert.equal(p.pas.SSM, 6);
  assert.equal(p.pas.WM, 10);
  assert.equal(p.pas.SL, 255);
  assert.equal(p.thr.SL, 17);
  assert.equal(p.thr.DA, 3);
  assert.equal(p.pas.SC, 100);
  assert.equal(
    C.toEl(p).trim().replace(/\r/g, ""),
    text.trim().replace(/\r/g, ""),
  );
});
test(".el roundtrips all dropdown edges and validates instead of defaulting missing values", () => {
  for (const sl of [255, 15, 40])
    for (const ssm of [1, 8])
      for (const wm of [null, 10, 80]) {
        const p = copy();
        p.pas.SL = p.thr.SL = sl;
        p.pas.SSM = ssm;
        p.pas.WM = wm;
        assert.deepEqual(C.fromEl(C.toEl(p)), p);
      }
  const text = C.toEl(profile);
  for (const bad of [
    text.replace("LC=18", "LC=NaN"),
    text.replace("LC=18", "LC=18\nLC=18"),
    text.replace("SMS=1", ""),
    text.replace("SSM=3", "SSM=8"),
    text + "[__proto__]\na=1",
    text.replace("SC=10", "SC=-1"),
  ])
    assert.throws(() => C.fromEl(bad));
});
test("presets preserve hardware, throttle, assist designations and do not raise total current", () => {
  const original = copy();
  original.bas.LBP = 40;
  original.bas.WD = 5;
  original.bas.SMSig = 6;
  original.pas.SL = 25;
  original.thr.EV = 42;
  original.pas.TS = 40;
  const aggressive = copy();
  aggressive.bas.LC = 25;
  aggressive.bas.LBP = 32;
  aggressive.bas.WD = 1;
  aggressive.thr.EV = 35;
  aggressive.pas.TS = 10;
  const p = C.ridingPreset(original, aggressive);
  assert.equal(p.bas.LC, 18);
  assert.equal(p.bas.LBP, 40);
  assert.equal(p.bas.WD, 5);
  assert.equal(p.bas.SMSig, 6);
  assert.equal(p.pas.SL, 25);
  assert.equal(p.pas.TS, 40);
  assert.deepEqual(p.thr, original.thr);
});
const scenario = {
  mass: 115,
  volt: 45,
  eta: 85,
  grade: 8,
  chainring: 32,
  cog: 11,
  circumference: 2.194,
  rpm: 120,
  displayLimit: 40,
  crr: 0.012,
  cda: 0.65,
};
test("gear ratios, m/s conversion, row current and BBSHD 30 A", () => {
  assert.ok(Math.abs(C.gearLimit(scenario) - 45.953) < 0.01);
  assert.equal(
    C.gearLimit({ ...scenario, chainring: 64 }),
    C.gearLimit(scenario) * 2,
  );
  assert.equal(
    C.gearLimit({ ...scenario, cog: 22 }),
    C.gearLimit(scenario) / 2,
  );
  assert.ok(Math.abs(C.cadence(C.gearLimit(scenario), scenario) - 120) < 1e-9);
  const p = copy();
  p.bas.LC = 30;
  assert.equal(C.profileRows(p, scenario)[9].currentA, 30);
  assert.equal(C.profileRows(p, scenario)[1].currentA, 4.5);
  assert.equal(C.profileRows(p, scenario)[1].thermalRisk, false);
  assert.equal(C.profileRows(p, scenario)[0].flatKmh, 0);
});
test("range respects selected PAS, electrical/mechanical losses, zero battery and hill fraction", () => {
  const opts = { ah: 10, grade: 8, hillShare: 0.35, level: 9 };
  const p = copy();
  const full = C.rangeEstimate(p, scenario, opts);
  assert.equal(full.availableWh, 382.5);
  assert.equal(C.rangeEstimate(p, scenario, { ...opts, ah: 0 }).km, 0);
  assert.equal(C.rangeEstimate(p, scenario, { ...opts, level: 0 }).km, null);
  assert.notEqual(
    C.rangeEstimate(p, scenario, { ...opts, level: 2 }).km,
    full.km,
  );
  assert.ok(
    C.rangeEstimate(p, scenario, { ...opts, hillShare: 0 }).km >
      C.rangeEstimate(p, scenario, { ...opts, hillShare: 1 }).km,
  );
  const speed = C.profileRows(p, scenario)[9].flatKmh;
  assert.ok(
    Math.abs(
      C.rangeEstimate(p, scenario, { ...opts, hillShare: 0 }).whKm -
        C.wattsAt(speed, scenario, 0) / 0.85 / speed,
    ) < 1e-9,
  );
  assert.throws(() => C.rangeEstimate(p, { ...scenario, mass: NaN }, opts));
});
async function opened(options = {}) {
  const port = new FakePort();
  Object.assign(port, options);
  const session = new C.SerialSession(port, { timeout: 150 });
  await session.open();
  return { port, session };
}
test("transport uses 1200 8N1; fragmented read frames are assembled and no command crosses transactions", async () => {
  const { port, session } = await opened();
  assert.deepEqual(port.options, {
    baudRate: 1200,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    flowControl: "none",
  });
  port.intercept = (sent, reply, p) => {
    p.emit(reply.slice(0, 1));
    p.emit(reply.slice(1, 5));
    p.emit(reply.slice(5));
    return null;
  };
  const read = await session.exclusive(() => session.readAll());
  assert.deepEqual(read.profile, profile);
  await session.close();
});
test("timeout, malformed frame and disconnect invalidate identity and reject pending operation", async () => {
  for (const mode of ["timeout", "checksum", "wrong", "disconnect"]) {
    const { port, session } = await opened();
    port.intercept = (sent, reply, p) => {
      if (mode === "disconnect") {
        queueMicrotask(() => p.disconnect());
        return null;
      }
      if (mode === "timeout") return null;
      const changed = [...reply];
      if (mode === "wrong") changed[0] = 84;
      else changed[changed.length - 1] ^= 1;
      return changed;
    };
    await assert.rejects(session.request(82, "read"));
    assert.equal(session.closed, true);
    assert.equal(session.device, null);
    assert.equal(session.id, null);
    await session.close();
  }
});
function target() {
  const p = copy();
  p.bas.LC = 17;
  p.pas.KC = 55;
  p.thr.SC = 8;
  return p;
}
test("all write entry paths back up actual controller, confirm, write selected blocks and read back", async () => {
  for (const blocks of [[82], [83], [84], [82, 83, 84]])
    for (const ack3 of [false, true]) {
      const { port, session } = await opened({ ack3 });
      const order = [];
      const result = await C.safeWrite({
        session,
        target: target(),
        blocks,
        benchEnabled: true,
        saveBackup: async (snap) => {
          order.push("backup");
          assert.deepEqual(snap.profile, profile);
          assert.deepEqual(C.fromEl(snap.el), profile);
          assert.equal(port.sent.filter((f) => f[0] === 22).length, 0);
        },
        confirm: async () => {
          order.push("confirm");
          assert.equal(port.sent.filter((f) => f[0] === 22).length, 0);
          return true;
        },
      });
      assert.equal(result.status, "written");
      assert.deepEqual(order, ["backup", "confirm"]);
      assert.deepEqual(
        port.sent.filter((f) => f[0] === 22).map((f) => f[1]),
        blocks,
      );
      assert.ok(port.sent.at(-1)[0] === 17);
      await session.close();
    }
});
test("failed storage, cancellation, no opt-in, invalid values and low stop delay never transmit writes", async () => {
  for (const mode of [
    "storage",
    "cancel",
    "optin",
    "invalid",
    "stop",
    "start",
  ]) {
    const { port, session } = await opened();
    const draft = target();
    if (mode === "invalid") draft.bas.LC = 26;
    if (mode === "stop") draft.pas.TS = 10;
    if (mode === "start") draft.pas.SC = 50;
    const action = C.safeWrite({
      session,
      target: draft,
      benchEnabled: mode !== "optin",
      saveBackup: async () => {
        if (mode === "storage") throw new Error("STORAGE");
      },
      confirm: async () => mode !== "cancel",
    });
    if (mode === "cancel") assert.equal((await action).status, "cancelled");
    else await assert.rejects(action);
    assert.equal(port.sent.filter((f) => f[0] === 22).length, 0);
    await session.close();
  }
});
test("unknown firmware cannot write even with explicit opt-in", async () => {
  const { port, session } = await opened();
  session.device.fw = "9.9.9.9";
  await assert.rejects(
    C.safeWrite({
      session,
      target: target(),
      benchEnabled: true,
      saveBackup: async () => {},
      confirm: async () => true,
    }),
    /UNKNOWN_DEVICE/,
  );
  assert.equal(port.sent.filter((f) => f[0] === 22).length, 0);
  await session.close();
});
test("changed controller after confirmation aborts without a write", async () => {
  const { port, session } = await opened();
  await assert.rejects(
    C.safeWrite({
      session,
      target: target(),
      benchEnabled: true,
      saveBackup: async () => {},
      confirm: async () => {
        const changed = port.frames[82].slice(0, -1);
        changed[3] = 16;
        port.frames[82] = checksumFrame(changed);
        return true;
      },
    }),
    /STALE_BACKUP/,
  );
  assert.equal(port.sent.filter((f) => f[0] === 22).length, 0);
  await session.close();
});
test("concurrent writes are rejected and no second backup/dialog interleaves", async () => {
  const { port, session } = await opened();
  let release;
  const pause = new Promise((r) => (release = r));
  let entered;
  const ready = new Promise((r) => (entered = r));
  const first = C.safeWrite({
    session,
    target: target(),
    benchEnabled: true,
    saveBackup: async () => {},
    confirm: async () => {
      entered();
      await pause;
      return false;
    },
  });
  await ready;
  await assert.rejects(
    C.safeWrite({
      session,
      target: target(),
      benchEnabled: true,
      saveBackup: async () => {
        throw Error("interleaved");
      },
      confirm: async () => true,
    }),
    /BUSY/,
  );
  release();
  await first;
  assert.equal(port.sent.filter((f) => f[0] === 22).length, 0);
  await session.close();
});
test("ACK success without persistence fails readback and stops subsequent blocks", async () => {
  const { port, session } = await opened();
  port.intercept = (sent, reply, p) => {
    if (sent[0] === 22) p.frames[sent[1]] = frames[sent[1]];
    return reply;
  };
  let failure;
  try {
    await C.safeWrite({
      session,
      target: target(),
      benchEnabled: true,
      saveBackup: async () => {},
      confirm: async () => true,
    });
  } catch (e) {
    failure = e;
  }
  assert.equal(failure.code, "VERIFY");
  assert.equal(failure.attempted, 82);
  assert.deepEqual(failure.written, [82]);
  assert.deepEqual(
    port.sent.filter((f) => f[0] === 22).map((f) => f[1]),
    [82],
  );
  await session.close();
});
test("rejected, malformed or timed-out ACK stops without retry", async () => {
  for (const mode of ["negative", "checksum", "wrong", "timeout"]) {
    const { port, session } = await opened();
    port.intercept = (sent, reply) => {
      if (sent[0] !== 22) return reply;
      return mode === "negative"
        ? [82, 1]
        : mode === "wrong"
          ? [83, 24]
          : mode === "checksum"
            ? [82, 24, 0]
            : null;
    };
    await assert.rejects(
      C.safeWrite({
        session,
        target: target(),
        benchEnabled: true,
        saveBackup: async () => {},
        confirm: async () => true,
      }),
    );
    assert.equal(port.sent.filter((f) => f[0] === 22).length, 1);
    await session.close();
  }
});
test("semantic equality ignores imported property ordering", () => {
  const reordered = { thr: profile.thr, pas: profile.pas, bas: profile.bas };
  assert.ok(C.eq(profile, reordered));
});
