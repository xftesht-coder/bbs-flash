/* Visual-only race HUD. Shares estimates with the editor; never uses serial. */
globalThis.BBSDash = (() => {
  const $ = (id) => document.getElementById(id),
    media = matchMedia("(prefers-reduced-motion: reduce)");
  let last = null,
    playing = false,
    mode = "climb";
  function motion() {
    const active =
      playing && !document.hidden && !media.matches && last?.speed > 0;
    $("raceHud").dataset.running = String(!!active);
    $("previewToggle").setAttribute("aria-pressed", String(playing));
  }
  function update({ row, scenario, estimate }) {
    const speed = mode === "flat" ? row.flatKmh : row.climbKmh,
      rpm = BBSCore.cadence(speed, scenario);
    last = { speed };
    $("raceHud").dataset.valid = "true";
    $("raceHud").dataset.terrain = mode;
    $("hudSpeed").textContent = speed.toFixed(1);
    $("hudCurrent").textContent = row.currentA.toFixed(1);
    $("hudCadence").textContent = rpm.toFixed(0);
    $("hudRange").textContent =
      estimate.km === null ? "—" : estimate.km.toFixed(1);
    $("hudModel").textContent = scenario.model;
    $("hudGear").textContent = `${scenario.chainring} / ${scenario.cog} T`;
    $("hudSlope").textContent = (mode === "flat" ? 0 : scenario.grade) + "%";
    $("hudNeedle").setAttribute(
      "transform",
      `rotate(${-115 + Math.min(speed / 60, 1) * 230} 120 100)`,
    );
    $("raceHud").style.setProperty(
      "--wheel-time",
      (speed > 0 ? Math.max(0.15, scenario.circumference / (speed / 3.6)) : 4) +
        "s",
    );
    $("raceHud").style.setProperty(
      "--track-time",
      (speed > 0 ? Math.max(0.3, 10 / (speed / 3.6)) : 4) + "s",
    );
    $("hudCurrentBar").value = row.currentA;
    $("hudCadenceBar").value = rpm;
    document
      .querySelectorAll("[data-hud-pas]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.hudPas) === scenario.level),
        ),
      );
    $("hudRisk").hidden = !(row.currentA >= 22 && rpm < 60);
    motion();
  }
  function clear() {
    last = null;
    $("raceHud").dataset.valid = "false";
    for (const id of ["hudSpeed", "hudCurrent", "hudCadence", "hudRange"])
      $(id).textContent = "—";
    $("hudCurrentBar").value = $("hudCadenceBar").value = 0;
    $("hudNeedle").setAttribute("transform", "rotate(-115 120 100)");
    $("hudRisk").hidden = true;
    motion();
  }
  function init(onChange) {
    for (let i = 0; i < 10; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = i;
      b.dataset.hudPas = i;
      b.setAttribute("aria-label", `PAS ${i}`);
      b.setAttribute("aria-pressed", String(i === 9));
      b.onclick = () => {
        if ($("sim-level").disabled) return;
        $("sim-level").value = i;
        onChange();
      };
      $("hudPas").append(b);
    }
    document.querySelectorAll("button[data-terrain]").forEach(
      (b) =>
        (b.onclick = () => {
          mode = b.dataset.terrain;
          document
            .querySelectorAll("button[data-terrain]")
            .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          onChange();
        }),
    );
    $("previewToggle").onclick = () => {
      playing = !playing;
      motion();
    };
    document.addEventListener("visibilitychange", motion);
    media.addEventListener("change", motion);
  }
  return { init, update, clear };
})();
