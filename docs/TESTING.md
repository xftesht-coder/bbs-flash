# Verification of 3.2.0

Baseline audited: `8e0495904e566757f40a52427861c5d3990dc677`. Tests do not access a physical serial port.

## Reproduce

```sh
npm ci
npm run check
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

`BROWSER_CHANNEL=msedge` selects installed Edge; omit it for Playwright Chromium. `BBS_ARTIFACT_DIR` can redirect screenshots and `browser-results.json`; defaults to ignored `test-results/`. Browser tests start their own loopback server and replace Web Serial with a synthetic stream before loading the app. Never treat these as motor test results.

## Covered

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

Physical read/write/restore, independently captured real frames, SZZ9 RPM (V1) and Time of Stop behavior (V2), actual sensor/throttle behavior, Safari/Firefox read-only coverage and screen-reader evaluation. Original v3.0 DoD is intentionally not reported as fully complete. Hardware acceptance criteria are in `ROADMAP.md`.
