# Changelog

## 3.4.1 — 2026-09-26 · Physical General compatibility

- Fix connection rejection for the owner's exact HZXT SZZ9 HW 1.1 General capture (trailer 0x22, additive expectation 0x30). Match all 19 bytes and require a second identical reply; do not generalize an unknown checksum rule.
- Label capture-based compatibility in device information and preserve raw capture in backups. Basic/PAS/Throttle validation and write gates remain unchanged.
- Add physical-capture regression tests, fragmentation at every boundary, bit corruption and unstable second reply checks, plus browser connection/read coverage.

## 3.4.0 — 2026-09-26 · Specialist rides

- Expand the catalogue to 12 bilingual profiles: acceleration, sustained climbing, technical trails, long-distance touring and rider workouts join the original seven.
- Explain the concrete use case, difference from similar tunes and limitations of each new profile. Preserve existing controller eligibility, hardware fields, global current and review-before-apply behavior.
- Derive displayed catalogue counts from profile data; update the landing page, comparison choices and release verification.
- Extend current-ceiling/roundtrip tests to all 12 profiles, verify distinct tuning intent, and exercise all profiles plus category counts and new RU/EN details in the browser.

## 3.3.0 — 2026-09-26 · Ride Garage

- Seven bilingual BBS02 ride cards with intended feel, tradeoffs, explicit untested status, qualitative character meters and exact numeric previews. Preserve global current and hardware fields; cap assistance through PAS percentages.
- Start paths for exploring profiles, opening .el and connecting; owner-supplied Roscoe kit with 19.2 Ah capacity and clearly labeled calculation assumptions.
- Named local draft snapshots and notes, previewed loading, one-step undo, .el downloads, full controller backup history and raw JSON export. IndexedDB v1 → v2 migration preserves existing data.
- PAS current comparison graph and a second user-supplied .el for A/B comparison without mutating the draft.
- Real Penoff.el archive fixture, profile current/field-preservation tests, browser coverage for preview/cancel/apply, persistence, storage migration, file comparison and no serial traffic from profile browsing.
- Added profile rationale and a concrete bench/calibration protocol. Physical motor validation and calibrated prediction accuracy remain outstanding; experimental write eligibility is unchanged.

## 3.2.1 — 2026-09-17

- Preserve the space between the two Russian landing headline sentences when initializing or switching language. Race Garage behavior and safety policy are unchanged.

## 3.2.0 — 2026-09-17 · Race Garage

- Compact garage layout with numbered navigation, dense controls, a side-by-side Basic/PAS editor and dark/day themes. Self-hosted Russo One and original SVG bicycle artwork.
- Estimate HUD shares the simulator scenario: PAS selection, flat/climb speed, cadence, current ceiling and range. Animation is opt-in, pauses when hidden and respects reduced motion. Invalid inputs clear stale readings. No serial operations are triggered by the HUD.
- RU/EN parameter guide explains meaning, adjustment effects and firmware limits, based on Penoff’s manual. Bafang and Stefan Penov are credited in the app, landing, README and source acknowledgements.
- Added browser coverage for guide navigation, HUD consistency, animation lifecycle and compact responsive layouts; deployment verification includes the new modules, stylesheet and font.
- Controller validation, protocol framing, backup-before-write and readback policy remain unchanged from 3.1.0. Physical hardware qualification remains outstanding.

## 3.1.0 — 2026-09-17

Safety and correctness release following the technical audit of `8e04959`.

- Every write path now uses the same validation, two matching reads, durable verified backup, change preview, stale-data check and per-block/final readback.
- Unknown firmware is read-only. Known SZZ9 writes are experimental, off by default and require session opt-in. **No physical motor testing is claimed.**
- Enforced General current/voltage limits; rejected NaN, fractions, invalid throttle ranges and incomplete imports before serializing bytes.
- Strict response length, block and checksum validation; one operation at a time; timeout/disconnect invalidates identity. No automatic retries or rollback after uncertain writes.
- Corrected Penoff `.el` dropdown offsets for speed limit, slow-start and work mode. Presets preserve hardware and throttle settings and cannot raise total current.
- Fixed IndexedDB startup race and storage failure handling. Added downloadable raw/.el backups and an explicit restore-to-draft flow.
- Shared physics across simulator, Reality Check and range: correct gearing, units, efficiency, PAS current, zero values, wheel circumference and configurable Crr/CdA. Row-level current drives the load warning.
- Replaced the hidden mobile sidebar with accessible navigation; added complete RU/EN and light/dark themes. Removed the unvalidated launch score and continuous animation.
- Published a real landing entry point with a corrected calculator and working links. Removed unsupported testimonials, nonfunctional contact form, unsafe cabling claims and safety guarantees.
- Added dependency-locked browser tests, protocol tests, CI, release notes, deployment instructions and a staged roadmap. Historical app URLs route to the current application.

The scope is the software release. Original v3.0 hardware DoD, validated thermal modeling, rally animation, offline PWA and universal auto-detection remain open and are tracked in `ROADMAP.md`.
