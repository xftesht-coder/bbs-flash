# Verification of 3.4.3

Additional coverage: twelve ride profiles preserve hardware/PAS0/throttle fields and current ceilings at 1/12/18/25/30 A; switching economy → full ahead; actual supplied Penoff.el indices and roundtrip; browser preview/cancel/apply/undo for all twelve modes, category counts and new RU/EN descriptions, no profile-driven UART commands, local named drafts and escaping, downloads, read-only file comparison, rejected malformed comparison and IndexedDB v1 migration with existing backups/preferences.

Profile meters describe design intent, not measured tuning quality. Default battery capacity is 19.2 Ah as supplied by the owner. No physical qualification was performed in this release.

Baseline audited: `ad3aed5` (3.4.2). Tests do not access a physical serial port.

## Reproduce

```sh
npm ci
npm run check
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

`BROWSER_CHANNEL=msedge` selects installed Edge; omit it for Playwright Chromium. `BBS_ARTIFACT_DIR` can redirect screenshots and `browser-results.json`; defaults to ignored `test-results/`. Browser tests start their own loopback server and replace Web Serial with a synthetic stream before loading the app. Never treat these as motor test results.

## Foundation regressions

41 Node tests and 25 Edge browser scenarios passed locally on 2026-09-30. Syntax checks passed; npm audit reported zero known vulnerabilities. These counts include the existing regression suite.

- Core requires backed-up read in the current connection, rejects direct writes, and revokes readiness on reconnect or stale data.
- Backup completes before editor baseline is exposed; storage failure and unstable reads cannot enable writing.
- Changes during EDIT or confirmation cannot overwrite a changed controller; callback objects cannot mutate the trusted baseline or reviewed target.
- Failed ACK/readback invalidates the core session; ACK without persistence is rejected in both unit and browser tests.
- Read All cancellation preserves the chosen ride draft and sends no UART commands. Single-block writes retain unsent edits elsewhere. Applying/editing a new draft clears the previous write-success banner.
- All four owner capture blocks replay through Penoff .el roundtrip, Full ahead application, backup, write and verification; throttle bytes remain unchanged. Writes in this test are simulated, not physical.
- Legacy landing URL redirects to the single canonical page.

## Covered

- Owner General and Basic capture replay; independent legacy reference packets for all four blocks and every single-bit mutation; all fragmentation boundaries; changed/corrupt/missing second General; checksum convention pinned for the session; legacy backup/write/readback with separate TX rules. Browser replay displays the captured 24 A after a complete read.

- Fixed independent General/Basic/PAS/Throttle vectors, every single-byte corruption, malformed/truncated/extra responses, fragmented reads, wrong block, timeout and disconnect.
- 1200/8N1 options, two-/three-byte ACK, rejected or invalid ACK, per-block readback mismatch, no retry, no interleaving of two writes.
- Write All and all three single-block paths: backup contains read controller data, precedes transmission, is persisted and checked; cancellation, storage failure, invalid limits, unknown firmware and stale data prevent writes.
- `.el` index offsets against original Penoff numeric fixture; roundtrips and boundaries; invalid/partial/duplicate input does not mutate the UI.
- Presets preserve hardware and throttle; motor model and General limits remain separate from simulation choice.
- Correct gearing direction, electrical/mechanical power conversion, PAS-specific range, zero inputs, row-level thermal heuristic, BBSHD 30 A in simulation.
- Fresh and denied IndexedDB, unavailable Web Serial, local backup persistence across reload, complete dynamic RU/EN, light/dark theme persistence.
- Every tab at 360/390/768/1440 px; reduced-motion mode; no page overflow; both landing URLs, calculator and application CTA.
- Race HUD shares PAS/current/speed/cadence/range inputs; invalid input clears output; display mode and animation cannot send serial commands. Animation pauses when hidden or reduced motion is enabled.
- Every controller field has a bilingual Penoff guide; keyboard dismissal returns focus; attributions and source links remain visible.
- No console/runtime errors in exercised browser scenarios.

## Still required

Physical write/restore and write/ACK captures, SZZ9 RPM (V1) and Time of Stop behavior (V2), actual sensor/throttle behavior, Safari/Firefox read-only coverage and screen-reader evaluation. Original v3.0 DoD is intentionally not reported as fully complete. Hardware acceptance criteria are in `ROADMAP.md`.
