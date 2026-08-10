// TDD GREEN: F08 hardening — byteField clamps/rejects invalid Bafang frame bytes.
// Exercises the control directly (vm does not expose the closure's `const state`).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(__dirname, '../bbs-flash.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const elements = {};
const makeEl = () => ({ value: '', textContent: '', innerHTML: '', dataset: {}, style: {}, classList: { add(){}, remove(){} }, appendChild(){}, setAttribute(){}, addEventListener(){} });
const ctx = {
  console,
  document: { getElementById: (id) => (elements[id] ||= makeEl()), createElement: makeEl, querySelectorAll: () => [], querySelector: () => makeEl(), addEventListener(){} },
  window: {}, navigator: { userAgent: 'node' }, setTimeout, clearTimeout, setInterval, clearInterval,
};
vm.createContext(ctx);
try { vm.runInContext(js, ctx, { timeout: 5000 }); }
catch (e) { if (typeof ctx.byteField !== 'function') { console.error('Script failed before defining byteField:', e.message); process.exit(2); } }

let passed = 0, failed = 0;
function check(name, fn){ try { fn(); console.log('  PASS', name); passed++; } catch(e){ console.log('  FAIL', name, '->', e.message); failed++; } }

check('byteField exists (F08 hardening present)', () => {
  if (typeof ctx.byteField !== 'function') throw new Error('byteField not defined — F08 not applied');
});

check('negative Current Limit is rejected (cannot become byte 251)', () => {
  // -5 must throw, never coerce to 251 via Uint8Array
  let threw = false;
  try { ctx.byteField(-5, 1, 30, 'Current Limit'); } catch(e){ threw = true; }
  if (!threw) throw new Error('byteField(-5) did not throw — would let 251A reach controller');
});

check('NaN Current Limit is rejected', () => {
  let threw = false;
  try { ctx.byteField(NaN, 1, 30, 'Current Limit'); } catch(e){ threw = true; }
  if (!threw) throw new Error('byteField(NaN) did not throw — would send corrupt byte');
});

check('overflow Current Limit is rejected', () => {
  let threw = false;
  try { ctx.byteField(300, 1, 30, 'Current Limit'); } catch(e){ threw = true; }
  if (!threw) throw new Error('byteField(300) did not throw — out of range accepted');
});

check('valid Current Limit passes through unchanged', () => {
  const v = ctx.byteField(20, 1, 30, 'Current Limit');
  if (v !== 20) throw new Error('valid value mutated: ' + v);
});

check('buildBasWriteFrame uses byteField for Current Limit', () => {
  const src = html;
  if (!/function buildBasWriteFrame\(\)\{[\s\S]*?byteField\(b\.LC/.test(src))
    throw new Error('buildBasWriteFrame does not route LC through byteField');
});

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
