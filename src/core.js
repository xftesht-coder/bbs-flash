/* BBS Flash 3.1.0. No browser dependencies: shared by the app and node:test.
 * Protocol sources: docs/PROTOCOL.md. Settings only, not firmware flashing.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BBSCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const BLOCK = { GEN: 81, BAS: 82, PAS: 83, THR: 84 };
  const LENGTH = { 81: 16, 82: 24, 83: 11, 84: 6 };
  const KEYS = { 82: "bas", 83: "pas", 84: "thr" };
  const WHEELS = [
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    "700C",
    28,
    29,
    30,
  ];
  const MODELS = {
    BBS01: { maxAmps: 18, maxRpm: 90 },
    BBS02: { maxAmps: 25, maxRpm: 120 },
    BBSHD: { maxAmps: 30, maxRpm: 140 },
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const sum = (bytes) => bytes.reduce((n, b) => n + b, 0) & 255;
  const canonical = (x) =>
    Array.isArray(x)
      ? x.map(canonical)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.keys(x)
              .sort()
              .map((k) => [k, canonical(x[k])]),
          )
        : x;
  const eq = (a, b) =>
    JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  class Fault extends Error {
    constructor(code, detail = "") {
      super(code + (detail ? ": " + detail : ""));
      this.code = code;
      this.detail = detail;
    }
  }
  function integer(v, min, max, path) {
    if (!Number.isInteger(v) || v < min || v > max)
      throw new Fault("VALUE", path);
    return v;
  }
  function choice(v, values, path) {
    if (!values.includes(v)) throw new Fault("VALUE", path);
    return v;
  }
  function lowBatteryRange(n) {
    return [
      [18, 22],
      [28, 32],
      [38, 43],
      [48, 55],
      [18, 43],
      [18, 55],
    ][n];
  }
  function validate(p, device = null, model = null) {
    if (!p || !p.bas || !p.pas || !p.thr) throw new Fault("PROFILE");
    const { bas: b, pas: a, thr: t } = p;
    integer(b.LBP, 18, 55, "bas.LBP");
    integer(b.LC, 1, 30, "bas.LC");
    integer(b.WD, 0, 15, "bas.WD");
    choice(b.SMType, [0, 1, 2], "bas.SMType");
    integer(b.SMSig, 1, 36, "bas.SMSig");
    for (const k of ["ALC", "ALBP"]) {
      if (!Array.isArray(b[k]) || b[k].length !== 10)
        throw new Fault("VALUE", "bas." + k);
      b[k].forEach((v, i) => integer(v, 0, 100, `bas.${k}.${i}`));
    }
    choice(a.PT, [0, 1, 2, 3], "pas.PT");
    choice(a.DA, [255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "pas.DA");
    choice(t.DA, [255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "thr.DA");
    for (const [path, v] of [
      ["pas.SL", a.SL],
      ["thr.SL", t.SL],
    ])
      if (v !== 255) integer(v, 15, 40, path);
    integer(a.SC, 1, 100, "pas.SC");
    integer(a.SSM, 1, 8, "pas.SSM");
    integer(a.SDN, 1, 20, "pas.SDN");
    if (a.WM !== null) integer(a.WM, 10, 80, "pas.WM");
    integer(a.TS, 0, 255, "pas.TS");
    integer(a.CD, 1, 8, "pas.CD");
    integer(a.SD, 0, 255, "pas.SD");
    integer(a.KC, 1, 100, "pas.KC");
    integer(t.SV, 0, 50, "thr.SV");
    integer(t.EV, 0, 50, "thr.EV");
    if (t.SV >= t.EV) throw new Fault("THROTTLE_RANGE");
    choice(t.MODE, [0, 1], "thr.MODE");
    integer(t.SC, 1, 100, "thr.SC");
    if (device) {
      integer(device.maxCurrent, 1, 30, "device.maxCurrent");
      const range = lowBatteryRange(device.nominalCode);
      if (!range) throw new Fault("DEVICE");
      integer(b.LBP, ...range, "bas.LBP");
      if (b.LC > device.maxCurrent)
        throw new Fault("CURRENT", String(device.maxCurrent));
    }
    if (model) {
      if (!MODELS[model]) throw new Fault("MODEL");
      if (b.LC > MODELS[model].maxAmps)
        throw new Fault("CURRENT", String(MODELS[model].maxAmps));
    }
    return p;
  }
  function wheelEncode(idx) {
    integer(idx, 0, 15, "bas.WD");
    return idx === 12 ? 55 : WHEELS[idx] * 2;
  }
  function wheelDecode(byte) {
    if (byte === 55) return 12;
    const idx = WHEELS.indexOf(byte / 2);
    if (idx < 0) throw new Fault("WHEEL", String(byte));
    return idx;
  }
  function payload(block, p) {
    const b = p.bas,
      a = p.pas,
      t = p.thr;
    switch (block) {
      case 82:
        return [
          b.LBP,
          b.LC,
          ...b.ALC,
          ...b.ALBP,
          wheelEncode(b.WD),
          (b.SMType === 2 ? 3 : b.SMType) * 64 + b.SMSig,
        ];
      case 83:
        return [
          a.PT,
          a.DA,
          a.SL,
          a.SC,
          a.SSM,
          a.SDN,
          a.WM === null ? 255 : a.WM,
          a.TS,
          a.CD,
          a.SD,
          a.KC,
        ];
      case 84:
        return [t.SV, t.EV, t.MODE, t.DA, t.SL, t.SC];
      default:
        throw new Fault("BLOCK");
    }
  }
  function writeFrame(block, p) {
    validate(p);
    const data = payload(block, p);
    data.forEach((v) => integer(v, 0, 255, "payload"));
    const frame = [22, block, data.length, ...data];
    return [...frame, sum(frame.slice(1))];
  }
  function readFrame(block) {
    if (!LENGTH[block]) throw new Fault("BLOCK");
    return block === 81 ? [17, 81, 4, 176, 5] : [17, block];
  }
  function checkFrame(frame, block) {
    if (
      frame.length !== LENGTH[block] + 3 ||
      frame[0] !== block ||
      frame[1] !== LENGTH[block]
    )
      throw new Fault("FRAME");
    if (sum(frame.slice(0, -1)) !== frame.at(-1)) throw new Fault("CHECKSUM");
    return frame;
  }
  function decode(block, frame) {
    checkFrame(frame, block);
    const d = frame.slice(2, -1);
    switch (block) {
      case 81: {
        const text = (i, n) => String.fromCharCode(...d.slice(i, i + n));
        if (!/^[\x20-\x7e]{14}$/.test(text(0, 14))) throw new Fault("DEVICE");
        integer(d[14], 0, 5, "device.voltage");
        integer(d[15], 1, 30, "device.maxCurrent");
        return {
          manufacturer: text(0, 4).trim(),
          model: text(4, 4).trim(),
          hw: text(8, 2).split("").join("."),
          fw: text(10, 4).split("").join("."),
          nominalCode: d[14],
          maxCurrent: d[15],
          raw: [...frame],
        };
      }
      case 82: {
        const type = d[23] >> 6;
        if (type === 2) throw new Fault("SENSOR");
        return {
          LBP: d[0],
          LC: d[1],
          ALC: d.slice(2, 12),
          ALBP: d.slice(12, 22),
          WD: wheelDecode(d[22]),
          SMType: type === 3 ? 2 : type,
          SMSig: d[23] & 63,
        };
      }
      case 83:
        return {
          PT: d[0],
          DA: d[1],
          SL: d[2],
          SC: d[3],
          SSM: d[4],
          SDN: d[5],
          WM: d[6] === 255 ? null : d[6],
          TS: d[7],
          CD: d[8],
          SD: d[9],
          KC: d[10],
        };
      case 84:
        return { SV: d[0], EV: d[1], MODE: d[2], DA: d[3], SL: d[4], SC: d[5] };
      default:
        throw new Fault("BLOCK");
    }
  }
  function identify(device) {
    // Project owner's documented controller. This is identification, NOT a claim
    // of bench qualification. Every write also requires explicit bench opt-in.
    return device &&
      device.manufacturer === "HZXT" &&
      device.model === "SZZ9" &&
      device.fw === "2.0.1.1" &&
      device.nominalCode === 2 &&
      device.maxCurrent <= 25
      ? "BBS02"
      : null;
  }
  function toEl(p) {
    validate(p);
    const { bas: b, pas: a, thr: t } = p;
    const s = [];
    const row = (k, v) => s.push(k + "=" + v);
    s.push("[Basic]");
    row("LBP", b.LBP);
    row("LC", b.LC);
    for (let i = 0; i < 10; i++) row("ALC" + i, b.ALC[i]);
    for (let i = 0; i < 10; i++) row("ALBP" + i, b.ALBP[i]);
    row("WD", b.WD);
    row("SMM", b.SMType);
    row("SMS", b.SMSig);
    s.push("", "[Pedal Assist]");
    for (const [k, v] of Object.entries({
      PT: a.PT,
      DA: a.DA === 255 ? 0 : a.DA + 1,
      SL: a.SL === 255 ? 0 : a.SL - 14,
      SC: a.SC,
      SSM: a.SSM - 1,
      SDN: a.SDN,
      WM: a.WM === null ? 0 : a.WM - 9,
      TS: a.TS,
      CD: a.CD,
      SD: a.SD,
      KC: a.KC,
    }))
      row(k, v);
    s.push("", "[Throttle Handle]");
    for (const [k, v] of Object.entries({
      SV: t.SV,
      EV: t.EV,
      MODE: t.MODE,
      DA: t.DA === 255 ? 0 : t.DA + 1,
      SL: t.SL === 255 ? 0 : t.SL - 14,
      SC: t.SC,
    }))
      row(k, v);
    return s.join("\r\n") + "\r\n";
  }
  function fromEl(text) {
    if (typeof text !== "string" || text.length > 65536)
      throw new Fault("PROFILE");
    const sections = Object.create(null);
    let target = null;
    for (let line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
      line = line.trim();
      if (!line || /^[;#]/.test(line)) continue;
      const section = line.match(/^\[(.+)\]$/);
      if (section) {
        if (
          !["Basic", "Pedal Assist", "Throttle Handle"].includes(section[1]) ||
          sections[section[1]]
        )
          throw new Fault("PROFILE");
        target = sections[section[1]] = Object.create(null);
        continue;
      }
      const m = line.match(/^([A-Za-z][A-Za-z0-9]*)\s*=\s*(-?\d+)$/);
      if (!target || !m || Object.hasOwn(target, m[1]))
        throw new Fault("PROFILE");
      target[m[1]] = Number(m[2]);
    }
    const b = sections.Basic,
      a = sections["Pedal Assist"],
      t = sections["Throttle Handle"];
    if (!b || !a || !t) throw new Fault("PROFILE");
    const keys = (obj, expected) => {
      if (
        Object.keys(obj).length !== expected.length ||
        expected.some((k) => !Object.hasOwn(obj, k))
      )
        throw new Fault("PROFILE");
    };
    keys(b, [
      "LBP",
      "LC",
      ...Array.from({ length: 10 }, (_, i) => "ALC" + i),
      ...Array.from({ length: 10 }, (_, i) => "ALBP" + i),
      "WD",
      "SMM",
      "SMS",
    ]);
    keys(a, [
      "PT",
      "DA",
      "SL",
      "SC",
      "SSM",
      "SDN",
      "WM",
      "TS",
      "CD",
      "SD",
      "KC",
    ]);
    keys(t, ["SV", "EV", "MODE", "DA", "SL", "SC"]);
    integer(a.SL, 0, 26, "pas.SL");
    integer(t.SL, 0, 26, "thr.SL");
    integer(a.SSM, 0, 7, "pas.SSM");
    integer(a.WM, 0, 71, "pas.WM");
    integer(a.DA, 0, 10, "pas.DA");
    integer(t.DA, 0, 10, "thr.DA");
    return validate({
      bas: {
        LBP: b.LBP,
        LC: b.LC,
        ALC: Array.from({ length: 10 }, (_, i) => b["ALC" + i]),
        ALBP: Array.from({ length: 10 }, (_, i) => b["ALBP" + i]),
        WD: b.WD,
        SMType: b.SMM,
        SMSig: b.SMS,
      },
      pas: {
        ...a,
        DA: a.DA === 0 ? 255 : a.DA - 1,
        SL: a.SL === 0 ? 255 : a.SL + 14,
        SSM: a.SSM + 1,
        WM: a.WM === 0 ? null : a.WM + 9,
      },
      thr: {
        ...t,
        DA: t.DA === 0 ? 255 : t.DA - 1,
        SL: t.SL === 0 ? 255 : t.SL + 14,
      },
    });
  }
  function ridingPreset(original, preset) {
    const p = clone(original);
    p.bas.LC = Math.min(original.bas.LC, preset.bas.LC);
    p.bas.ALC = [...preset.bas.ALC];
    p.bas.ALBP = [...preset.bas.ALBP];
    for (const k of ["SC", "SSM", "SDN", "CD", "SD", "KC"])
      p.pas[k] = preset.pas[k];
    p.pas.TS = Math.max(original.pas.TS, preset.pas.TS, 20);
    return validate(p);
  }
  function diff(before, after) {
    const changes = [];
    for (const part of ["bas", "pas", "thr"])
      for (const key of Object.keys(before[part])) {
        const a = before[part][key],
          b = after[part][key];
        if (Array.isArray(a)) {
          a.forEach((v, i) => {
            if (v !== b[i])
              changes.push({
                field: `${part}.${key}.${i}`,
                before: v,
                after: b[i],
              });
          });
        } else if (a !== b)
          changes.push({ field: `${part}.${key}`, before: a, after: b });
      }
    return changes;
  }
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  class SerialSession {
    constructor(
      port,
      { timeout = 5000, onLog = () => {}, onFault = () => {} } = {},
    ) {
      this.port = port;
      this.timeout = timeout;
      this.onLog = onLog;
      this.onFault = onFault;
      this.pending = null;
      this.buffer = [];
      this.closed = true;
      this.id = null;
      this.device = null;
      this.busy = false;
    }
    async open() {
      await this.port.open({
        baudRate: 1200,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
      });
      this.closed = false;
      this.id = Date.now() + "-" + Math.random().toString(36).slice(2);
      this.writer = this.port.writable.getWriter();
      this.reader = this.port.readable.getReader();
      this.loopPromise = this.loop();
      try {
        this.device = decode(81, await this.request(81, "read"));
        return this.device;
      } catch (e) {
        await this.close();
        throw e;
      }
    }
    async loop() {
      try {
        while (!this.closed) {
          const { value, done } = await this.reader.read();
          if (done) {
            if (!this.closed) this.fail(new Fault("DISCONNECTED"));
            break;
          }
          if (value) this.receive([...value]);
        }
      } catch (e) {
        if (!this.closed) this.fail(new Fault("DISCONNECTED", e.message));
      } finally {
        try {
          this.reader.releaseLock();
        } catch {}
      }
    }
    fail(error) {
      if (this.closed) return;
      this.closed = true;
      this.device = null;
      this.id = null;
      const p = this.pending;
      this.pending = null;
      this.buffer = [];
      if (p) {
        clearTimeout(p.timer);
        clearTimeout(p.ackTimer);
        p.reject(error);
      }
      this.onFault(error);
      void this.close();
    }
    receive(bytes) {
      this.onLog("RX", bytes);
      if (this.closed || !this.pending) return;
      this.buffer.push(...bytes);
      const p = this.pending;
      try {
        if (this.buffer[0] !== p.block) throw new Fault("UNEXPECTED_BLOCK");
        if (this.buffer.length < 2) return;
        if (p.mode === "read") {
          if (this.buffer[1] !== LENGTH[p.block]) throw new Fault("FRAME");
          const n = LENGTH[p.block] + 3;
          if (this.buffer.length < n) return;
          if (this.buffer.length !== n) throw new Fault("FRAME");
          checkFrame(this.buffer, p.block);
          this.finish(this.buffer.slice());
        } else {
          if (this.buffer.length > 3) throw new Fault("FRAME");
          if (this.buffer.length === 3) {
            if (this.buffer[2] !== sum(this.buffer.slice(0, 2)))
              throw new Fault("CHECKSUM");
            clearTimeout(p.ackTimer);
            this.finish(this.buffer.slice(0, 2));
          } else if (!p.ackTimer) {
            p.ackTimer = setTimeout(() => {
              if (this.pending === p) this.finish(this.buffer.slice());
            }, 60);
          }
        }
      } catch (e) {
        this.fail(e);
      }
    }
    finish(frame) {
      const p = this.pending;
      if (!p) return;
      clearTimeout(p.timer);
      clearTimeout(p.ackTimer);
      this.pending = null;
      this.buffer = [];
      if (p.mode === "write" && frame[1] !== LENGTH[p.block])
        p.reject(new Fault("REJECTED", `${p.block}/${frame[1]}`));
      else p.resolve(frame);
    }
    async request(block, mode, profile) {
      if (this.closed) throw new Fault("DISCONNECTED");
      if (this.pending) throw new Fault("BUSY");
      if (
        !LENGTH[block] ||
        !["read", "write"].includes(mode) ||
        (mode === "write" && block === 81)
      )
        throw new Fault("BLOCK");
      // Drain late unsolicited bytes before arming the next request. There is no
      // request ID on this wire; after any malformed frame/timeout reconnect.
      await delay(80);
      if (this.closed) throw new Fault("DISCONNECTED");
      if (this.pending) throw new Fault("BUSY");
      const frame =
        mode === "read" ? readFrame(block) : writeFrame(block, profile);
      return new Promise((resolve, reject) => {
        const p = { block, mode, resolve, reject };
        this.buffer = [];
        this.pending = p;
        p.timer = setTimeout(
          () => this.fail(new Fault("TIMEOUT")),
          this.timeout,
        );
        this.onLog("TX", frame);
        Promise.resolve(this.writer.write(new Uint8Array(frame))).catch((e) =>
          this.fail(new Fault("WRITE_IO", e.message)),
        );
      });
    }
    async exclusive(fn) {
      if (this.busy) throw new Fault("BUSY");
      if (this.closed) throw new Fault("DISCONNECTED");
      this.busy = true;
      try {
        return await fn();
      } finally {
        this.busy = false;
      }
    }
    async readAll() {
      const profile = {};
      const raw = { general: clone(this.device.raw) };
      for (const block of [82, 83, 84]) {
        const frame = await this.request(block, "read");
        raw[KEYS[block]] = frame;
        profile[KEYS[block]] = decode(block, frame);
      }
      validate(profile);
      return {
        profile,
        raw,
        device: clone(this.device),
        sessionId: this.id,
        at: new Date().toISOString(),
      };
    }
    async close() {
      this.closed = true;
      this.device = null;
      this.id = null;
      const p = this.pending;
      this.pending = null;
      if (p) {
        clearTimeout(p.timer);
        clearTimeout(p.ackTimer);
        p.reject(new Fault("DISCONNECTED"));
      }
      this.buffer = [];
      try {
        await this.reader?.cancel();
      } catch {}
      try {
        await this.loopPromise;
      } catch {}
      try {
        this.writer?.releaseLock();
      } catch {}
      try {
        await this.port.close();
      } catch {}
      this.writer = null;
      this.reader = null;
    }
  }
  async function safeWrite({
    session,
    target,
    blocks = [82, 83, 84],
    saveBackup,
    confirm,
    benchEnabled = false,
  }) {
    return session.exclusive(async () => {
      if (!benchEnabled) throw new Fault("BENCH_REQUIRED");
      const family = identify(session.device);
      if (!family) throw new Fault("UNKNOWN_DEVICE");
      if (
        !Array.isArray(blocks) ||
        !blocks.length ||
        new Set(blocks).size !== blocks.length ||
        blocks.some((b) => !KEYS[b])
      )
        throw new Fault("BLOCK");
      const draft = clone(target);
      validate(draft, session.device, family);
      const sessionId = session.id;
      const snapshot = await session.readAll();
      const second = await session.readAll();
      if (!eq(snapshot.raw, second.raw)) throw new Fault("UNSTABLE_READ");
      const desired = clone(snapshot.profile);
      for (const block of blocks)
        desired[KEYS[block]] = clone(draft[KEYS[block]]);
      validate(desired, session.device, family);
      if (
        blocks.includes(83) &&
        desired.pas.TS < 20 &&
        desired.pas.TS !== snapshot.profile.pas.TS
      )
        throw new Fault("STOP_DELAY");
      for (const key of ["pas", "thr"])
        if (desired[key].SC > 20 && desired[key].SC > snapshot.profile[key].SC)
          throw new Fault("START_CURRENT", key);
      const changes = diff(snapshot.profile, desired);
      if (!changes.length)
        return { status: "unchanged", snapshot, profile: desired };
      // Persist verified controller data, never the form. A download alone is not
      // considered durable. saveBackup must resolve only after durable completion.
      await saveBackup({ ...snapshot, el: toEl(snapshot.profile) });
      if (!(await confirm({ changes, snapshot, target: clone(desired) })))
        return { status: "cancelled", snapshot };
      if (session.closed || session.id !== sessionId)
        throw new Fault("DISCONNECTED");
      // Recheck after the dialog; never overwrite a controller that changed while
      // the operator was looking at the preview.
      const fresh = await session.readAll();
      if (!eq(fresh.raw, snapshot.raw)) throw new Fault("STALE_BACKUP");
      const written = [];
      let attempted = null;
      try {
        for (const block of blocks) {
          if (eq(snapshot.profile[KEYS[block]], desired[KEYS[block]])) continue;
          attempted = block;
          await session.request(block, "write", desired);
          written.push(block);
          const readback = await session.request(block, "read");
          if (!eq(readback.slice(2, -1), payload(block, desired)))
            throw new Fault("VERIFY", KEYS[block]);
        }
        const final = await session.readAll();
        if (!eq(final.profile, desired)) throw new Fault("VERIFY", "all");
        return { status: "written", profile: final.profile, snapshot, written };
      } catch (e) {
        e.written = written;
        e.attempted = attempted;
        e.backup = snapshot;
        throw e;
      }
    });
  }
  function finite(v, min, max, path) {
    if (!Number.isFinite(v) || v < min || v > max)
      throw new Fault("SCENARIO", path);
    return v;
  }
  function scenario(p) {
    for (const [key, min, max] of [
      ["mass", 30, 300],
      ["volt", 18, 65],
      ["eta", 40, 98],
      ["grade", 0, 25],
      ["crr", 0.002, 0.05],
      ["cda", 0.2, 1.5],
      ["circumference", 1, 3.5],
      ["chainring", 20, 60],
      ["cog", 8, 60],
      ["rpm", 50, 180],
      ["displayLimit", 5, 80],
    ])
      finite(p[key], min, max, key);
    return p;
  }
  function gearLimit(p) {
    return (((p.rpm * p.chainring) / p.cog) * p.circumference * 60) / 1000;
  }
  function cadence(kmh, p) {
    return (kmh / 3.6 / ((p.chainring / p.cog) * p.circumference)) * 60;
  }
  function wattsAt(kmh, p, grade = p.grade) {
    const v = kmh / 3.6,
      theta = Math.atan(grade / 100);
    return (
      (p.mass * 9.81 * (p.crr * Math.cos(theta) + Math.sin(theta)) +
        0.5 * 1.225 * p.cda * v * v) *
      v
    );
  }
  function speedFor(watts, p, grade = p.grade) {
    if (watts <= 0) return 0;
    let lo = 0,
      hi = 160;
    for (let i = 0; i < 70; i++) {
      const mid = (lo + hi) / 2;
      if (wattsAt(mid, p, grade) < watts) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function profileRows(profile, p) {
    validate(profile);
    scenario(p);
    return Array.from({ length: 10 }, (_, lvl) => {
      const currentA = (profile.bas.LC * profile.bas.ALC[lvl]) / 100;
      const powerW = p.volt * currentA;
      const cap =
        (Math.min(
          gearLimit(p),
          profile.pas.SL === 255 ? p.displayLimit : profile.pas.SL,
        ) *
          profile.bas.ALBP[lvl]) /
        100;
      const flatKmh = Math.min(speedFor((powerW * p.eta) / 100, p, 0), cap),
        climbKmh = Math.min(speedFor((powerW * p.eta) / 100, p), cap);
      return {
        lvl,
        currentA,
        powerW,
        flatKmh,
        climbKmh,
        cadence: cadence(climbKmh, p),
        thermalRisk: currentA >= 22 && cadence(climbKmh, p) < 60,
      };
    });
  }
  function rangeEstimate(
    profile,
    p,
    { ah, grade, hillShare, level, reserve = 0.15 },
  ) {
    scenario(p);
    validate(profile);
    finite(ah, 0, 100, "ah");
    finite(grade, 0, 25, "grade");
    finite(hillShare, 0, 1, "hillShare");
    integer(level, 0, 9, "level");
    finite(reserve, 0, 0.8, "reserve");
    const availableWh = ah * p.volt * (1 - reserve);
    const watts =
      (((profile.bas.LC * profile.bas.ALC[level]) / 100) * p.volt * p.eta) /
      100;
    if (watts <= 0 || profile.bas.ALBP[level] === 0)
      return { km: null, whKm: null, availableWh };
    const cap =
      (Math.min(
        gearLimit(p),
        profile.pas.SL === 255 ? p.displayLimit : profile.pas.SL,
      ) *
        profile.bas.ALBP[level]) /
      100;
    const consumption = (g) => {
      const speed = Math.min(speedFor(watts, p, g), cap);
      return speed > 0.1 ? wattsAt(speed, p, g) / (p.eta / 100) / speed : null;
    };
    const flat = consumption(0),
      hill = consumption(grade);
    if (flat === null || hill === null)
      return { km: null, whKm: null, availableWh };
    const whKm = flat * (1 - hillShare) + hill * hillShare;
    return { km: whKm > 0 ? availableWh / whKm : null, whKm, availableWh };
  }
  return {
    BLOCK,
    LENGTH,
    KEYS,
    WHEELS,
    MODELS,
    Fault,
    clone,
    sum,
    eq,
    validate,
    lowBatteryRange,
    wheelEncode,
    wheelDecode,
    payload,
    writeFrame,
    readFrame,
    checkFrame,
    decode,
    identify,
    toEl,
    fromEl,
    ridingPreset,
    diff,
    SerialSession,
    safeWrite,
    scenario,
    gearLimit,
    cadence,
    wattsAt,
    speedFor,
    profileRows,
    rangeEstimate,
  };
});
