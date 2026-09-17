# BBS Flash 3.1.0 — safety and correctness

[Open the app](https://xftesht-coder.github.io/bbs-flash/bbs-flash.html) · [Landing](https://xftesht-coder.github.io/bbs-flash/) · [Roadmap](https://github.com/xftesht-coder/bbs-flash/blob/main/ROADMAP.md)

Fixed the critical write paths found in the audit: controller-derived limits, strict frame checks, verified backup before every write, change preview, stale-data protection and readback. Corrected `.el` conversions, preset hardware preservation, IndexedDB initialization, range/gearing calculations, mobile navigation and RU/EN. The landing now opens the application and accurately describes the release.

Validation includes protocol/codec/physics regression tests, headless browser scenarios with synthetic Web Serial, responsive layouts, storage failures and deployed HTTPS content verification. See [test coverage](https://github.com/xftesht-coder/bbs-flash/blob/main/docs/TESTING.md).

**Hardware qualification is outstanding.** Writes are off by default and experimental for the recognized HZXT SZZ9 / FW 2.0.1.1 / 48 V signature only. Unknown controllers remain read-only. Software mocks do not establish physical compatibility. Never infer motor temperature or guaranteed range from the simulator. Read the [safety limits](https://github.com/xftesht-coder/bbs-flash/blob/main/docs/SAFETY.md).

Next: captured hardware fixtures, verified read/write/restore, real RPM and Time of Stop measurements; then a validated compatibility matrix, better parameter explanations and calibrated estimates. PWA and animation remain later work.
