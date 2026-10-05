# Changelog

## 3.4.8 — 2026-10-05 · Seven-value profile comparison

- Replace three fixed subjective ratings with seven before/after values computed from actual settings: pedal response, initial pickup, assist ramp, PAS 5 current, PAS 9 current, keep current and PAS 5 speed percentage.
- Show the current comparison source and draft separately. Use the last verified motor baseline while the connection remains valid; otherwise label demo/draft values explicitly. Choosing a preset does not advance the motor baseline.
- Explain changed ride behavior on every card and all seven settings in profile details. Keep current limits, rounding and relative speed percentages visible rather than promising measured acceleration or range.
- Refresh comparisons after edits, imports, undo, partial/full verified writes, failed writes and reconnect. Profile previews remain read-only until explicit draft application.
- Add a plain-language starting/ramp/riding summary in profile details and move the review action beside the profile name. Offer reversible reset of the draft to the last verified motor read; disconnected and uncertain sessions cannot use it.
- Make a gray-white retro desktop theme the default, with striped window headings, compact frames, cyan actions, violet changed values and magenta accents. Match the cyclist illustration to the palette; retain the dark option and saved preferences.
- Redraw the trail rider and bike with a full-face helmet, detailed frame and cadence-linked leg/crank motion. Add an on-scene play/pause control and short interface transitions, all respecting reduced motion.
- Add a personal cabinet on both entry pages with a local bike card, actual saved profiles/backups, export and purchase history. Prepare a separate SMTP email-code account service with isolated server bike cards, revocable sessions and optimistic concurrency. Static hosting remains local-only; SMTP and server deployment are not configured.
- Prepare one-time lifetime access per user, with a clearly labelled Pay demo. Checkout and commercial access gates remain disabled; no payment or successful purchase is simulated. Document the remaining launch work.
- Preserve compact top ride panel, cache keys, controller protocol, storage and numerical tuning. Remove obsolete static three-value ratings.

## 3.4.7 — 2026-10-05 · Compact layout for everyday screens

- Move the cyclist and ride estimates above the workspace; put optional estimate controls in a keyboard-accessible disclosure.
- Use horizontal section navigation and the full content width. Reduce padding, combine the setup actions, and collapse bike assumptions into a compact summary.
- Show three smaller profile cards per row on laptops, two on tablets and one on phones. The first row's actions fit a 1280×720 viewport in RU and EN.
- Verify all sections at eight widths from 360 to 1440 px, the estimate disclosure and the existing simulated write/backup/readback journey. Preserve protocol, storage and numeric profiles.

## 3.4.6 — 2026-10-05 · Browser cache compatibility

- Version every runtime script and stylesheet URL so an updated page bypasses modules retained from an older release.
- Check every asset cache key against the release version and reproduce an incompatible module cached in the same browser context.
- Retain the guided setup and verified-write workflow from 3.4.5.

## 3.4.5 — 2026-10-05 · Guided motor setup

- Show connection, backed-up reading, draft editing and verified writing as separate setup steps with contextual next actions.
- Keep next-step buttons as navigation only: they never open a serial port, enable writes or send controller commands.
- Distinguish current-session backups from saved history, incomplete writes from success, and remaining draft edits after single-block writes.
- Clear stale profile messages and undo state when reading or a verified write establishes a new baseline.
- Add browser regressions for the complete guided journey, reconnect/reload, denied storage and failed readback. Preserve UART framing and numerical profiles.

## 3.4.4 — 2026-10-05 · Clearer interface and Russian copy

- Replace the dense race skin with a calm, responsive dark/light interface and readable system typography.
- Simplify navigation, profile cards and start actions; label the ride panel as an estimate.
- Correct Russian parameter names, units, accessible labels and backup/profile evidence copy.
- Preserve the UART core, write gates and numeric ride profiles.


## 3.4.3 — 2026-10-04 · Foundation workflow repairs

- Audit the current module/dependency boundaries; prioritize Audit → Cleanup → Core → Safety → Tests → UI without adding ride features.
- Keep one landing page with a legacy redirect. Preserve original Penoff sources and protective old entry points.
- Require a stable, backed-up read before exposing controller data for editing. Core owns connection-bound write readiness and rejects stale editing baselines or unauthorized low-level writes.
- Core closes uncertain write sessions; callbacks receive copies; successful full verification advances the baseline.
- Confirm replacement of modified drafts on Read All. Preserve unsent changes when writing one block.
- Replay all four owner response blocks through the full workflow; add storage, stale-edit, bypass and UI regressions.
- Restrict writes to the owner's exact HZXT SZZ9 / HW 1.1 / FW 2.0.1.1 / 48 V / maximum 25 A configuration; reject other revisions and current ratings.
- Record the owner's confirmation of a verified write and ride with Full ahead on 3.4.2. The 3.4.3 changes are software-tested; physical restore and independent Penoff verification remain outstanding.

## 3.4.2 — 2026-09-26 · Legacy UART read checksums

- Replace the exact General exception with a session-pinned legacy RX rule, inferred from owner General/Basic captures and independent examples of all four response blocks.
- Verify block + 2 + payload on legacy reads; keep outgoing write and ACK rules unchanged. Never switch convention to accept an invalid settings/readback frame.
- Add independent capture fixtures, bit-corruption and mixed-convention rejection, fragmented streams, legacy backup/write/readback and browser regression showing the real 24 A Basic setting.
- Physical complete read/write/restore remains unverified; no controller setting is changed by connecting or reading.

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
