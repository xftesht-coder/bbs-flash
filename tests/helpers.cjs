const profile = {
  bas: {
    LBP: 41,
    LC: 18,
    ALC: [0, 15, 22, 30, 40, 50, 60, 72, 86, 100],
    ALBP: [0, 30, 40, 52, 64, 76, 86, 93, 100, 100],
    WD: 11,
    SMType: 0,
    SMSig: 1,
  },
  pas: {
    PT: 3,
    DA: 255,
    SL: 255,
    SC: 10,
    SSM: 4,
    SDN: 4,
    WM: null,
    TS: 25,
    CD: 8,
    SD: 0,
    KC: 60,
  },
  thr: { SV: 11, EV: 35, MODE: 1, DA: 255, SL: 255, SC: 10 },
};
// Independently specified reference-shaped frames, NOT real hardware captures.
const frames = {
  81: [
    81, 16, 72, 90, 88, 84, 83, 90, 90, 57, 49, 48, 50, 48, 49, 49, 2, 25, 47,
  ],
  82: [
    82, 24, 41, 18, 0, 15, 22, 30, 40, 50, 60, 72, 86, 100, 0, 30, 40, 52, 64,
    76, 86, 93, 100, 100, 54, 1, 56,
  ],
  83: [83, 11, 3, 255, 255, 10, 4, 4, 255, 25, 8, 0, 60, 205],
  84: [84, 6, 11, 35, 1, 255, 255, 10, 145],
};
function checksumFrame(bytes) {
  let total = 0;
  for (const byte of bytes) total = (total + byte) % 256;
  return [...bytes, total];
}
class FakePort {
  constructor() {
    this.frames = structuredClone(frames);
    this.sent = [];
    this.options = null;
    this.intercept = null;
    this.ack3 = false;
    this.closed = false;
  }
  async open(options) {
    this.options = options;
    this.closed = false;
    this.readable = new ReadableStream({
      start: (c) => (this.controller = c),
      cancel: () => {
        this.closed = true;
      },
    });
    this.writable = new WritableStream({
      write: (bytes) => {
        const sent = [...bytes];
        this.sent.push(sent);
        let reply;
        if (bytes[0] === 17) reply = this.frames[bytes[1]];
        else {
          this.frames[bytes[1]] = checksumFrame([
            bytes[1],
            bytes[2],
            ...bytes.slice(3, -1),
          ]);
          reply = this.ack3
            ? checksumFrame([bytes[1], bytes[2]])
            : [bytes[1], bytes[2]];
        }
        if (this.intercept) reply = this.intercept(sent, reply, this);
        if (reply) this.emit(reply);
      },
    });
  }
  emit(bytes) {
    queueMicrotask(() => {
      if (!this.closed) this.controller.enqueue(new Uint8Array(bytes));
    });
  }
  async close() {
    this.closed = true;
  }
  disconnect() {
    this.controller.close();
  }
}
module.exports = { profile, frames, checksumFrame, FakePort };
