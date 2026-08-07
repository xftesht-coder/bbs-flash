// Headless smoke test for bbs-flash.html — boots the page in Chromium, fails on
// any console error or uncaught exception, then exercises Reality Check by
// driving the drivetrain inputs and reading the computed numbers back out.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'bbs-flash.html');
const errors = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
// The sandbox has no egress, so the Google Fonts <link> always fails. That is an
// environment fact, not a defect in the page — everything else is a real error.
const IGNORE = /ERR_TUNNEL_CONNECTION_FAILED|fonts\.googleapis|fonts\.gstatic/;
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push('console.error: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

await page.goto(pathToFileURL(file).href);
await page.waitForTimeout(400);

// dismiss the risk gate
await page.check('#gateCheck');
await page.click('#gateEnter');
await page.click('.nav-btn[data-tab="sim"]');
await page.waitForTimeout(300);

const results = [];
function check(name, actual, predicate, expected) {
  const ok = predicate(actual);
  results.push({ name, actual, expected, ok });
}

// --- Reality Check: reference rig 32T / 11T / 27.5x2.8 -> 44-48 km/h
async function setRig({ chainring, cogMin, cogMax, tire, rpm, cogRide }) {
  for (const [id, v] of [['rcChainring', chainring], ['rcCogMin', cogMin],
                         ['rcCogMax', cogMax], ['rcTire', tire], ['rcMaxRpm', rpm],
                         ['rcCogRide', cogRide ?? 32]]) {
    await page.fill('#' + id, String(v));
  }
  await page.waitForTimeout(200);
}
const gearLimit = () => page.evaluate(() =>
  gearLimitKmh(rcParams(), resolveProfile(document.getElementById('simProfA').value).bas.WD));

await setRig({ chainring: 32, cogMin: 11, cogMax: 50, tire: 2.8, rpm: 120 });
const vRef = await gearLimit();
check('reference rig 32T/11T/27.5x2.8 @120rpm in 44-48 km/h', +vRef.toFixed(1), v => v >= 44 && v <= 48, '44-48');

// --- gearing must actually move the ceiling (the old build could not)
await setRig({ chainring: 32, cogMin: 14, cogMax: 50, tire: 2.8, rpm: 120 });
const vTaller = await gearLimit();
check('bigger smallest-cog lowers the ceiling', +vTaller.toFixed(1), v => v < vRef - 5, '< ' + (vRef - 5).toFixed(1));

await setRig({ chainring: 32, cogMin: 11, cogMax: 50, tire: 2.1, rpm: 120 });
const vThin = await gearLimit();
check('narrower tire lowers the ceiling', +vThin.toFixed(1), v => v < vRef, '< ' + vRef.toFixed(1));

await setRig({ chainring: 32, cogMin: 11, cogMax: 50, tire: 2.8, rpm: 90 });
const vSlow = await gearLimit();
check('BBS01-class rpm lowers the ceiling', +vSlow.toFixed(1), v => v > 34 && v < 38, '~36');

// --- no level may report a speed above the drivetrain ceiling
await setRig({ chainring: 32, cogMin: 11, cogMax: 50, tire: 2.8, rpm: 120 });
const overshoot = await page.evaluate(() => {
  const p = simParams();
  const rows = computeProfileRows(resolveProfile('yourCurrent'), p);
  const v = rows[0].vGear;
  return rows.filter(r => r.flatKmh > v + 0.01 || r.climbKmh > v + 0.01).length;
});
check('no PAS level exceeds the drivetrain ceiling', overshoot, n => n === 0, 0);

// --- thermal heuristic fires where it should and stays quiet where it should not
const thermal = await page.evaluate(() => {
  const p = simParams();
  p.grade = 18;                                   // steep forest climb
  p.rc.cogRide = 14;                              // rider stubbornly in a tall gear
  const hot = { bas:{LBP:41,LC:25,ALC:[0,100,100,100,100,100,100,100,100,100],
                     ALBP:[0,100,100,100,100,100,100,100,100,100],WD:11,SMType:0,SMSig:1},
                pas:{PT:3,DA:255,SL:255,SC:20,SSM:7,SDN:2,WM:null,TS:20,CD:8,SD:0,KC:80},
                thr:{SV:11,EV:36,MODE:1,DA:255,SL:40,SC:16} };
  const mild = JSON.parse(JSON.stringify(hot));
  mild.bas.LC = 10;                               // 10A can never trip a >=22A rule
  const rowsHot  = computeProfileRows(hot,  p);
  const rowsMild = computeProfileRows(mild, p);
  return { hot: rowsHot.filter(r=>r.thermalRisk).length,
           mild: rowsMild.filter(r=>r.thermalRisk).length,
           minCadence: Math.min(...rowsHot.map(r=>r.rideCadence)),
           needCog: rowsHot[9].cogFor60 };
});
check('thermal risk flags 25A at 14T on an 18% grade', thermal.hot, n => n > 0, '> 0');
check('thermal risk silent at 10A', thermal.mild, n => n === 0, 0);
check('recommends a bigger cog to clear 60rpm', thermal.needCog, n => n > 14 && n < 60, '15-59');

// cadence maths: 60 rpm in a 32T cog with a 32T ring is exactly wheel rpm
const cadenceSane = await page.evaluate(() => {
  const rc = { chainring: 32, cogMin: 11, cogMax: 50, cogRide: 32, tire: 2.8, maxRpm: 120 };
  const circ = wheelCircumferenceM(11, 2.8);
  const vKmh = 60 * circ * 60 / 1000;            // 60 wheel rpm -> km/h
  return Math.round(cadenceAt(vKmh, 32, rc, 11));
});
check('cadence maths self-consistent (1:1 gear)', cadenceSane, n => n === 60, 60);

// --- safety gate blocks a write with no backup on file
const gate = await page.evaluate(() => {
  const calls = [];
  const realConfirm = window.confirm; window.confirm = () => { calls.push('confirm'); return false; };
  lastKnownGood = null;
  const blocked = safetyGate(['bas']);
  lastKnownGood = JSON.parse(JSON.stringify(state));
  const asked = safetyGate(['bas']);          // confirm stubbed to "cancel"
  window.confirm = realConfirm;
  return { blocked, asked, confirmCalls: calls.length };
});
check('write blocked with no backup', gate.blocked, v => v === false, false);
check('write asks for confirmation once a backup exists', gate.confirmCalls, n => n === 1, 1);
check('cancelling the confirm aborts the write', gate.asked, v => v === false, false);

// --- AutoDetect clamps a BBS01-class ceiling
const detect = await page.evaluate(() => ({
  bbs01: detectFamily(18, 1), bbs02: detectFamily(25, 2), bbshd: detectFamily(30, 2)
}));
check('18A reported -> BBS01-class 18A ceiling', detect.bbs01.maxA, n => n === 18, 18);
check('25A reported -> BBS02-class 25A ceiling', detect.bbs02.maxA, n => n === 25, 25);
check('30A reported -> BBSHD-class 30A ceiling', detect.bbshd.maxA, n => n === 30, 30);

// --- checksum verification
const chk = await page.evaluate(() => {
  const payload = [0x53, 11, 3, 255, 255, 10, 1, 4, 255, 10, 8, 0, 80];
  const good1 = payload.slice(1).reduce((s, b) => s + b, 0) % 256;
  const okFrame  = [...payload, good1];
  const badFrame = [...payload, (good1 + 7) % 256];
  strictChecksum = true;
  const acceptedGood = verifyRxChecksum(0x53, okFrame);
  const acceptedBad  = verifyRxChecksum(0x53, badFrame);
  strictChecksum = false;
  return { acceptedGood, acceptedBad };
});
check('valid checksum accepted', chk.acceptedGood, v => v === true, true);
check('corrupt frame rejected in strict mode', chk.acceptedBad, v => v === false, false);

// --- no banned web storage anywhere in the shipped file
const banned = await page.evaluate(() => document.documentElement.outerHTML.match(/\b(localStorage|sessionStorage)\b/g) || []);
check('zero localStorage / sessionStorage', banned.length, n => n === 0, 0);

await browser.close();

const pad = s => String(s).padEnd(52);
let failed = 0;
console.log('');
for (const r of results) {
  const mark = r.ok ? '  ok  ' : ' FAIL ';
  if (!r.ok) failed++;
  console.log(` [${mark}] ${pad(r.name)} got ${r.actual}${r.ok ? '' : `  (expected ${r.expected})`}`);
}
if (errors.length) {
  failed += errors.length;
  console.log('\n Console / page errors:');
  errors.forEach(e => console.log('   ' + e));
}
console.log(`\n ${results.length - (failed - errors.length)}/${results.length} assertions passed, ${errors.length} page errors\n`);
process.exit(failed ? 1 : 0);
