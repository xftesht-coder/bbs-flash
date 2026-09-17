# Bafang UART and `.el` implementation notes

Settings protocol only, 1200 baud, 8 data bits, no parity, 1 stop bit, no flow control. No CAN or display emulation. This is a reverse-engineered protocol, not a Bafang compatibility guarantee.

## Sources reviewed

- [Penoff tool/source archive already in this repository](../assets/BBSTool.zip): `BBSTool/Source/Communication.pas`, `CommonFunctions.pas`, `Main.pas`, `Main.dfm`, `DefaultProfile.el`. The test fixture is the original numeric DefaultProfile; no claim that those values suit a 48 V bike.
- [lijon/BafangWebConfig at 31b10aad](https://github.com/lijon/BafangWebConfig/blob/31b10aad338b57f7a5fffbdbabbd85d26e310f4f/app.js): independent `.el` conversions and General frame length.
- [OpenBafangTool at 56403517](https://github.com/andrey-pr/OpenBafangTool/blob/564035177ac0f1b89b5502c4965b16c8b991dbff/src/device/high-level/BafangUartMotor.ts): additive response checksum, short ACK parsing and outgoing checksum. See also its `docs/Bafang UART protocol.md`.
- [Chrome Web Serial documentation](https://developer.chrome.com/docs/capabilities/serial): secure contexts, port permission, readable/writable streams and disconnect behavior.

These sources disagree on some firmware behavior. General response checksum is enforced as the additive regular-frame format in OpenBafangTool. A source example with an unexplained checksum is not accepted as proof of an alternate rule. If physical firmware differs, connection fails closed until an independently verified fixture and variant parser are added.

## Frames

Read General request: `11 51 04 B0 05`. Basic/PAS/Throttle read requests: `11 52`, `11 53`, `11 54` (hex).

Regular RX: `[block, payloadLength, payload..., checksum]`, checksum = sum of all preceding bytes modulo 256. Exact expected payload lengths: General 16, Basic 24, PAS 11, Throttle 6. Total General response is 19 bytes. The parser requires the currently requested block, exact length and checksum. It accumulates fragmented streams; extra bytes, malformed frames and timeout invalidate the session. No attempt is made to silently resynchronize an ambiguous response and continue writing.

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

`tests/helpers.cjs` frames are manually specified, reference-shaped **synthetic vectors**, not hardware captures. They provide independent expected bytes for corruption and serializer tests. Physical General/ACK variants, Time of Stop behavior, RPM and restore compatibility remain open in the roadmap.
