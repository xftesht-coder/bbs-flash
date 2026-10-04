# Bafang UART and `.el` implementation notes

Settings protocol only, 1200 baud, 8 data bits, no parity, 1 stop bit, no flow control. No CAN or display emulation. This is a reverse-engineered protocol, not a Bafang compatibility guarantee.

## Sources reviewed

- [Penoff tool/source archive already in this repository](../assets/BBSTool.zip): `BBSTool/Source/Communication.pas`, `CommonFunctions.pas`, `Main.pas`, `Main.dfm`, `DefaultProfile.el`. The test fixture is the original numeric DefaultProfile; no claim that those values suit a 48 V bike.
- [lijon/BafangWebConfig at 31b10aad](https://github.com/lijon/BafangWebConfig/blob/31b10aad338b57f7a5fffbdbabbd85d26e310f4f/app.js): independent `.el` conversions and General frame length.
- [OpenBafangTool at 56403517](https://github.com/andrey-pr/OpenBafangTool/blob/564035177ac0f1b89b5502c4965b16c8b991dbff/src/device/high-level/BafangUartMotor.ts): additive response checksum, short ACK parsing and outgoing checksum. See also its `docs/Bafang UART protocol.md`.
- [Chrome Web Serial documentation](https://developer.chrome.com/docs/capabilities/serial): secure contexts, port permission, readable/writable streams and disconnect behavior.

## Legacy RX checksum (3.4.2)

The owner's General capture is preserved in tests/fixtures/szz9-general-capture.json. The subsequent screenshot supplied the Basic frame ending in 0x62, preserved in tests/fixtures/legacy-rx.json. General reports HZXT / SZZ9 / HW 1.1 / FW 2.0.1.1 / 48 V / maximum 25 A; Basic contains a configured current limit of 24 A. Neither response is a write or a physical readback test.

[philippsandhaus/bafang-python's protocol notes](https://github.com/philippsandhaus/bafang-python/blob/master/README.md) independently publish General, Basic, PAS and Throttle response examples. Their bytes are retained as fixed test fixtures. All six distinct packets satisfy this inferred rule:

RX checksum = (block + 2 + sum(payload)) modulo 256.

The length byte is checked against the exact block length, but contributes the constant 2 to this checksum. This is an inference from the captured packets, not an official firmware specification or a guarantee for other controllers. The observed versus old additive checksums (hex) are:

| Packet | Observed / legacy | Old block + length + payload |
| --- | --- | --- |
| Owner General | 22 | 30 |
| Owner Basic | 62 | 78 |
| Reference General | 1b | 29 |
| Reference Basic | df | f5 |
| Reference PAS | 27 | 30 |
| Reference Throttle | ac | b0 |

The exact-byte General exception from 3.4.1 is removed. The first General chooses legacy or additive checksum; legacy requires a second identical General before exposing device identity. The chosen rule is pinned for every read in that session, including backup and write readback. A settings packet cannot change checksum convention to pass validation. No byte is ignored, corrected or discarded. General still requires printable identity and valid voltage/current fields. Unknown device identities remain read-only.

The additive convention from OpenBafangTool is retained for controllers using it. Public decode/checkFrame functions keep additive as their default for API compatibility; session reads always supply the detected convention explicitly. Outgoing write checksums and ACK handling are unchanged.

## Frames

Read General request: `11 51 04 B0 05`. Basic/PAS/Throttle read requests: `11 52`, `11 53`, `11 54` (hex).

RX: `[block, payloadLength, payload..., checksum]`, using the session-pinned checksum convention above. Exact expected payload lengths: General 16, Basic 24, PAS 11, Throttle 6. Total General response is 19 bytes. The parser requires the currently requested block, exact length and checksum. It accumulates fragmented streams; extra bytes, malformed frames and timeout invalidate the session. No attempt is made to silently resynchronize an ambiguous response and continue writing.

Write TX: `[16, block, payloadLength, payload..., checksum]` in hex notation for the `16` command; checksum excludes that command byte and includes block, length and payload. The test golden PAS vector ends in `CD` (205 decimal). All fields are validated before Uint8Array conversion.

Two-byte ACK `[block,status]` is retained for Penoff-style compatibility; three-byte ACK `[block,status,checksum]` is also accepted with additive checksum. Status must equal the exact payload length for success. A 60 ms wait distinguishes a two-byte reply from a fragmented three-byte reply. An 80 ms quiet interval precedes each request. Firmware has no request identifier: a delayed reply with the same opcode cannot be cryptographically correlated. ACK alone is therefore never a success result; matching per-block and full readback is required. Bench testing must verify actual timing and ACK shape.

## `.el` dropdown indexes

The original file stores UI indices, not always wire values:

- Assist: file 0 → wire 255 (display); file 1…10 → wire 0…9.
- Speed limit: file 0 → wire 255; file 1…26 → wire 15…40.
- Slow-start: file 0…7 → wire 1…8.
- Work mode: file 0 → wire 255 (`null` in state); file 1…71 → wire 10…80.
- Wheel: file index 0…15 over 16…27, 700C, 28…30. Wire uses doubled inches, with code 55 for 700C. Unknown wheel bytes are rejected, not rounded. Measured tire circumference is an independent simulation input.

Basic speed sensor type occupies the top two bits and signals the lower six; internal type 2 maps to wire type 3. Reserved wire type 2 is rejected. `.el` parsing requires all three sections and known fields, rejects duplicate/unknown sections and keys, and never merges a partial file into the live draft.

## Evidence boundary

`tests/helpers.cjs` frames are manually specified, reference-shaped **synthetic vectors**, not hardware captures. They provide independent expected bytes for corruption and serializer tests. Separate fixtures preserve owner General/Basic/PAS/Throttle captures and independent reference responses for all four blocks. Replaying them is not a fresh physical connection test. The owner reported a complete successful read on 2026-09-26, then confirmed a verified write and a ride on 3.4.2 on 2026-09-30. No write/ACK capture or independent Penoff comparison was supplied. Physical write/ACK captures and restore, Time of Stop behavior and RPM remain open in the roadmap.

## Transaction boundary (3.4.3)

readAndBackup owns the initial stable double read and awaits the verified storage callback before establishing a private, connection-bound baseline. The UI loads controller data only after that succeeds. safeWrite requires that baseline and a confirmation callback; it compares fresh stable data with the baseline before asking for confirmation, persists a fresh pre-write backup, then rechecks after confirmation. Only safeWrite can authorize low-level write requests. Callback inputs are copies.

A verified full readback advances the editing baseline; the original pre-write backup remains available. Partial/uncertain writes close and invalidate the session in core, independently of UI handling. A reconnect requires a new backed-up read. This prevents accidental application-code bypass, not malicious same-origin code running with the same browser privileges.
