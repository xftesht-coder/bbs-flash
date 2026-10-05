/* Presentation and local draft library. Never requests a port or writes a motor. */
globalThis.BBSRideGarage = (() => {
  "use strict";
  const C = BBSCore, R = BBSRideProfiles, M = BBSRideCompare, S = BBSStore;
  const $ = (id) => document.getElementById(id);
  let api, locale = "", selected = "city", filter = "all", undo = null;
  let pending = null, saved = [], backups = [], external = null, storage = false, lastMessage = null, opener = null;
  let renderKey = "";
  const words = {
    profileCode: ["Профиль", "Profile"],
    amp: ["А", "A"],
    ownerReported: ["Владелец подтвердил запись и заезд на 3.4.2", "Owner reported a verified write and ride on 3.4.2"],
    rides: ["ВЫБЕРИ ХАРАКТЕР ПОЕЗДКИ", "CHOOSE YOUR RIDE"],
    title: ["{count} профилей. Твой BBS02.", "{count} profiles. Your BBS02."],
    intro: ["Выбери характер поездки. Профиль меняет черновик; запись в мотор — отдельный шаг.", "Choose a ride style. Profiles change the draft; writing to the motor is a separate step."],
    all: ["Все {count}", "All {count}"], calm: ["Спокойно", "Relaxed"], daily: ["На каждый день", "Everyday"], active: ["Активно", "Active"],
    learn: ["Подробнее о профиле", "Explore profile"],
    experiment: ["Авторский профиль · отправная точка", "Author profile · a starting point"],
    effect: ["Как задумано", "Intended feel"], compromise: ["Что учесть", "Tradeoff"],
    response: ["Отклик педалей", "Pedal response"], pickup: ["Подхват со старта", "Initial pickup"],
    acceleration: ["Темп разгона", "Assist ramp"], middle: ["Тяга · PAS 5", "Assist · PAS 5"],
    peak: ["Тяга · PAS 9", "Assist · PAS 9"], cruise: ["Поддержка на ходу", "Keep assistance"], speed: ["Предел скорости · PAS 5", "Speed cap · PAS 5"],
    pulses: ["имп.", "pulses"], code: ["код", "code"],
    ratings: ["Сравниваются настройки, а не замеры разгона и скорости. PAS — уровень помощи. Подробное объяснение всех семи показателей — внутри профиля.", "These are settings, not measured acceleration or speed. PAS is the assistance level. Open a profile for explanations of all seven values."],
    currentMotor: ["Сейчас · считано с мотора", "Now · read from motor"],
    currentDraft: ["Сейчас · черновик", "Now · draft"], currentDemo: ["Сейчас · демопример", "Now · demo values"],
    unread: ["Мотор не считан в этом подключении.", "Motor has not been read in this connection."],
    custom: ["Свои настройки", "Custom settings"], demo: ["Демопример", "Demo values"],
    draftLabel: ["В черновике", "In the draft"], draftMatches: ["Черновик совпадает с чтением.", "Draft matches the read settings."],
    draftChanges: ["{n} отличий от мотора; ещё не записаны.", "{n} changes from the motor; not written yet."],
    compareHint: ["Справа — результат выбора профиля с учётом черновика. Для мотора нужна отдельная запись.", "Right: the selected profile applied to your draft. The motor requires a separate write."],
    same: ["Без изменений", "Unchanged"], earlier: ["Включится раньше", "Engages earlier"], later: ["Включится позже", "Engages later"],
    quicker: ["Быстрее нарастает помощь", "Faster assist ramp"], gentler: ["Плавнее нарастает помощь", "Gentler assist ramp"],
    more: ["Больше", "Higher"], less: ["Меньше", "Lower"],
    changesCount: ["Изменённых параметров: {n}", "Changed parameters: {n}"],
    selectedLabel: ["Смотрим", "Viewing"],
    valuesMatch: ["Семь показателей совпадают с текущими.", "All seven values match the current settings."],
    quickerShort: ["Разгон резче", "Quicker ramp"], gentlerShort: ["Разгон плавнее", "Gentler ramp"],
    strongerStart: ["Старт сильнее", "Stronger start"], softerStart: ["Старт мягче", "Softer start"],
    sevenTitle: ["Что изменится: семь показателей", "What changes: seven values"],
    parameter: ["Показатель", "Value"],
    responseHelp: ["Импульсы датчика до включения. Меньше — помощь начнётся после меньшего поворота педалей; это не задержка в секундах.", "Sensor pulses before engagement. Fewer pulses mean less pedal movement; this is not a delay in seconds."],
    pickupHelp: ["Стартовый ток в процентах общего лимита. Больше — сильнее начальный подхват и выше нагрузка на трансмиссию.", "Starting current as a percentage of the global limit. Higher means stronger initial pickup and more drivetrain load."],
    accelerationHelp: ["Код нарастания помощи по Penoff: меньше — быстрее, больше — плавнее. Это не время разгона до 25 км/ч; реакция зависит от прошивки и передачи.", "Penoff ramp code: lower is quicker, higher is gentler. This is not a 0–25 km/h time; behavior depends on firmware and gearing."],
    middleHelp: ["Потолок тока на среднем уровне помощи: общий лимит × процент PAS 5. Больше доступной помощи обычно требует больше энергии; это не измерение крутящего момента.", "Mid-level current ceiling: global limit × PAS 5 percentage. More available assistance generally uses more energy; this is not a torque measurement."],
    peakHelp: ["Потолок тока на PAS 9 по фактическим настройкам. Профиль не поднимает общий лимит; при низком исходном токе обещанного в названии запаса может не быть.", "PAS 9 current ceiling from the actual settings. Profiles do not raise the global limit, so a low starting limit can restrict available assistance."],
    cruiseHelp: ["Доля помощи, сохраняемая при быстром вращении педалей (Keep Current). Больше — поддержка дольше остаётся выраженной. Это не фиксированный ток в амперах.", "Assistance retained at high pedaling speed (Keep Current). Higher retains more help. This is not a fixed current in amps."],
    speedHelp: ["Процент действующего предела скорости на PAS 5. 100% убирает только дополнительный порог этого уровня. Это не км/ч; предел дисплея и механика сохраняются.", "Percentage of the existing speed limit at PAS 5. 100% removes only this level's extra cap. It is not km/h; display limits and gearing remain."],
    currentGraph: ["Ток по уровням PAS · А", "Current by PAS level · A"],
    old: ["Сейчас", "Current"], next: ["После выбора", "After selection"],
    preview: ["Посмотреть изменения →", "Preview changes →"],
    apply: ["Применить к черновику", "Apply to draft"], cancel: ["Отмена", "Cancel"],
    delta: ["Проверь изменения черновика", "Review draft changes"],
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
  function comparisonState() {
    const draft = api.pull(), motor = api.motorProfile();
    return { draft, motor, before: motor || draft,
      label: t(motor ? "currentMotor" : api.source() === "sourceDemo" ? "currentDemo" : "currentDraft") };
  }
  function profileName(profile) {
    const p = R.profiles.find(p => C.eq(profile, R.apply(profile, p.id)));
    return p ? local(p.name) : t("custom");
  }
  function formatValue(row, value) {
    if (row.unit === "percent") return `${value}%`;
    if (row.unit === "amp") return new Intl.NumberFormat(api.lang(), {minimumFractionDigits: 1, maximumFractionDigits: 2}).format(value) + " " + t("amp");
    return row.unit === "code" ? `${t("code")} ${value}` : `${value} ${t("pulses")}`;
  }
  function directionLabel(row) {
    if (!row.changed) return t("same");
    if (row.id === "response") return t(row.direction > 0 ? "earlier" : "later");
    if (row.id === "acceleration") return t(row.direction > 0 ? "quicker" : "gentler");
    return t(row.direction > 0 ? "more" : "less");
  }
  function metricRows(before, after) {
    const traits = el("div", undefined, "ride-traits");
    const heading = el("div", undefined, "ride-traits-heading");
    heading.append(el("span", t("parameter")), el("span", t("old")), el("span", t("next")));
    traits.append(heading);
    for (const row of M.compare(before, after)) {
      const line = el("div", undefined, "ride-trait");
      line.dataset.metric = row.id; line.dataset.changed = String(row.changed);
      const label = el("span", t(row.id), "ride-trait-label");
      label.title = t(row.id + "Help");
      const previous = el("span", formatValue(row, row.before), "trait-before");
      const next = el("strong", formatValue(row, row.after), "trait-after");
      previous.dataset.value = row.before; next.dataset.value = row.after;
      const mark = el("span", row.changed ? " → " : " = ", "trait-arrow");
      mark.setAttribute("aria-hidden", "true");
      const outcome = el("span", undefined, "trait-outcome"); outcome.append(mark, next);
      line.title = `${t(row.id)}: ${formatValue(row,row.before)} → ${formatValue(row,row.after)}. ${directionLabel(row)}`;
      const bars = el("span", undefined, "trait-bars"); bars.setAttribute("aria-hidden", "true");
      for (const [value, cls] of [[row.before,"trait-meter-before"],[row.after,"trait-meter-after"]]) {
        const meter = el("meter", undefined, cls); meter.min = 0; meter.max = row.max; meter.value = value; bars.append(meter);
      }
      label.append(bars); line.append(label, previous, outcome); traits.append(line);
    }
    return traits;
  }
  function effectSummary(rows) {
    const order = ["acceleration", "pickup", "peak", "response", "middle", "cruise", "speed"];
    const changed = rows.filter(r => r.changed).sort((a,b) => order.indexOf(a.id)-order.indexOf(b.id));
    if (!changed.length) return t("valuesMatch");
    return changed.slice(0,2).map(row => {
      if (row.id === "acceleration") return t(row.direction > 0 ? "quickerShort" : "gentlerShort");
      if (row.id === "pickup") return t(row.direction > 0 ? "strongerStart" : "softerStart");
      return `${t(row.id)}: ${directionLabel(row).toLocaleLowerCase(api.lang())}`;
    }).join(" · ");
  }
  function renderBaseline(view) {
    const box = $("rideBaseline"); box.replaceChildren();
    if (!view) { box.dataset.basis = "invalid"; box.append(el("p", t("invalid"))); return; }
    box.dataset.basis = view.motor ? "motor" : api.source() === "sourceDemo" ? "demo" : "draft";
    const current = el("div"); current.append(el("span", view.label, "ride-kicker"), el("strong", view.motor || api.source() !== "sourceDemo" ? profileName(view.before) : t("demo")));
    const draft = el("div"), changes = view.motor ? C.diff(view.motor, view.draft).length : 0;
    draft.append(el("span", t("draftLabel"), "ride-kicker"), el("strong", api.source() === "sourceDemo" ? t("demo") : profileName(view.draft)));
    const note = el("p", view.motor ? changes ? t("draftChanges").replace("{n}",changes) : t("draftMatches") : t("unread"));
    box.append(current, draft, note);
    box.title = t("compareHint");
  }
  function renderCards() {
    const list = $("rideCards"); list.replaceChildren();
    let view;
    try { view = comparisonState(); } catch { /* Invalid drafts have no comparison values. */ }
    for (const p of R.profiles.filter((p) => filter === "all" || p.category === filter)) {
      const card = el("article", undefined, `ride-card tone-${p.tone}`);
      card.dataset.selected = String(p.id === selected);
      const top = el("div", undefined, "ride-card-top");
      top.append(el("span", t("profileCode") + " " + p.code.split(" / ")[0], "ride-code"), el("span", p.id === selected ? t("selectedLabel") : "BBS02", "ride-chip"));
      const b = button(local(p.name), () => {
        selected = p.id; renderCards(); renderDetail();
        $("rideDetail").focus({preventScroll:true});
        $("rideDetail").scrollIntoView({block:"start",behavior:"instant"});
      }, "ride-select");
      b.dataset.ride = p.id; b.setAttribute("aria-pressed", String(p.id === selected));
      b.setAttribute("aria-label", `${t("learn")}: ${local(p.name)}`);
      const arrow = el("span", "↗"); arrow.setAttribute("aria-hidden", "true"); b.append(arrow);
      const heading = el("h3"); heading.append(b);
      card.append(top, heading);
      if (view) {
        const target = R.apply(view.draft, p.id);
        card.append(el("p", effectSummary(M.compare(view.before,target)), "ride-effect"), metricRows(view.before, target));
      }
      else card.append(el("p", t("invalid"), "muted"));
      list.append(card);
    }
  }
  function renderDetail() {
    const detail = $("rideDetail"); detail.replaceChildren();
    const p = R.profiles.find((p) => p.id === selected);
    detail.append(el("span", t(p.id === "forward" ? "ownerReported" : "experiment"), "ride-kicker"), el("h3", local(p.name)));
    try {
      const view = comparisonState(), before = view.before, after = R.apply(view.draft, selected);
      detail.append(el("h4", t("sevenTitle")), el("p", `${view.label} · ${profileName(before)}. ${t("compareHint")}`, "muted"));
      const metrics = el("div", undefined, "ride-comparison");
      for (const row of M.compare(before, after)) {
        const item = el("section", undefined, "ride-comparison-item"); item.dataset.metric = row.id;
        item.append(el("h4", t(row.id)));
        const values = el("p", undefined, "comparison-values");
        values.append(el("span", formatValue(row, row.before), "trait-before"), el("span", row.changed ? " → " : " = "), el("strong", formatValue(row, row.after)));
        item.append(values, el("span", directionLabel(row), "comparison-direction"), el("p", t(row.id + "Help")));
        metrics.append(item);
      }
      detail.append(metrics, el("p", t("changesCount").replace("{n}", C.diff(before,after).length), "muted"), el("p", t("ceiling"), "muted"));
      const preview = button(t("preview"), () => {
        try { review(R.apply(api.pull(), selected), local(p.name)); } catch { message("invalid"); }
      }, "primary");
      preview.id = "ridePreview";
      detail.append(preview);
      detail.append(chart(before, after));
    } catch { detail.append(el("p", t("invalid"), "notice warning")); }
    detail.append(el("h4", t("effect")), el("p", local(p.description)), el("h4", t("compromise")), el("p", local(p.tradeoff)));
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
      $("garageName").placeholder = t("placeholder");
      $("rideFilters").setAttribute("aria-label", t("categories"));
      $("rideDetail").setAttribute("aria-label", t("details"));
      if (lastMessage) $("garageMessage").textContent = t(lastMessage);
      renderLibrary();
      if (external) $("compare").querySelector('[value="my-file"]').textContent = t("fileLabel");
      for (const p of R.profiles) {
        const option = $("compare").querySelector(`[value="ride:${p.id}"]`);
        if (option) option.textContent = local(p.name);
      }
    }
    let view;
    try { view = comparisonState(); } catch { /* Clear stale comparisons for invalid inputs. */ }
    const key = JSON.stringify([api.lang(), api.source(), api.busy(), selected, view || null]);
    if (key !== renderKey) {
      renderKey = key;
      renderBaseline(view); renderCards(); renderDetail();
    }
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
