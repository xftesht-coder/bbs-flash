const {test} = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/core.js"), R = require("../src/ride-profiles.js"), M = require("../src/ride-compare.js");
const {profile} = require("./helpers.cjs");

test("seven before/after values come from actual profiles, including inverted ramp and response", () => {
  const before = C.clone(profile), after = R.apply(before,"forward");
  const rows = M.compare(before,after);
  assert.deepEqual(rows.map(r=>[r.id,r.before,r.after,r.direction]), [
    ["response",4,3,1], ["pickup",10,20,1], ["acceleration",4,3,1],
    ["middle",9,12.24,1], ["peak",18,18,0], ["cruise",60,70,1], ["speed",76,100,1],
  ]);
  assert.deepEqual(before, profile, "read-only comparison");
  assert.ok(M.compare(after,after).every(r=>!r.changed && r.direction===0));
});

test("comparisons respect rounding and current ceilings for every ride, not nominal card ratings", () => {
  for (const amps of [1,12,18,24,25,30]) {
    const base=C.clone(profile);base.bas.LC=amps;
    for(const p of R.profiles) {
      const after=R.apply(base,p.id), rows=M.compare(base,after);
      assert.equal(rows.length,7);
      assert.equal(rows.find(r=>r.id==='peak').after,amps*after.bas.ALC[9]/100);
      assert.ok(rows.find(r=>r.id==='peak').after<=Math.min(amps,p.cap));
      assert.equal(rows.find(r=>r.id==='speed').after,after.bas.ALBP[5]);
    }
  }
  const base=C.clone(profile);base.bas.LC=24;
  assert.equal(M.compare(base,R.apply(base,'acceleration')).find(r=>r.id==='peak').after,21.84);
});

test("manual and imported settings compare by values; invalid settings produce no guessed ratings", () => {
  const before=C.fromEl(require('node:fs').readFileSync(require('node:path').join(__dirname,'fixtures/penoff-supplied.el'),'utf8'));
  const after=R.apply(before,'technical');
  const rows=M.compare(before,after);
  assert.equal(rows.find(r=>r.id==='acceleration').direction,-1);
  after.bas.ALC[5]=0; assert.equal(M.compare(before,after).find(r=>r.id==='middle').after,0);
  after.bas.LC=NaN; assert.throws(()=>M.compare(before,after));
  assert.throws(()=>M.compare(null,before));
});
