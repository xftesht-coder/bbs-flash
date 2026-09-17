(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let lang = "ru",
    dark = false;
  const english = {
    dark: "Dark theme",
    light: "Light theme",
    eyebrow: "An open tool for Bafang UART",
    title: "Understand the settings. Then change them.",
    lead: "Open .el profiles, compare pedal assist and estimate range in your browser. A motor connection is needed only for reading and writing.",
    open: "Open configurator →",
    howLink: "How it works",
    experimental:
      "Writes are experimental: covered by software tests, but not tested on a physical motor. Explicit opt-in is required for the known SZZ9 signature. Unknown controllers are read-only.",
    backup: "Backup before writing",
    backupText:
      "Two matching reads, a saved original and a change preview. After writing, settings are read again. This reduces risk; it does not eliminate it.",
    physics: "Transparent calculations",
    physicsText:
      "Gearing, mass, efficiency and the selected PAS affect results. Range and speed are estimates, not sensor readings.",
    local: "Your data stays local",
    localText:
      "Profiles are not uploaded to a cloud. Backups are stored in the browser and can be downloaded.",
    howTitle: "From draft to a verified change",
    step1:
      "Without a connection: open an .el profile, compare PAS and explore calculations.",
    step2:
      "To connect: desktop Chrome or Edge, HTTPS and a compatible Bafang UART programming cable. Check your hardware pinout; CAN is not supported.",
    step3:
      "Read all blocks. The controller supplies its maximum current and voltage class.",
    step4:
      "Experimental writes are limited to HZXT SZZ9 / FW 2.0.1.1 / 48 V. Secure the bike and keep the driven wheel clear.",
    step5:
      "Download a backup and review the exact changes before writing. After a connection failure, read the controller again: multi-block writes are not atomic.",
    calcTitle: "Gearing speed ceiling",
    calcHelp:
      "A geometric estimate without power, display or load limits. Measure the circumference of your own tire for a better input.",
    front: "Front chainring, teeth",
    rear: "Rear sprocket, teeth",
    circ: "Tire circumference, m",
    rpm: "Cadence, rpm",
    kmh: "km/h",
    formula: "Cadence × front / rear × circumference × 60 / 1000.",
    faq: "Before connecting",
    phones: "Can I use a phone?",
    phonesText:
      "Editing and calculations adapt to a phone screen. This release does not provide a motor connection in mobile browsers.",
    safe: "How safe are writes?",
    safeText:
      "Checksums, backups, limits and readback do not guarantee hardware safety. Incorrect current or calibration may cause overheating or unexpected motion. This version has not yet been verified on physical hardware.",
    support: "Which controllers are supported?",
    supportText:
      "Standard BBS UART General, Basic, PAS and Throttle reads with length and checksum validation. Experimental writes are limited to one known signature; BBS01, BBSHD and unknown firmware remain read-only. Selecting a simulated model does not extend compatibility.",
    feedback: "Found a problem or ready for a bench test?",
    feedbackText:
      "Use GitHub Issues to share the model, firmware version, reproduction steps and serial log. Do not post personal information.",
    issue: "Open GitHub Issues ↗",
    roadmap: "Future roadmap ↗",
  };
  const russian = {};
  document
    .querySelectorAll("[data-t]")
    .forEach((el) => (russian[el.dataset.t] = el.textContent));
  russian.light = "Светлая тема";
  function apply() {
    document.documentElement.lang = lang;
    document
      .querySelectorAll("[data-t]")
      .forEach(
        (el) =>
          (el.textContent = (lang === "en" ? english : russian)[el.dataset.t]),
      );
    $("theme").textContent = (lang === "en" ? english : russian)[
      dark ? "light" : "dark"
    ];
    calc();
  }
  function calc() {
    const ids = ["cFront", "cRear", "cCirc", "cRpm"];
    if (ids.some((id) => !$(id).checkValidity() || $(id).value === "")) {
      $("cOut").textContent = "—";
      $("calcError").textContent =
        lang === "en"
          ? "Enter values within the specified ranges."
          : "Введи значения в допустимых диапазонах.";
      return;
    }
    $("calcError").textContent = "";
    $("cOut").textContent = BBSCore.gearLimit({
      chainring: Number($("cFront").value),
      cog: Number($("cRear").value),
      circumference: Number($("cCirc").value),
      rpm: Number($("cRpm").value),
    }).toFixed(1);
  }
  $("language").onchange = () => {
    lang = $("language").value;
    apply();
  };
  $("theme").onclick = () => {
    dark = !dark;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    apply();
  };
  ["cFront", "cRear", "cCirc", "cRpm"].forEach((id) =>
    $(id).addEventListener("input", calc),
  );
  calc();
})();
