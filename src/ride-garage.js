/* Presentation and local draft library. Never requests a port or writes a motor. */
globalThis.BBSRideGarage = (() => {
  "use strict";
  const C = BBSCore, R = BBSRideProfiles, S = BBSStore;
  const $ = (id) => document.getElementById(id);
  let api, locale = "", selected = "city", filter = "all", undo = null;
  let pending = null, saved = [], backups = [], external = null, storage = false, lastMessage = null, opener = null;
  const words = {
    profileCode: ["Профиль", "Profile"],
    amp: ["А", "A"],
    ownerReported: ["Владелец подтвердил запись и заезд на 3.4.2", "Owner reported a verified write and ride on 3.4.2"],
    rides: ["ВЫБЕРИ ХАРАКТЕР ПОЕЗДКИ", "CHOOSE YOUR RIDE"],
    title: ["{count} профилей. Твой BBS02.", "{count} profiles. Your BBS02."],
    intro: ["Найди свой характер езды — от спокойной прогулки до бодрого разгона. Перед выбором увидишь точные изменения. В мотор они попадут только после отдельной записи.", "Preview the changes, then apply to a draft. The dashboard shows the current draft. Nothing is sent to the motor automatically."],
    all: ["Все {count}", "All {count}"], calm: ["Спокойно", "Relaxed"], daily: ["На каждый день", "Everyday"], active: ["Активно", "Active"],
    learn: ["Подробнее о профиле", "Explore profile"],
    experiment: ["Авторский профиль · отправная точка", "Author profile · a starting point"],
    effect: ["Как задумано", "Intended feel"], compromise: ["Что учесть", "Tradeoff"],
    pickup: ["Подхват", "Pickup"], smooth: ["Плавность", "Smoothness"], support: ["Поддержка", "Assistance"],
    ratings: ["Шкалы показывают задуманный характер, а не измерения или рейтинг безопасности.", "Bars indicate design intent, not measurements or safety ratings."],
    limit: ["Предел PAS 9", "PAS 9 ceiling"], start: ["Стартовый ток", "Start current"], ramp: ["Темп старта, код", "Ramp code"], keep: ["Помощь при быстром вращении", "Keep current"],
    currentGraph: ["Ток по уровням PAS · А", "Current by PAS level · A"],
    old: ["Сейчас", "Current"], next: ["После выбора", "After selection"],
    preview: ["Посмотреть изменения →", "Preview changes →"],
    apply: ["Применить к черновику", "Apply to draft"], cancel: ["Отмена", "Cancel"],
    delta: ["Проверь изменения", "Review changes"],
    draftOnly: ["Меняется только редактор. Для записи в мотор нужна отдельная процедура подключения, чтения, копирования и подтверждения.", "Only the editor changes. Writing requires a separate connection, read, backup and confirmation procedure."],
    preserved: ["Сохраняются общий ток, отсечка батареи, колесо, датчики, PAS 0, задержки остановки, режим работы и настройки газа. Таблица PAS общая: она может влиять и на газ, если он использует уровень помощи. Если PAS закреплён на одном уровне, переключатель дисплея не выберет другие ступени.", "Global current, battery cutoff, wheel, sensors, PAS 0, stop timing, Work Mode and throttle settings are preserved. The shared PAS table can also affect throttle operation when it uses an assist level. A fixed designated PAS level prevents display selection of other levels."],
    ceiling: ["Профиль не повышает общий лимит тока. Предел помощи рассчитывается по текущему черновику; после чтения мотора проверь его заново.", "The profile never raises the global current limit. Assistance is calculated from the current draft; review it again after reading the motor."],
    applied: ["Профиль применён к черновику. Мотор не изменён.", "Applied to the draft. Motor unchanged."],
    nextStep: ["Что дальше?", "What's next?"],
    undo: ["Отменить последнее применение", "Undo last application"],
    undone: ["Предыдущий черновик восстановлен.", "Previous draft restored."],
    library: ["Мой гараж", "My garage"], name: ["Название профиля", "Profile name"], note: ["Заметка о поездке", "Ride note"],
    placeholder: ["Например: Roscoe · на работу", "For example: Roscoe · commute"],
    save: ["Сохранить текущий черновик", "Save current draft"],
    saved: ["Профиль сохранён в этом браузере.", "Profile saved in this browser."],
    empty: ["Здесь появятся твои сохранённые настройки. Подпиши профиль и сохрани его после настройки.", "Your saved setups will appear here. Name and save a draft after editing."],
    local: ["Хранится только в этом браузере. Скачивай .el отдельно: очистка данных сайта удаляет гараж. Сохранённый черновик не является резервной копией мотора.", "Stored only in this browser. Download .el files separately: clearing site data removes the garage. A saved draft is not a motor backup."],
    load: ["Сравнить и загрузить", "Review and load"], download: ["Скачать .el", "Download .el"],
    backups: ["История копий контроллера", "Controller backup history"],
    noBackups: ["Пока нет копий контроллера. Первая появится после полного чтения; перед записью сохраняется ещё одна.", "No controller backups yet. The first is saved after a full read; another is saved before writing."],
    unavailable: ["Хранилище недоступно. Карточки, редактор и экспорт работают; сохранение в гараж и запись в мотор недоступны.", "Storage unavailable. Cards, editor and export still work; garage saving and motor writes are unavailable."],
    invalid: ["Не удалось выполнить действие. Проверь поля редактора и доступность хранилища.", "Action failed. Check editor fields and storage availability."],
    nameRequired: ["Введи название профиля.", "Enter a profile name."],
    stale: ["Черновик изменился. Открой сравнение заново.", "The draft changed. Reopen the comparison."],
    fileCompare: ["Сравнить со своим .el", "Compare with my .el"],
    fileLabel: ["Мой файл .el", "My .el file"],
    browse: ["Профили поездки", "Ride profiles"],
    open: ["Открыть .el", "Open .el"],
    bike: ["ТВОЙ ВЕЛОСИПЕД", "YOUR BIKE"],
    bikeDetails: ["Trek Roscoe 8 · 2020–2021 · BBS02 750 Вт", "Trek Roscoe 8 · 2020–2021 · BBS02 750 W"],
    kit: ["48 В · 19,2 А·ч · LG Cells · 32T · 860C", "48 V · 19.2 Ah · LG Cells · 32T · 860C"],
    assumptions: ["Комплект указан владельцем. Для примера: 115 кг с райдером, окружность 2,194 м, задняя звезда 11T, напряжение под нагрузкой 45 В. Это допущения, не измерения твоего велосипеда. Дисплей 860C не определяет прошивку контроллера.", "Kit supplied by the owner. Example inputs: 115 kg with rider, 2.194 m tire circumference, 11T rear sprocket, 45 V under load. These are assumptions, not measurements of your bike. The 860C display does not identify controller firmware."],
    setup: ["Уточнить расчёт под свой велосипед →", "Adjust calculation inputs for my bike →"],
    status: ["Редактор · мотор не изменяется", "Editor · motor unchanged"],
    compareHelp: ["A — текущий черновик, B — выбранный шаблон или твой файл. Сравнение ничего не применяет.", "A is the current draft; B is a template or your file. Comparing does not apply changes."],
    categories: ["Категории поездок", "Ride categories"],
    details: ["Описание профиля поездки", "Ride profile details"],
    archive: ["Скачать весь гараж JSON", "Download full garage JSON"],
  };
  const t = (k) => words[k][api.lang() === "en" ? 1 : 0].replace("{count}", R.profiles.length);
  const local = (arr) => arr[api.lang() === "en" ? 1 : 0];
  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  function button(text, action, cls) {
    const b = el("button", text, cls);
    b.type = "button";
    b.onclick = action;
    b.dataset.editable = "true";
    b.disabled = api.busy();
    return b;
  }
  function message(key) {
    lastMessage = key; $("garageMessage").textContent = t(key);
    $("garageNext").hidden = key !== "applied";
  }
  function download(item) {
    try { api.download("bbs-profile.el", C.toEl(C.validate(item.profile))); }
    catch { message("invalid"); }
  }
  function chart(before, after) {
    const figure = el("figure", undefined, "pas-chart");
    figure.append(el("figcaption", t("currentGraph")), el("p", `${t("old")} / ${t("next")}`, "muted"));
    const rows = el("div", undefined, "pas-chart-rows");
    const max = Math.max(before.bas.LC, after.bas.LC, 1);
    for (let i = 0; i < 10; i++) {
      const a = before.bas.LC * before.bas.ALC[i] / 100;
      const b = after.bas.LC * after.bas.ALC[i] / 100;
      const row = el("div", undefined, "pas-chart-row");
      row.append(el("span", String(i), "pas-axis"));
      const bars = el("div", undefined, "pas-bars");
      for (const [value, key, cls] of [[a,"old","before-bar"],[b,"next","after-bar"]]) {
        const meter = el("meter", undefined, cls);
        meter.min = 0; meter.max = max; meter.value = value;
        meter.setAttribute("aria-label", `PAS ${i} · ${t(key)} · ${value.toFixed(1)} ${t("amp")}`);
        bars.append(meter);
      }
      row.append(bars, el("span", `${a.toFixed(1)} / ${b.toFixed(1)}`, "pas-values"));
      rows.append(row);
    }
    figure.append(rows);
    return figure;
  }
  function review(target, title, source = "sourcePreset") {
    if (api.busy()) return;
    try {
      const before = api.pull();
      C.validate(target);
      pending = { before: C.clone(before), target: C.clone(target), source };
      $("rideReviewTitle").textContent = title;
      $("rideReviewDiff").replaceChildren(api.diffTable(C.diff(before, target)));
      opener = document.activeElement;
      $("rideReviewDialog").showModal();
    } catch { message("invalid"); }
  }
  function renderCards() {
    const list = $("rideCards"); list.replaceChildren();
    for (const p of R.profiles.filter((p) => filter === "all" || p.category === filter)) {
      const card = el("article", undefined, `ride-card tone-${p.tone}`);
      card.dataset.selected = String(p.id === selected);
      const top = el("div", undefined, "ride-card-top");
      top.append(el("span", t("profileCode") + " " + p.code.split(" / ")[0], "ride-code"), el("span", "BBS02", "ride-chip"));
      card.append(top, el("h3", local(p.name)), el("p", local(p.tagline)));
      const traits = el("div", undefined, "ride-traits");
      ["pickup", "smooth", "support"].forEach((key, i) => {
        const line = el("div"); line.append(el("span", t(key)));
        const meter = el("meter"); meter.min = 0; meter.max = 5; meter.value = p.traits[i];
        meter.setAttribute("aria-label", `${t(key)}: ${p.traits[i]}/5`);
        line.append(meter); traits.append(line);
      });
      card.append(traits);
      const b = button(t("learn"), () => {
        selected = p.id; renderCards(); renderDetail();
        $("rideDetail").focus({preventScroll:true});
        $("rideDetail").scrollIntoView({block:"start",behavior:"instant"});
      });
      b.dataset.ride = p.id; b.setAttribute("aria-pressed", String(p.id === selected));
      b.setAttribute("aria-label", `${t("learn")}: ${local(p.name)}`);
      card.append(b); list.append(card);
    }
  }
  function renderDetail() {
    const detail = $("rideDetail"); detail.replaceChildren();
    const p = R.profiles.find((p) => p.id === selected);
    detail.append(el("span", t(p.id === "forward" ? "ownerReported" : "experiment"), "ride-kicker"), el("h3", local(p.name)), el("h4", t("effect")), el("p", local(p.description)), el("h4", t("compromise")), el("p", local(p.tradeoff)));
    try {
      const before = api.pull(), after = R.apply(before, selected);
      const metrics = el("dl", undefined, "ride-metrics");
      for (const [key, value] of [["limit",`${(after.bas.LC * after.bas.ALC[9] / 100).toFixed(1)} ${t("amp")}`],["start",`${p.start}%`],["ramp",p.ramp],["keep",`${p.keep}%`]]) {
        const item = el("div"); item.append(el("dt", t(key)), el("dd", String(value))); metrics.append(item);
      }
      detail.append(metrics, el("p", t("ceiling"), "muted"), chart(before, after));
      const preview = button(t("preview"), () => {
        try { review(R.apply(api.pull(), selected), local(p.name)); } catch { message("invalid"); }
      }, "primary");
      preview.id = "ridePreview";
      detail.append(preview);
    } catch { detail.append(el("p", t("invalid"), "notice warning")); }
    detail.append(el("p", t("preserved"), "ride-preserved"));
  }
  function renderLibrary() {
    $("garageSave").disabled = !storage || api.busy();
    $("garageArchive").disabled = !storage || api.busy();
    $("garageName").disabled = $("garageNote").disabled = api.busy();
    $("garageUndo").disabled = !undo || api.busy();
    const list = $("garageSaved"); list.replaceChildren();
    if (!storage) list.append(el("p", t("unavailable"), "notice"));
    else if (!saved.length) list.append(el("p", t("empty"), "muted"));
    for (const item of saved) {
      const card = el("article", undefined, "saved-profile");
      card.append(el("h4", item.name), el("p", item.note), el("small", new Date(item.at).toLocaleString(api.lang())));
      const actions = el("div", undefined, "actions");
      actions.append(button(t("load"), () => review(item.profile, item.name, "sourceLibrary")), button(t("download"), () => download(item)));
      card.append(actions); list.append(card);
    }
    const history = $("garageBackups"); history.replaceChildren();
    if (!backups.length) history.append(el("p", t(storage ? "noBackups" : "unavailable"), "muted"));
    for (const item of backups) {
      const card = el("article", undefined, "saved-profile");
      const title = `${item.device.manufacturer} ${item.device.model} · FW ${item.device.fw}`;
      card.append(el("h4", title), el("small", new Date(item.at).toLocaleString(api.lang())));
      const actions = el("div", undefined, "actions");
      actions.append(button(t("load"), () => review(item.profile, title, "sourceBackup")), button(t("download"), () => download(item)), button("JSON", () => api.download("bbs-backup.json", JSON.stringify(item, null, 2), "application/json")));
      card.append(actions); history.append(card);
    }
  }
  async function reloadLibrary() {
    try {
      storage = !!(await S.ready);
      if (storage) [saved, backups] = await Promise.all([S.list("profiles"), S.list("backups")]);
    } catch { storage = false; }
    renderLibrary();
  }
  function sync() {
    if (!api) return;
    if (locale !== api.lang()) {
      locale = api.lang();
      document.querySelectorAll("[data-g]").forEach((n) => n.textContent = t(n.dataset.g));
      document.querySelector(".ride-hero-number").textContent = String(R.profiles.length).padStart(2, "0");
      $("garageName").placeholder = t("placeholder");
      $("rideFilters").setAttribute("aria-label", t("categories"));
      $("rideDetail").setAttribute("aria-label", t("details"));
      if (lastMessage) $("garageMessage").textContent = t(lastMessage);
      renderCards(); renderLibrary();
      if (external) $("compare").querySelector('[value="my-file"]').textContent = t("fileLabel");
      for (const p of R.profiles) {
        const option = $("compare").querySelector(`[value="ride:${p.id}"]`);
        if (option) option.textContent = local(p.name);
      }
    }
    renderDetail();
    $("garageUndo").disabled = !undo || api.busy();
  }
  function init(bridge) {
    api = bridge;
    $("rideFilters").querySelectorAll("button").forEach((b) => b.onclick = () => {
      filter = b.dataset.filter;
      $("rideFilters").querySelectorAll("button").forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
      renderCards();
    });
    $("startBrowse").onclick = () => api.panel("presets");
    $("startImport").onclick = () => { api.panel("connection"); $("import").click(); };
    $("garageNext").onclick = () => api.nextStep();
    $("rideSetup").onclick = () => api.panel("simulator");
    $("rideReviewCancel").onclick = () => $("rideReviewDialog").close();
    $("rideReviewApply").onclick = () => {
      if (api.busy() || !pending) return;
      try {
        if (!C.eq(pending.before, api.pull())) { message("stale"); $("rideReviewDialog").close(); return; }
        undo = { profile: C.clone(pending.before), source: api.source() };
        api.push(pending.target, pending.source); api.calculate();
        $("rideReviewDialog").close(); message("applied"); renderLibrary();
      } catch { message("invalid"); }
    };
    $("rideReviewDialog").addEventListener("close", () => {
      pending = null;
      (opener?.isConnected ? opener : $("ridePreview"))?.focus();
    });
    $("garageUndo").onclick = () => {
      if (!undo || api.busy()) return;
      const old = undo; undo = null; api.push(old.profile, old.source); api.calculate(); message("undone"); renderLibrary();
    };
    $("garageSave").onclick = async () => {
      if (api.busy()) return;
      const name = $("garageName").value.trim();
      if (!name) { message("nameRequired"); $("garageName").focus(); return; }
      try {
        $("garageSave").disabled = true;
        const item = { id: crypto.randomUUID(), at: new Date().toISOString(), name: name.slice(0,80), note: $("garageNote").value.trim().slice(0,500), profile: C.clone(api.pull()) };
        await S.saveProfile(item);
        await reloadLibrary(); message("saved");
      } catch { message("invalid"); } finally { renderLibrary(); }
    };
    $("garageArchive").onclick = async () => {
      if (api.busy() || !storage) return;
      try {
        const [profiles, controllerBackups] = await Promise.all([S.list("profiles"), S.list("backups")]);
        api.download("bbs-garage-archive.json", JSON.stringify({format:"bbs-flash-garage",version:1,exportedAt:new Date().toISOString(),profiles,controllerBackups},null,2),"application/json");
      } catch { message("invalid"); }
    };
    $("compareFileButton").onclick = () => $("compareFile").click();
    $("compareFile").onchange = async () => {
      if (api.busy()) return;
      try {
        const file = $("compareFile").files[0];
        if (!file) return;
        if (file.size > 65536) throw Error("size");
        const parsed = C.fromEl(await file.text());
        // An operation could have started while the file was being read.
        if (api.busy()) return;
        external = parsed;
        let opt = $("compare").querySelector('[value="my-file"]');
        if (!opt) { opt = el("option"); opt.value = "my-file"; $("compare").append(opt); }
        opt.textContent = t("fileLabel"); $("compare").value = "my-file"; api.calculate();
      } catch { api.error(new C.Fault("PROFILE")); } finally { $("compareFile").value = ""; }
    };
    for (const p of R.profiles) {
      const opt = el("option", local(p.name)); opt.value = "ride:" + p.id; $("compare").append(opt);
    }
    sync(); reloadLibrary();
  }
  return { init, sync, reloadLibrary, chart,
    comparison(profile, key) {
      if (key === "my-file" && external) return C.clone(external);
      if (key.startsWith("ride:")) return R.apply(profile, key.slice(5));
      return null;
    },
    resetUndo() {
      undo = null; lastMessage = null;
      $("garageMessage").textContent = "";
      $("garageNext").hidden = true;
    },
  };
})();
