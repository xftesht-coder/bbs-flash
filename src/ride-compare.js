/* Read-only presentation values. No measured acceleration, range or safety scores. */
(function (root, factory) {
  const api = factory(typeof module === "object" ? require("./core.js") : root.BBSCore);
  if (typeof module === "object") module.exports = api;
  else root.BBSRideCompare = api;
})(globalThis, (C) => {
  "use strict";
  const specs = [
    { id: "response", unit: "pulses", max: 20, inverse: true, value: p => p.pas.SDN },
    { id: "pickup", unit: "percent", max: 100, value: p => p.pas.SC },
    { id: "acceleration", unit: "code", max: 8, inverse: true, value: p => p.pas.SSM },
    { id: "middle", unit: "amp", max: 30, value: p => p.bas.LC * p.bas.ALC[5] / 100 },
    { id: "peak", unit: "amp", max: 30, value: p => p.bas.LC * p.bas.ALC[9] / 100 },
    { id: "cruise", unit: "percent", max: 100, value: p => p.pas.KC },
    { id: "speed", unit: "percent", max: 100, value: p => p.bas.ALBP[5] },
  ];
  function compare(before, after) {
    C.validate(before); C.validate(after);
    return specs.map(({ id, unit, max, inverse, value }) => {
      const a = value(before), b = value(after);
      const changed = Math.abs(b - a) > 1e-9;
      return { id, unit, max, before: a, after: b, changed,
        direction: changed ? Math.sign(b - a) * (inverse ? -1 : 1) : 0 };
    });
  }
  return { compare };
});
