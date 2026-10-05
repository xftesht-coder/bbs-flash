(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let lang = "ru",
    dark = true;
  const english = {
    rideOpen: "Choose a ride profile →",
    rideEyebrow: "RIDE PROFILES · BBS02 750 W",
    rideTitle: "From a relaxed cruise to Full ahead",
    rideText: "12 ride characters: from economy and smooth starts to acceleration, long climbs, technical trails, touring and workouts. Each includes an explanation, tradeoffs and an exact preview before applying.",
    rideLocal: "Save your own variants with notes, compare .el files and revisit controller backups. Everything stays in this browser. Profiles are starting points for testing, not tunes verified on your motor.",
    creditsTitle: "Built on BafangConfigTool",
    creditsText:
      "BBS Flash builds on BafangConfigTool's parameters, .el format and BBS UART behavior. Stefan Penov (Penoff) improved the original Bafang application; his application, source code and guide were the starting point for our browser version.",
    creditsOurs:
      "Our contribution is the garage interface, estimates and profile comparison, write checks and local backups. This is an independent adaptation; no endorsement by Bafang or Penoff is claimed.",
    creditsLink: "Penoff's original application and description ↗",
    dark: "Dark theme",
    light: "Light theme",
    eyebrow: "An open tool for Bafang UART",
    title: "Your BBS02. Your rhythm.",
    lead: "Open .el profiles, compare pedal assist and estimate range in your browser. A motor connection is needed only for reading and writing.",
    open: "Open configurator →",
    howLink: "How it works",
    experimental:
      "For BBS02 750 W: HZXT SZZ9 / HW 1.1 / FW 2.0.1.1 / 48 V / controller maximum 25 A. Writes require reading, a saved backup and explicit opt-in. Other controllers are read-only.",
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
      "Writes are limited to HZXT SZZ9 / HW 1.1 / FW 2.0.1.1 / 48 V / controller maximum 25 A. Secure the bike and keep the driven wheel clear.",
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
      "Checksums, backups, limits and readback do not guarantee hardware safety. Incorrect current or calibration may cause overheating or unexpected motion. The owner reported a verified write and a ride with Full ahead on version 3.4.2. Changes in 3.4.3 through 3.4.6 have software test coverage; a physical restore remains unconfirmed.",
    support: "Which controllers are supported?",
    supportText:
      "BBS UART General, Basic, PAS and Throttle reads with length and checksum validation. Writes are limited to the exact HZXT SZZ9 configuration listed above; BBS01, BBSHD and other hardware or firmware revisions remain read-only. Selecting a simulated model does not extend compatibility.",
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
    $("language").setAttribute("aria-label", lang === "ru" ? "Язык" : "Language");
    document.title = lang === "ru" ? "BBS Flash · Настройка BBS02" : "BBS Flash · BBS02 settings";
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
  apply();
})();
