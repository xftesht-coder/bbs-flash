// TDD — RED first. Tests for bbs-flash physics extracted from the live <script>.
// Run: node tests/physics.test.mjs
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'bbs-flash.html');
const html = readFileSync(htmlPath, 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Run the page script in an isolated context so we exercise the REAL functions.
// Provide a minimal DOM stub so DOM-writing functions (computeRange) don't crash.
const elements = {};
const makeEl = () => ({ textContent: '', innerHTML: '', className: '', style: {}, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, addEventListener(){}, querySelectorAll(){return [];}, classList:{add(){},remove(){},toggle(){}} });
const ctx = {
  document: {
    getElementById: (id) => (elements[id] ||= makeEl()),
    querySelectorAll: () => [],
    documentElement: { setAttribute(){} },
    createElement: makeEl,
  },
  navigator: { userAgent: 'node-test' },
  console,
  setTimeout, clearTimeout,
  localStorage: undefined,
  indexedDB: {},
};
ctx.window = ctx;
vm.createContext(ctx);
try {
  vm.runInContext(js, ctx, { timeout: 5000 });
} catch (e) {
  // Some browser-only code may throw at load; pure function declarations are hoisted and available.
}

let pass = 0, fail = 0;
function check(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (e) {
    console.log('  FAIL', name, '->', e.message);
    fail++;
  }
}
function approx(a, b, tol, msg) {
  if (Math.abs(a - b) > tol) throw new Error(`${msg}: got ${a}, expected ~${b} (tol ${tol})`);
}

console.log('=== bbs-flash physics tests (RED) ===');

check('solveSpeed available', () => {
  if (typeof ctx.solveSpeed !== 'function') throw new Error('solveSpeed not defined in script scope');
});

check('solveSpeed flat 1080W within documented band (44-48 km/h)', () => {
  const v = ctx.solveSpeed(1080, 115, 0, 0.012, 0.65);
  const kmh = v * 3.6;
  if (kmh < 44 || kmh > 48) throw new Error(`flat speed ${kmh.toFixed(1)} km/h outside documented 44-48 band`);
});

check('solveSpeed climbs slower on 8% grade', () => {
  const flat = ctx.solveSpeed(1080, 115, 0, 0.012, 0.65);
  const grade = ctx.solveSpeed(1080, 115, 0.08, 0.012, 0.65);
  if (!(grade < flat)) throw new Error(`grade (${grade}) not slower than flat (${flat})`);
});

check('computeRange returns finite km for default hardware', () => {
  if (typeof ctx.computeRange !== 'function') throw new Error('computeRange not defined');
  // Mirror the page's populated state (browser fills this on load / pushUIFromState)
  ctx.state = ctx.state || {};
  ctx.state.bas = { LC: 18 };
  ctx.state.family = { label: 'BBS02-class', maxA: 25, rpm: 120 };
  ctx.simVolt = 48; ctx.simEta = 85; ctx.simAh = 20;
  ctx.simAvgGrade = 3; ctx.simHillShare = 30; ctx.simRangeLevel = 5;
  // simParams() must also be present
  if (typeof ctx.simParams !== 'function') throw new Error('simParams not defined');
  elements['simProfA'] = elements['simProfA'] || {};
  elements['simProfA'].value = 'peppySafe';
  ctx.computeRange();
  const out = elements['rangeOut'];
  const bars = elements['rangeBars'];
  if (!out) throw new Error('rangeOut element missing');
  const txt = (out.innerHTML || '') + (bars ? (bars.innerHTML||'') : '');
  if (!/км/.test(txt)) throw new Error('no km in range output: ' + txt.slice(0, 80));
});

check('computeDelta available', () => {
  if (typeof ctx.computeDelta !== 'function') throw new Error('computeDelta not defined');
});

check('no localStorage usage', () => {
  if (js.match(/\blocalStorage\.(get|set|remove|clear)\b/)) throw new Error('localStorage CALL present');
});

check('no REF_MAX_KMH constant', () => {
  if (js.match(/REF_MAX_KMH\s*=/)) throw new Error('REF_MAX_KMH hard-coded');
});

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
