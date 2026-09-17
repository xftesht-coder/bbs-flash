# Changelog

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
