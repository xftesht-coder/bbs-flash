# Foundation audit — 2026-09-30

Baseline: ad3aed5 (3.4.2). Scope: Audit → Cleanup → Core → Safety → Tests → UI. No new ride modes, design work, framework, or runtime dependency.

## Inventory

- Browser runtime: static HTML + vanilla JavaScript, no runtime packages/CDN scripts. Node tooling: Playwright 1.62.1 (with playwright-core and optional platform dependency in the lockfile).
- src/core.js: Penoff profile validation/serialization, UART framing and SerialSession, safeWrite, estimates. src/storage.js: committed IndexedDB transactions and backup verification. src/app.js: draft and browser interaction. Ride/guide/dashboard modules consume these APIs.
- index.html and landing.html duplicate the entire landing page. Keep index.html canonical and retain landing.html as a redirect.
- Historical configurator URLs already redirect; old deployment scripts fail closed. Archives and original Penoff assets are references, not runtime dependencies. Keep these protective shims and source provenance.
- Historical numeric presets and ride profiles have distinct behavior and active UI references. They are not dead code; removing them would silently change existing workflows.

## Findings to resolve

1. High: Read All exposes a controller profile without persisting a backup. A backup appears only when writing is requested. Restore the requested READ → BACKUP → EDIT order.
2. High: the core does not require an earlier backed-up read; readiness is an app-only loadedSession flag. A controller changed between the editing read and write preparation can be accepted as the new baseline and overwritten by an old draft.
3. High: a failed write/readback closes the port only in the UI wrapper; the core caller can retain a session after rejected ACK or VERIFY. Core must invalidate uncertain writes itself.
4. Medium: Read All silently overwrites a modified draft (observed by the owner). Ask before discarding edits; cancel must perform no UART request.
5. Medium: single-block write pushes the entire readback into the editor, discarding unsent edits to other blocks. Preserve those draft blocks while separately tracking verified controller state.
6. Cleanup: identical landing pages drift easily. Use a canonical page and tested redirect, not two editable copies.

7. Medium: choosing a new ride draft or editing after a successful write can leave the previous success banner visible. Clear it when controller fields change, without treating simulator edits as motor settings.

## Preserved protocol contracts

1200/8N1; exact General/Basic/PAS/Throttle lengths; session-pinned legacy/additive RX checksum; distinct TX checksum; strict fragmented framing; Penoff .el offsets; unknown identities read-only; explicit session write opt-in; backup before writes; final confirmation; per-block and full readback. No physical motor access from automated tests.

## Evidence

- Baseline: 35 Node tests passed on 2026-09-30. Existing tests do not cover findings 1–5 completely.
- Owner supplied General, Basic, PAS and Throttle responses and reported a complete successful read on 2026-09-26. On 2026-09-30 the owner also confirmed a verified write and ride with Full ahead on 3.4.2. This is an owner report; physical restore, independent Penoff verification and write/ACK captures remain outstanding. The 3.4.3 changes have software test coverage only.
- Final verification: 41 Node tests and 25 Edge browser scenarios passed; syntax checks passed; npm audit reports 0 known vulnerabilities. Passing tests cannot establish physical motor qualification.

## Resolution

| Finding | Implemented boundary | Verification |
| --- | --- | --- |
| Backup after EDIT | readAndBackup completes stable read and committed backup before returning editor data | Storage failure/unstable read core tests and initial-backup browser regression |
| UI-only readiness / stale draft | Private connection baseline, safeWrite readiness check and comparison before confirmation; low-level write authorization | Raw-read bypass, reconnect, changed-during-edit and callback-isolation tests |
| Uncertain write stays open | Core closes and invalidates on write/verify failures | Negative ACK tests; ACK without persistence in core and browser |
| Read erases draft | Explicit replacement confirmation; cancel makes no UART request | Ride draft cancel/accept browser regression |
| Single-block write erases other edits | Verified controller baseline stays separate from remaining editor changes | Basic write with pending PAS edit, then verified PAS write |
| Stale success banner | Applying or editing controller draft clears old write-success status | Full owner replay followed by another ride draft and manual edit |
| Duplicate landing | One index.html plus legacy redirect | Static site tests and browser checks of both URLs |

No runtime dependencies were added. No UART wire values, checksum rules, Penoff field offsets or ride-profile definitions changed. Existing archives and historical examples remain available because they are references or still-used UI data, not proven dead code. The owner packets are now recorded for all four blocks. The release gate was narrowed to HW 1.1 and maximum 25 A after the owner's write/ride confirmation. Physical restore and independent hardware validation remain open before broader compatibility claims.
