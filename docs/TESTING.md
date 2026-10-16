# Verification of 3.4.8

53 Node tests and 38 Edge browser scenarios cover seven computed comparison values, inverse ramp/response direction, capped/rounded PAS current at 1/12/18/24/25/30 A, imports and invalid inputs. Browser checks cover all twelve cards, live draft edits, preview without mutation, apply/undo, RU/EN, motor baseline stability until verified writing, partial block writes, failed writes and reconnect. The deployment smoke check requires 84 comparison rows and an explicitly labelled demo baseline. There are no new motor commands or numerical tuning changes.

Account coverage: local card persistence across landing/app, unchanged motor draft, real saved-file counts/export, safe rendering of user names, storage denial, empty orders, keyboard focus, RU/EN and 320/390/1280 px. A browser signs in against the real Node account API using an in-memory mail adapter, saves a server card, reloads and logs out without uploading local motor profiles. Server tests check code reuse/expiry/replacement/attempt limits, rate limiting, cross-origin and malformed requests, session expiry/logout, separate users, revision conflicts, disabled checkout and unavailable SMTP. A child-process smoke test exercises the deployed server entry point and confirms that secrets, SQLite, git metadata and server source return 404. No real email or payment is sent. Nodemailer dependency audit reported no known vulnerabilities at preparation time.

Hardware core, motor storage, editor and numeric ride profiles are unchanged. Server account storage is separate. Live SMTP, production hosting, payment confirmation, refunds and server backup restoration are not verified by these simulated tests.

## Earlier regression evidence

3.4.7 compact-layout coverage: syntax checks, 42 Node tests and 30 Edge browser scenarios. All six sections are checked for horizontal overflow at 360/390/640/768/1024/1280/1366/1440 px. Additional RU/EN checks verify that the ride panel precedes navigation and the first profile row's action buttons fit a 1280×720 and 1366×720 viewport. Native estimate controls open and close with the keyboard, remain usable at narrow widths, and send no UART commands. Dark/light laptop and mobile renders were visually inspected. Controller core, storage, simulation and numeric profiles are unchanged.

42 Node tests and 29 browser scenarios include release-specific keys on all runtime assets and an actual browser context primed with an incompatible, cacheable older module before opening the current application.

Guided setup coverage: 41 Node tests and 28 browser scenarios. The additional scenarios exercise navigation-only next actions, offline profile selection, reading without writing, explicit write opt-in, cancellation, confirmed readback, invalid fields, language switching, and reconnect/reload with an older saved backup. Existing failure tests also check that storage errors, unsent blocks and partial writes cannot show a completed setup. Hardware is simulated.

The interface update passed syntax checks, 41 Node tests and 26 Edge browser scenarios on 2026-10-04/05. The added scenario checks Russian field labels and units, unchanged raw field values, accessible names, profile evidence wording and an EN → RU language roundtrip. Dark and light desktop layouts and mobile widths were visually inspected. Core protocol, storage and numeric profiles are unchanged from 3.4.3.

Additional coverage: twelve ride profiles preserve hardware/PAS0/throttle fields and current ceilings at 1/12/18/25/30 A; switching economy → full ahead; actual supplied Penoff.el indices and roundtrip; browser preview/cancel/apply/undo for all twelve modes, category counts and new RU/EN descriptions, no profile-driven UART commands, local named drafts and escaping, downloads, read-only file comparison, rejected malformed comparison and IndexedDB v1 migration with existing backups/preferences.

Profile meters now show raw setting values, not measured tuning quality; previous three-value design ratings were removed in 3.4.8. Default battery capacity is 19.2 Ah as supplied by the owner. The owner reported a verified write and ride on 3.4.2; changes through 3.4.8 have software test coverage only. See BENCH-VALIDATION.md for the exact limits of this evidence.

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

- Subscription demo on both entry pages: RU/EN copy, no-expiry label, keyboard dismissal and focus return, mobile dialog bounds, no form/card inputs, no outbound payment request or navigation, no UART command or changed motor eligibility.
- Animated rider legs change pose, both play controls stay synchronized, and pedaling stops for zero speed, hidden tabs and reduced motion. UI transitions also respect reduced motion.

- Plain-language profile summary reflects the current comparison. Reset-to-motor only replaces the draft, supports undo for valid drafts, discards invalid fields without reapplying them, and is blocked while busy, disconnected or awaiting a new read. Browser checks assert no UART requests and no change to the verified baseline.

- Owner General and Basic capture replay; independent legacy reference packets for all four blocks and every single-bit mutation; all fragmentation boundaries; changed/corrupt/missing second General; checksum convention pinned for the session; legacy backup/write/readback with separate TX rules. Browser replay displays the captured 24 A after a complete read.

- Fixed independent General/Basic/PAS/Throttle vectors, every single-byte corruption, malformed/truncated/extra responses, fragmented reads, wrong block, timeout and disconnect.
- 1200/8N1 options, two-/three-byte ACK, rejected or invalid ACK, per-block readback mismatch, no retry, no interleaving of two writes.
- Write All and all three single-block paths: backup contains read controller data, precedes transmission, is persisted and checked; cancellation, storage failure, invalid limits, unknown firmware and stale data prevent writes.
- `.el` index offsets against original Penoff numeric fixture; roundtrips and boundaries; invalid/partial/duplicate input does not mutate the UI.
- Presets preserve hardware and throttle; motor model and General limits remain separate from simulation choice.
- Correct gearing direction, electrical/mechanical power conversion, PAS-specific range, zero inputs, row-level thermal heuristic, BBSHD 30 A in simulation.
- Fresh and denied IndexedDB, unavailable Web Serial, local backup persistence across reload, complete dynamic RU/EN, light/dark theme persistence.
- Every tab at 360/390/640/768/1024/1280/1366/1440 px; reduced-motion mode; no page overflow; both landing URLs, calculator and application CTA.
- Race HUD shares PAS/current/speed/cadence/range inputs; invalid input clears output; display mode and animation cannot send serial commands. Animation pauses when hidden or reduced motion is enabled.
- Every controller field has a bilingual Penoff guide; keyboard dismissal returns focus; attributions and source links remain visible.
- No console/runtime errors in exercised browser scenarios.

## Still required

Physical restore, independent Penoff verification and write/ACK captures, SZZ9 RPM (V1) and Time of Stop behavior (V2), actual sensor/throttle behavior, Safari/Firefox read-only coverage and screen-reader evaluation. Original v3.0 DoD is intentionally not reported as fully complete. Hardware acceptance criteria are in `ROADMAP.md`.
