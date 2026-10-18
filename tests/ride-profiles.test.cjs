const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const C = require("../src/core.js");
const R = require("../src/ride-profiles.js");
const { profile } = require("./helpers.cjs");

test("all seventeen ride modes preserve hardware, PAS0 and throttle, and respect current ceilings", () => {
  assert.equal(R.profiles.length, 17);
  for (const amps of Array.from({length:30}, (_,i) => i + 1)) {
    const before = structuredClone(profile);
    before.bas.LC = amps; before.bas.LBP = 40; before.bas.WD = 4;
    before.bas.ALC[0] = 1; before.bas.ALBP[0] = 1;
    before.pas.DA = 5; before.pas.SL = 25; before.pas.WM = 32;
    before.pas.TS = 30; before.pas.SD = 12;
    const original = structuredClone(before);
    for (const spec of R.profiles) {
      const p = R.apply(before, spec.id);
      for (const k of ["LC","LBP","WD","SMType","SMSig"]) assert.equal(p.bas[k], before.bas[k]);
      for (const k of ["PT","DA","SL","WM","TS","SD"]) assert.equal(p.pas[k], before.pas[k]);
      assert.deepEqual(p.thr, before.thr);
      assert.equal(p.bas.ALC[0], before.bas.ALC[0]);
      assert.equal(p.bas.ALBP[0], before.bas.ALBP[0]);
      assert.ok(p.pas.SC >= 10 && p.pas.SC <= 20);
      assert.ok(p.pas.SDN >= 3);
      for (let i = 1; i < 10; i++) {
        assert.ok(p.bas.LC * p.bas.ALC[i] / 100 <= Math.min(amps, spec.cap));
        if (i > 1) assert.ok(p.bas.ALC[i] >= p.bas.ALC[i-1]);
      }
      assert.deepEqual(C.fromEl(C.toEl(p)), p);
    }
    assert.deepEqual(before, original, "input must remain immutable");
  }
});

test("new modes have distinct purposes and floor-rounded ceilings at the owner's current limit", () => {
  const base = structuredClone(profile); base.bas.LC = 24;
  assert.deepEqual(R.profiles.filter(p => p.fresh).map(p => p.id), ["bread-run", "bread-eco"]);
  for (const [id,peak] of [["city-sport",21.84],["trail-flow",19.92],["loose-ground",13.92]]) {
    const p = R.apply(base,id);
    assert.ok(Math.abs(p.bas.LC*p.bas.ALC[9]/100-peak)<1e-9);
    assert.equal(p.bas.LC,24);
    const spec = R.profiles.find(p => p.id===id);
    assert.equal(spec.usage.length,3);
    assert.ok(spec.usage.every(pair => pair.length===2 && pair.every(text => text.length>10)));
  }
  const sport = R.apply(base,"city-sport"), acceleration=R.apply(base,"acceleration");
  assert.ok(sport.pas.SSM>acceleration.pas.SSM);
  assert.ok(sport.bas.ALC[1]<acceleration.bas.ALC[1]);
  assert.ok(sport.pas.KC>acceleration.pas.KC);
  const flow=R.apply(base,"trail-flow"), trail=R.apply(base,"trail");
  assert.ok(flow.pas.SDN<trail.pas.SDN);
  assert.ok(flow.pas.SC<trail.pas.SC);
  assert.deepEqual(flow.bas.ALBP.slice(1),Array(9).fill(100));
});

test("hill commute bands cover nine levels with one shared start and no extra speed caps", () => {
  const base=structuredClone(profile); base.bas.LC=24;
  const balanced=R.apply(base,"bread-run"), eco=R.apply(base,"bread-eco");
  assert.deepEqual(balanced.bas.ALC.slice(1),[18,28,39,48,54,60,66,70,75]);
  assert.deepEqual(eco.bas.ALC.slice(1),[12,20,28,35,40,45,50,54,58]);
  assert.deepEqual([balanced.pas.SC,balanced.pas.SSM,balanced.pas.SDN,balanced.pas.KC],[12,4,3,60]);
  assert.deepEqual([eco.pas.SC,eco.pas.SSM,eco.pas.SDN,eco.pas.KC],[10,5,4,50]);
  for(let amps=1;amps<=30;amps++) {
    base.bas.LC=amps;
    const a=R.apply(base,"bread-run"), b=R.apply(base,"bread-eco");
    for(let level=1;level<=9;level++) assert.ok(b.bas.ALC[level]<=a.bas.ALC[level], `economy must not exceed balance at ${amps} A / PAS ${level}`);
  }
  for(const id of ["bread-run","bread-eco"]) {
    const spec=R.profiles.find(p=>p.id===id), actual=R.apply(base,id);
    assert.deepEqual(spec.bands,[[1,4],[5,7],[8,9]]);
    assert.deepEqual(spec.bands.flatMap(([a,b])=>Array.from({length:b-a+1},(_,i)=>a+i)),[1,2,3,4,5,6,7,8,9]);
    assert.equal(spec.usage.length,spec.bands.length);
    assert.deepEqual(actual.bas.ALBP.slice(1),Array(9).fill(100));
    assert.equal(actual.pas.SL,base.pas.SL);
    assert.deepEqual(actual.thr,base.thr);
  }
});

test("specialist modes offer distinct assistance without promising extra global current", () => {
  const base = structuredClone(profile); base.bas.LC = 25;
  const modes = Object.fromEntries(R.profiles.map(p => [p.id, R.apply(base, p.id)]));
  const signatures = new Set(Object.values(modes).map(p => C.toEl(p)));
  assert.equal(signatures.size, R.profiles.length, "no renamed duplicate tunes");
  const peak = p => p.bas.LC * p.bas.ALC[9] / 100;
  assert.equal(peak(modes.acceleration), 22);
  assert.ok(modes.acceleration.pas.KC < modes.forward.pas.KC);
  assert.equal(modes.acceleration.pas.SDN, modes.forward.pas.SDN);
  assert.equal(modes.acceleration.pas.SSM, modes.forward.pas.SSM);
  assert.ok(peak(modes.climb) < peak(modes.trail));
  assert.ok(modes.climb.pas.KC > modes.trail.pas.KC);
  assert.ok(modes.technical.bas.ALC[1] < modes.trail.bas.ALC[1]);
  assert.ok(modes.technical.pas.SDN < modes.trail.pas.SDN);
  assert.ok(modes.technical.pas.SSM > modes.trail.pas.SSM);
  assert.ok(peak(modes.touring) > peak(modes.economy));
  assert.ok(peak(modes.training) < peak(modes.economy));
  assert.ok(modes.training.pas.KC < modes.economy.pas.KC);
  for (const id of ["climb", "touring", "training"]) {
    assert.deepEqual(modes[id].bas.ALBP.slice(1), Array(9).fill(100));
    assert.equal(modes[id].pas.SL, base.pas.SL);
  }
});

test("changing from economy to full ahead restores intended PAS ceiling without raising global current", () => {
  const original = structuredClone(profile); original.bas.LC = 25;
  const economy = R.apply(original, "economy");
  assert.equal(economy.bas.LC * economy.bas.ALC[9] / 100, 12);
  const forward = R.apply(economy, "forward");
  assert.equal(forward.bas.LC, 25);
  assert.equal(forward.bas.ALC[9], 100);
  assert.equal(forward.pas.SC, 20);
  const limited = R.apply(profile, "forward");
  assert.equal(limited.bas.LC * limited.bas.ALC[9] / 100, 18);
});

test("speed mode keeps display limit, park is a relative limit, and invalid modes or drafts fail", () => {
  const p = structuredClone(profile); p.pas.SL = 25;
  const fast = R.apply(p, "speed");
  assert.equal(fast.pas.SL, 25);
  assert.deepEqual(fast.bas.ALBP.slice(1), Array(9).fill(100));
  assert.equal(R.apply(p, "park").bas.ALBP[9], 60);
  assert.throws(() => R.apply(p, "nonexistent"));
  p.bas.LC = NaN;
  assert.throws(() => R.apply(p, "city"));
});

test("actual Penoff.el from supplied BBSTool archive imports and exports with correct indices", () => {
  const text = fs.readFileSync(path.join(__dirname, "fixtures/penoff-supplied.el"), "utf8");
  const p = C.fromEl(text);
  assert.equal(p.bas.LC, 25);
  assert.equal(p.bas.WD, 10);
  assert.deepEqual(p.bas.ALC, [1,50,58,64,70,76,82,88,94,100]);
  assert.equal(p.pas.SSM, 4);
  assert.equal(p.pas.DA, 255);
  assert.equal(p.pas.SL, 255);
  assert.equal(p.pas.WM, null);
  assert.equal(p.thr.DA, 6);
  assert.equal(p.thr.SL, 40);
  assert.equal(p.thr.EV, 42);
  assert.deepEqual(C.fromEl(C.toEl(p)), p);
});
