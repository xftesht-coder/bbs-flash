# BBS Flash 3.2.1 — Race Garage

[Open the garage](https://xftesht-coder.github.io/bbs-flash/bbs-flash.html) · [Landing](https://xftesht-coder.github.io/bbs-flash/) · [Roadmap](https://github.com/xftesht-coder/bbs-flash/blob/main/ROADMAP.md)

This patch preserves the word spacing in the Russian landing headline when switching language.

A compact indie-racing garage for tuning an electric bike: numbered navigation, a dense PAS table, dark and day themes, a drawn bicycle scene and an instrument panel. Select a PAS level or flat/climb view to inspect the same estimates used by the simulator. The optional animation pauses on a hidden tab and respects reduced-motion preferences.

Every controller field now has a RU/EN guide explaining its purpose, effects and limits. **BBS Flash builds on BafangConfigTool, improved by Stefan Penov (Penoff).** His application, source and manual are the foundation; our contribution is the browser interface, estimates, comparisons and validation/backup workflow. See [Penoff’s original project](https://penoff.me/2016/01/13/e-bike-conversion-software/) and [credits](https://github.com/xftesht-coder/bbs-flash/blob/main/docs/CREDITS.md).

The 3.1.0 write safeguards are retained: controller-derived limits, strict frames/checksums, durable verified backup, change preview, stale-data protection and readback. The HUD is an estimate, not telemetry or motor control. **Physical hardware qualification is outstanding:** experimental writes stay off by default and limited to the recognized HZXT SZZ9 / FW 2.0.1.1 / 48 V signature. Unknown controllers remain read-only.

Validation covers protocol/codec/physics regression tests, synthetic Web Serial write paths, the new guide and HUD, responsive RU/EN layouts, storage failures and deployed file hashes/browser behavior. Next: hardware fixtures and read/write/restore qualification, calibrated estimates and backup history. Details in the roadmap.
