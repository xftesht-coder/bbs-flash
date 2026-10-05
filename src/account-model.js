/* Shared validation for the optional account service. Never a motor profile. */
(function (root) {
  "use strict";
  const fields = {name: 60, bike: 100, battery: 100, display: 60};
  function profile(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("PROFILE");
    const result = {};
    for (const [key, limit] of Object.entries(fields)) {
      const text = value[key] ?? "";
      if (typeof text !== "string" || text.length > limit || /[\u0000-\u001f\u007f]/.test(text)) throw Error("PROFILE");
      result[key] = text.trim();
    }
    for (const [key, min, max, integer] of [["voltage",24,60,false],["capacity",1,100,false],["chainring",20,60,true]]) {
      const raw = value[key];
      if (raw === "" || raw === null || raw === undefined) { result[key] = null; continue; }
      if (typeof raw !== "number" && typeof raw !== "string") throw Error("PROFILE");
      const n = Number(raw);
      if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw Error("PROFILE");
      result[key] = n;
    }
    return result;
  }
  const api = {profile, empty: () => profile({})};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BBSAccountModel = api;
})(globalThis);
