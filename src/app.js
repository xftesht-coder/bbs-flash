/* UI owns drafts; only core.safeWrite owns controller mutations. */
(() => {
  "use strict";
  const C = BBSCore,
    S = BBSStore,
    $ = (id) => document.getElementById(id);
  const TEXT = {
    language: ["Язык", "Language"],
    dark: ["Тёмная тема", "Dark theme"],
    light: ["Светлая тема", "Light theme"],
    offline: ["Не подключено", "Disconnected"],
    online: ["Подключено", "Connected"],
    eyebrow: [
      "Настройки · анализ · резервные копии",
      "Settings · analysis · backups",
    ],
    title: [
      "Понимай настройки своего Bafang",
      "Understand your Bafang settings",
    ],
    subtitle: [
      "Редактор параметров UART и расчётный стенд. Открывай профили, сравнивай режимы и проверяй изменения до записи.",
      "UART settings editor and a calculation workbench. Open profiles, compare scenarios and review changes before writing.",
    ],
    roadmap: ["План развития ↗", "Roadmap ↗"],
    experimental: [
      "Версия 3.1.0. Запись — экспериментальная, без проверки на физическом моторе. Доступна только для HZXT SZZ9 / FW 2.0.1.1 / 48 V после явного включения. Другие контроллеры — только чтение.",
      "Version 3.1.0. Writes are experimental and have not been tested on a physical motor. Only HZXT SZZ9 / FW 2.0.1.1 / 48 V can be enabled explicitly. Other controllers are read-only.",
    ],
    connection: ["Подключение", "Connection"],
    basic: ["Основные", "Basic"],
    pas: ["Помощь педалей", "Pedal assist"],
    throttle: ["Ручка газа", "Throttle"],
    presets: ["Пресеты", "Presets"],
    simulator: ["Симулятор", "Simulator"],
    connectHelp: [
      "Нужен совместимый кабель программирования Bafang UART и настольный Chrome или Edge. Перед подключением проверь распиновку своего контроллера. CAN не поддерживается.",
      "Use a compatible Bafang UART programming cable and desktop Chrome or Edge. Verify the pinout of your controller before connecting. CAN is not supported.",
    ],
    connect: ["Подключить", "Connect"],
    disconnect: ["Отключить", "Disconnect"],
    readAll: ["Считать все блоки", "Read all blocks"],
    writeAll: ["Проверить и записать всё", "Review and write all"],
    writeBlock: ["Проверить и записать блок", "Review and write block"],
    noDevice: [
      "Контроллер не подключён. Значения в редакторе — пример.",
      "No controller connected. Editor values are an example.",
    ],
    readOnly: [
      "Запись заблокирована до определения контроллера и полного чтения.",
      "Writing is blocked until identification and a full read succeed.",
    ],
    bench: [
      "Включить экспериментальную запись для этого сеанса. Понимаю, что совместимость на физическом моторе ещё не подтверждена.",
      "Enable experimental writes for this session. I understand physical motor compatibility has not been verified.",
    ],
    eligible: [
      "Сигнатура SZZ9 распознана. Это не подтверждение совместимости; для записи нужно включить экспериментальный режим.",
      "SZZ9 signature recognized. This is not a compatibility certification; writes require experimental mode.",
    ],
    unknown: [
      "Неизвестная сигнатура контроллера. Разрешено только чтение.",
      "Unknown controller signature. Read-only access.",
    ],
    serialOk: [
      "Web Serial доступен. Доступ к порту запрашивается только кнопкой «Подключить».",
      "Web Serial is available. Port access is requested only when you click Connect.",
    ],
    serialMissing: [
      "В этом браузере Web Serial недоступен. Редактор, импорт и расчёты работают без мотора.",
      "Web Serial is unavailable in this browser. Editing, import and calculations work without a motor.",
    ],
    files: ["Профиль и резервная копия", "Profile and backup"],
    filesHelp: [
      "Импорт меняет только черновик. Экспорт черновика не считается резервной копией контроллера.",
      "Import changes only the draft. Exporting a draft does not count as a controller backup.",
    ],
    import: ["Импорт .el", "Import .el"],
    export: ["Экспорт черновика .el", "Export draft .el"],
    backup: ["Последняя резервная копия", "Latest backup"],
    noBackup: [
      "Проверенной резервной копии пока нет.",
      "No verified backup yet.",
    ],
    downloadEl: ["Скачать копию .el", "Download backup .el"],
    downloadRaw: ["Скачать сырые данные JSON", "Download raw JSON"],
    restore: ["Загрузить копию в черновик", "Load backup into draft"],
    backupHelp: [
      "Копия хранится в этом браузере. Скачай её отдельно: очистка данных сайта удалит локальные копии. Восстановление требует обычной процедуры проверки и записи.",
      "The backup is stored in this browser. Download a separate copy: clearing site data removes local backups. Restoration uses the normal review and write procedure.",
    ],
    storageReady: [
      "Хранилище готово. Копии проверяются после завершения транзакции.",
      "Storage ready. Backups are verified after transaction completion.",
    ],
    storageUnavailable: [
      "Хранилище недоступно: запись в контроллер заблокирована. Редактор и расчёты доступны.",
      "Storage unavailable: controller writes are blocked. Editing and calculations remain available.",
    ],
    storageWaiting: ["Проверка хранилища…", "Checking storage…"],
    sourceDemo: [
      "Источник: демонстрационный профиль.",
      "Source: demonstration profile.",
    ],
    sourceRead: [
      "Источник: данные подключённого контроллера. Правки остаются черновиком до записи.",
      "Source: connected controller. Edits remain a draft until written.",
    ],
    sourceImport: [
      "Источник: импортированный файл; не данные текущего контроллера.",
      "Source: imported file; not a read of the current controller.",
    ],
    sourcePreset: [
      "Источник: черновик с применённым шаблоном.",
      "Source: draft with a template applied.",
    ],
    sourceBackup: [
      "Источник: сохранённая копия. Проверь параметры батареи, колеса и газа перед восстановлением.",
      "Source: saved backup. Check battery, wheel and throttle settings before restoring.",
    ],
    log: ["Журнал обмена UART", "UART exchange log"],
    exportLog: ["Скачать журнал", "Download log"],
    clearLog: ["Очистить", "Clear"],
    assistTable: ["Уровни помощи", "Assist levels"],
    currentPct: ["Лимит тока, %", "Current limit, %"],
    speedPct: ["Лимит скорости, %", "Speed limit, %"],
    currentA: ["Ток, A", "Current, A"],
    stopPolicy: [
      "Для новой записи Time of Stop ниже 20 × 10 мс заблокирован политикой релиза. Увеличение стартового тока выше 20% тоже заблокировано. Это ограничения приложения, не универсальные пределы прошивок.",
      "This release blocks setting a new Time of Stop below 20 × 10 ms and increasing start current above 20%. These are application policies, not universal firmware limits.",
    ],
    throttleHelp: [
      "Калибровка ручки газа зависит от оборудования. Начальное напряжение должно быть меньше конечного. Пресеты не меняют этот блок.",
      "Throttle calibration depends on your hardware. Start voltage must be below end voltage. Presets do not change this block.",
    ],
    presetHelp: [
      "Шаблоны меняют таблицу PAS и часть поведения педалирования. Они сохраняют батарею, колесо, датчик скорости, лимит скорости, назначенный уровень и ручку газа. Общий лимит тока может только снизиться. Результат зависит от прошивки.",
      "Templates change the PAS table and selected pedal settings. They preserve battery, wheel, speed sensor, speed limit, designated assist and throttle. The overall current limit can only decrease. Results depend on firmware.",
    ],
    historical: [
      "Исторические образцы сообщества",
      "Historical community samples",
    ],
    historicalHelp: [
      "Числа из предыдущей версии, без утверждений о безопасности и рекомендации к применению. При применении действуют те же правила сохранения аппаратных параметров. Название «current» обозначает старый образец, а не текущее чтение.",
      "Numeric samples from the previous version, with no safety or endorsement claims. The same hardware-preservation rules apply. The name “current” refers to an old sample, not a live read.",
    ],
    sample: ["Образец", "Sample"],
    apply: ["Применить к черновику", "Apply to draft"],
    presetEco: ["Умеренная помощь", "Moderate assist"],
    presetBalanced: ["Равномерные ступени", "Even steps"],
    presetTorque: ["Постоянный предел скорости", "Constant speed ceiling"],
    presetEcoHelp: [
      "До 18 A, старт 8%, ступени тока 15–100%.",
      "Up to 18 A, 8% start current, 15–100% current steps.",
    ],
    presetBalancedHelp: [
      "До 20 A, старт 10%, ступени тока 10–100%.",
      "Up to 20 A, 10% start current, 10–100% current steps.",
    ],
    presetTorqueHelp: [
      "До 18 A, старт 10%, скорость 100% на PAS 1–9.",
      "Up to 18 A, 10% start current, 100% speed on PAS 1–9.",
    ],
    simHelp: [
      "Это расчёт, не телеметрия и не прогноз температуры. Масса, передача, напряжение и потери общие для сравнения, Reality Check и дальности. Выбор модели ниже не разрешает запись в контроллер.",
      "These are estimates, not telemetry or a temperature prediction. Mass, gearing, voltage and losses are shared by comparison, Reality Check and range. Selecting a motor below does not enable controller writes.",
    ],
    assumptions: ["Допущения расчёта", "Calculation assumptions"],
    assumptionsHelp: [
      "Стационарное движение без ветра и помощи ногами. Мощность на колесе = напряжение × ток × КПД. Скорость ограничена передачей, уровнем PAS и настройкой лимита. Проценты скорости трактуются приблизительно: прошивки могут работать иначе.",
      "Steady motion without wind or rider power. Wheel power = voltage × current × efficiency. Speed is limited by gearing, PAS level and the configured ceiling. Speed percentages are approximations; firmware behavior can differ.",
    ],
    gearLimit: ["Предел по передаче, км/ч", "Gearing ceiling, km/h"],
    cadence: ["Каденс на уклоне, об/мин", "Climbing cadence, rpm"],
    levelCurrent: [
      "Предел тока выбранного PAS, A",
      "Selected PAS current ceiling, A",
    ],
    comparison: ["Сравнение A/B", "A/B comparison"],
    compareWith: ["Сравнить с", "Compare with"],
    profile: ["Профиль", "Profile"],
    draft: ["A · Черновик", "A · Draft"],
    template: ["B · Шаблон", "B · Template"],
    electrical: ["Мощность, W", "Electrical, W"],
    flat: ["Ровно, км/ч", "Flat, km/h"],
    climb: ["Уклон, км/ч", "Climb, km/h"],
    cadenceCol: ["Каденс, об/мин", "Cadence, rpm"],
    parameterDiff: ["Различия параметров", "Parameter differences"],
    range: ["Оценка запаса хода", "Range estimate"],
    rangeHelp: [
      "Использует выбранный PAS, профиль A и параметры выше. Доля подъёма задаётся по расстоянию. Скорость ограничивается теми же условиями, что в симуляторе.",
      "Uses the selected PAS, profile A and the scenario above. Uphill share is a fraction of distance. Speed uses the same limits as the simulator.",
    ],
    rangeKm: ["Расчётная дальность, км", "Estimated distance, km"],
    whKm: ["Расход, Wh/км", "Consumption, Wh/km"],
    availableWh: ["Энергия с резервом 15%, Wh", "Energy after 15% reserve, Wh"],
    rangeLimit: [
      "Это ориентир: температура, состояние батареи, ветер, разгоны и переменный КПД не моделируются. Уровень PAS с нулевой помощью не даёт моторной оценки дальности.",
      "This is an estimate: temperature, battery health, wind, acceleration and variable efficiency are not modeled. A zero-assist PAS level has no motor-only range estimate.",
    ],
    risk: [
      "Reality Check: высокий ток при низком каденсе. Снизь нагрузку и выбери более лёгкую передачу. Это индикатор режима, не измерение нагрева.",
      "Reality Check: high current at low cadence. Reduce load and choose a lower gear. This flags operating conditions; it does not measure heat.",
    ],
    noRisk: [
      "Reality Check: в выбранной строке нет сочетания ≥22 A и <60 об/мин. Это не гарантия отсутствия перегрева.",
      "Reality Check: the selected row does not combine ≥22 A with <60 rpm. This does not guarantee freedom from overheating.",
    ],
    modelLimit: [
      "Лимит тока черновика выше принятого предела выбранной модели.",
      "Draft current limit exceeds the assumed limit of the selected model.",
    ],
    footer: [
      "Настройки UART · без прошивки firmware · без облачной отправки профилей",
      "UART settings · no firmware flashing · no cloud profile uploads",
    ],
    safetyDoc: ["Ограничения и безопасность", "Limits and safety"],
    feedback: ["Сообщить о проблеме", "Report an issue"],
    preview: ["Проверка перед записью", "Review before writing"],
    previewHelp: [
      "Запись нескольких блоков не атомарна. При обрыве часть изменений может уже сохраниться. Автоматического повтора или отката нет.",
      "Writing multiple blocks is not atomic. Some changes may already be saved if the connection fails. There is no automatic retry or rollback.",
    ],
    hardwareNotice: [
      "Изменяются параметры оборудования или общий ток. Сверь их с батареей/BMS, контроллером, колесом и ручкой газа.",
      "Hardware settings or total current are changing. Check them against your battery/BMS, controller, wheel and throttle.",
    ],
    savedBackup: [
      "Два чтения совпали. Исходные данные и .el сохранены и проверены в хранилище браузера.",
      "Two reads matched. Original raw data and .el were saved and verified in browser storage.",
    ],
    confirmSafety: [
      "Я проверил изменения и совместимость батареи/контроллера; велосипед закреплён, ведущее колесо свободно, могу немедленно отключить питание.",
      "I checked the changes and battery/controller compatibility; the bike is secured, its driven wheel is clear, and I can immediately disconnect power.",
    ],
    cancel: ["Отмена", "Cancel"],
    confirmWrite: ["Записать эти изменения", "Write these changes"],
    field: ["Параметр", "Parameter"],
    before: ["Было", "Before"],
    after: ["Будет", "After"],
    noChanges: ["Изменений нет.", "No changes."],
    busy: ["Операция выполняется…", "Operation in progress…"],
    readDone: [
      "Все блоки считаны и проверены.",
      "All blocks read and checked.",
    ],
    connected: [
      "Контроллер определён. Выполни полное чтение.",
      "Controller identified. Read all blocks next.",
    ],
    disconnected: [
      "Порт отключён. Для записи требуется новое подключение и чтение.",
      "Port disconnected. Writing requires a new connection and full read.",
    ],
    written: [
      "Запись подтверждена повторным чтением всех блоков.",
      "Write verified by rereading all blocks.",
    ],
    cancelled: ["Запись отменена.", "Write cancelled."],
    loaded: [
      "Черновик обновлён. В контроллер ничего не записано.",
      "Draft updated. Nothing has been written to the controller.",
    ],
    invalid: ["Проверь значения: ", "Check values: "],
    partial: [
      "Результат записи может быть частичным. Не повторяй автоматически. Подключись заново и считай все блоки; резервная копия сохранена.",
      "Write outcome may be partial. Do not retry automatically. Reconnect and read all blocks; the backup was saved.",
    ],
    VALUE: [
      "Значение вне допустимого диапазона",
      "Value outside the allowed range",
    ],
    PROFILE: [
      "Неверный или неполный профиль .el",
      "Invalid or incomplete .el profile",
    ],
    CURRENT: ["Превышен допустимый ток", "Current limit exceeded"],
    THROTTLE_RANGE: [
      "Неверный диапазон напряжений ручки газа",
      "Invalid throttle voltage range",
    ],
    DEVICE: ["Не удалось проверить General", "Could not validate General"],
    MODEL: ["Неизвестная модель", "Unknown model"],
    WHEEL: [
      "Неизвестный код колеса; запись запрещена",
      "Unknown wheel code; writing blocked",
    ],
    SENSOR: ["Неизвестный тип датчика", "Unknown sensor type"],
    FRAME: [
      "Неверная длина или формат ответа",
      "Invalid response length or format",
    ],
    CHECKSUM: ["Контрольная сумма не совпала", "Checksum mismatch"],
    UNEXPECTED_BLOCK: [
      "Ответ не соответствует запросу",
      "Response does not match the request",
    ],
    DISCONNECTED: ["Соединение закрыто", "Connection closed"],
    TIMEOUT: ["Контроллер не ответил вовремя", "Controller response timed out"],
    BUSY: [
      "Другая операция ещё выполняется",
      "Another operation is in progress",
    ],
    REJECTED: ["Контроллер отклонил запись", "Controller rejected the write"],
    WRITE_IO: ["Ошибка передачи", "Write I/O error"],
    BENCH_REQUIRED: [
      "Экспериментальная запись не включена",
      "Experimental writes are not enabled",
    ],
    UNKNOWN_DEVICE: [
      "Для этого контроллера разрешено только чтение",
      "This controller is read-only",
    ],
    UNSTABLE_READ: [
      "Два чтения отличаются; запись отменена",
      "Two reads differ; write aborted",
    ],
    STALE_BACKUP: [
      "Данные контроллера изменились после создания копии",
      "Controller data changed after backup",
    ],
    STOP_DELAY: [
      "Новый Time of Stop ниже 20 заблокирован",
      "A new Time of Stop below 20 is blocked",
    ],
    START_CURRENT: [
      "Повышение стартового тока выше 20% заблокировано",
      "Increasing start current above 20% is blocked",
    ],
    VERIFY: [
      "Повторное чтение не подтвердило запись",
      "Readback did not verify the write",
    ],
    STORAGE: [
      "Не удалось надёжно сохранить копию; запись запрещена",
      "Could not persist a verified backup; writing blocked",
    ],
    SCENARIO: ["Неверные параметры расчёта", "Invalid scenario parameters"],
    NotFoundError: ["Порт не выбран", "No port selected"],
    NetworkError: ["Порт недоступен", "Port unavailable"],
    SecurityError: [
      "Браузер запретил доступ к порту",
      "Browser denied port access",
    ],
    FILE: ["Не удалось прочитать файл", "Could not read the file"],
    "bas.LBP": ["Отключение батареи, V", "Low battery cutoff, V"],
    "bas.LC": ["Общий лимит тока, A", "Total current limit, A"],
    "bas.WD": ["Колесо в контроллере", "Controller wheel setting"],
    "bas.SMType": ["Датчик скорости", "Speed sensor"],
    "bas.SMSig": ["Импульсы за оборот", "Pulses per revolution"],
    "pas.PT": ["Тип датчика педалей", "Pedal sensor type"],
    "pas.DA": ["Назначенный уровень PAS", "Designated assist"],
    "pas.SL": ["Лимит скорости, км/ч", "Speed limit, km/h"],
    "pas.SC": ["Стартовый ток, %", "Start current, %"],
    "pas.SSM": ["Slow-start, код 1–8", "Slow-start code, 1–8"],
    "pas.SDN": ["Импульсы до старта", "Start degree signals"],
    "pas.WM": ["Work mode, код", "Work mode code"],
    "pas.TS": ["Time of Stop, ×10 мс", "Time of Stop, ×10 ms"],
    "pas.CD": ["Current decay, код", "Current decay code"],
    "pas.SD": ["Stop decay, ×10 мс", "Stop decay, ×10 ms"],
    "pas.KC": ["Keep current, %", "Keep current, %"],
    "thr.SV": ["Начальное напряжение, ×0.1 V", "Start voltage, ×0.1 V"],
    "thr.EV": ["Конечное напряжение, ×0.1 V", "End voltage, ×0.1 V"],
    "thr.MODE": ["Режим ручки газа", "Throttle mode"],
    "thr.DA": ["Назначенный уровень", "Designated assist"],
    "thr.SL": ["Лимит скорости, км/ч", "Speed limit, km/h"],
    "thr.SC": ["Стартовый ток, %", "Start current, %"],
    cutoffHelp: [
      "Диапазон проверяется по General. Требуемое значение зависит от батареи и BMS.",
      "Validated against General voltage class. Correct value depends on battery and BMS.",
    ],
    currentHelp: [
      "Запись ограничена меньшим из лимита General и лимита распознанной модели.",
      "Writes use the lower of the General limit and the recognized model limit.",
    ],
    wheelHelp: [
      "27″ и код 700C сохранены как в исходном формате. Для расчётов отдельно измерь окружность шины.",
      "27″ and the 700C code follow the original format. Enter measured tire circumference separately for calculations.",
    ],
    sensorHelp: [
      "Изменение калибровки меняет измеренную скорость.",
      "Calibration changes affect the measured speed.",
    ],
    firmwareHelp: [
      "Семантика зависит от прошивки. Не считай большее число универсально более мягким или резким.",
      "Behavior depends on firmware. A larger code does not universally mean softer or sharper response.",
    ],
    scHelp: [
      "Диапазон формата 1–100%. Политика записи блокирует повышение выше 20%.",
      "File range is 1–100%. Write policy blocks increases above 20%.",
    ],
    stopHelp: [
      "Единица 10 мс: 20 = 200 мс. Слишком низкое значение может не поддерживаться прошивкой.",
      "Unit is 10 ms: 20 = 200 ms. Very low values may not be supported by firmware.",
    ],
    display: ["По команде дисплея", "By display command"],
    undetermined: ["Не задано", "Undetermined"],
    speedMode: ["Скорость", "Speed"],
    currentMode: ["Ток", "Current"],
    sensor0: ["Внешний", "External"],
    sensor1: ["Внутренний", "Internal"],
    sensor2: ["По мотору", "Motor based"],
    model: ["Модель для расчёта", "Simulation motor"],
    mass: ["Масса велосипед + райдер, кг", "Bike + rider mass, kg"],
    volt: ["Напряжение под нагрузкой, V", "Loaded battery voltage, V"],
    eta: ["КПД, %", "Efficiency, %"],
    grade: ["Уклон, %", "Gradient, %"],
    chainring: ["Передняя звезда, зубьев", "Front chainring, teeth"],
    cog: ["Задняя звезда, зубьев", "Rear sprocket, teeth"],
    circumference: ["Окружность шины, м", "Tire circumference, m"],
    rpm: ["Принятый предел каденса, об/мин", "Assumed cadence ceiling, rpm"],
    displayLimit: ["Лимит дисплея, км/ч", "Display speed limit, km/h"],
    crr: ["Сопротивление качению, Crr", "Rolling resistance, Crr"],
    cda: ["Аэродинамическая площадь, CdA (м²)", "Drag area, CdA (m²)"],
    level: ["Уровень PAS для оценки", "PAS level for estimates"],
    ah: ["Ёмкость батареи, Ah", "Battery capacity, Ah"],
    hillShare: ["Доля подъёмов, % расстояния", "Uphill share, % of distance"],
    rangeGrade: ["Уклон подъёмов, %", "Uphill gradient, %"],
  };
  let lang = "ru",
    theme = "light",
    session = null,
    busy = false,
    storageReady = false,
    loadedSession = null,
    backup = null,
    source = "sourceDemo",
    lastStatus = null;
  const t = (k) => (TEXT[k] ? TEXT[k][lang === "en" ? 1 : 0] : k);
  const initial = {
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
  let state = C.clone(initial);
  const presets = {
    eco: {
      ...C.clone(BBSPresets.eco),
      label: "presetEco",
      help: "presetEcoHelp",
    },
    balanced: {
      ...C.clone(BBSPresets.roscoe),
      label: "presetBalanced",
      help: "presetBalancedHelp",
    },
    torque: {
      ...C.clone(BBSPresets.kepler),
      label: "presetTorque",
      help: "presetTorqueHelp",
    },
  };
  presets.eco.pas.SSM = 4;
  presets.eco.pas.TS = 25;
  presets.balanced.pas.TS = 25;
  presets.torque.pas.SC = 10;
  presets.torque.bas.ALC[0] = 0;
  presets.torque.bas.ALBP[0] = 0;
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => i + a);
  const assists = [[255, "display"], ...range(0, 9).map((v) => [v, v])],
    speeds = [[255, "display"], ...range(15, 40).map((v) => [v, v])];
  // [path, min/options, max/help, step/help, help]
  const fields = [
    ["bas.LBP", 18, 55, 1, "cutoffHelp"],
    ["bas.LC", 1, 30, 1, "currentHelp"],
    [
      "bas.WD",
      C.WHEELS.map((v, i) => [i, v === "700C" ? "700C" : v + "″"]),
      "wheelHelp",
    ],
    [
      "bas.SMType",
      [
        [0, "sensor0"],
        [1, "sensor1"],
        [2, "sensor2"],
      ],
      "sensorHelp",
    ],
    ["bas.SMSig", 1, 36, 1, "sensorHelp"],
    ["pas.PT", range(0, 3).map((v) => [v, v]), "firmwareHelp"],
    ["pas.DA", assists, "firmwareHelp"],
    ["pas.SL", speeds, "firmwareHelp"],
    ["pas.SC", 1, 100, 1, "scHelp"],
    ["pas.SSM", 1, 8, 1, "firmwareHelp"],
    ["pas.SDN", 1, 20, 1, "firmwareHelp"],
    [
      "pas.WM",
      [[255, "undetermined"], ...range(10, 80).map((v) => [v, v])],
      "firmwareHelp",
    ],
    ["pas.TS", 0, 255, 1, "stopHelp"],
    ["pas.CD", 1, 8, 1, "firmwareHelp"],
    ["pas.SD", 0, 255, 1, "stopHelp"],
    ["pas.KC", 1, 100, 1, "firmwareHelp"],
    ["thr.SV", 0, 50, 1, "throttleHelp"],
    ["thr.EV", 0, 50, 1, "throttleHelp"],
    [
      "thr.MODE",
      [
        [0, "speedMode"],
        [1, "currentMode"],
      ],
      "firmwareHelp",
    ],
    ["thr.DA", assists, "firmwareHelp"],
    ["thr.SL", speeds, "firmwareHelp"],
    ["thr.SC", 1, 100, 1, "scHelp"],
  ];
  const scenarioFields = [
    ["model", Object.keys(C.MODELS).map((k) => [k, k]), "BBS02"],
    ["mass", 30, 300, 115, 1],
    ["volt", 18, 65, 45, 0.1],
    ["grade", 0, 25, 8, 0.5],
    ["chainring", 20, 60, 32, 1],
    ["cog", 8, 60, 11, 1],
    ["circumference", 1, 3.5, 2.194, 0.001],
    ["level", 0, 9, 9, 1],
  ];
  const advancedFields = [
    ["rpm", 50, 180, 120, 1],
    ["eta", 40, 98, 85, 1],
    ["displayLimit", 5, 80, 40, 1],
    ["crr", 0.002, 0.05, 0.012, 0.001],
    ["cda", 0.2, 1.5, 0.65, 0.01],
  ];
  const rangeFields = [
    ["ah", 0, 100, 10, 0.1],
    ["hillShare", 0, 100, 35, 1],
    ["rangeGrade", 0, 25, 8, 0.5],
  ];
  const allScenario = [...scenarioFields, ...advancedFields, ...rangeFields];
  function node(tag, text, cls) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }
  function buildField(parent, id, label, spec, value, help) {
    const box = node("div", undefined, "field");
    const lab = node("label", t(label));
    lab.htmlFor = id;
    lab.dataset.t = label;
    const control = node(Array.isArray(spec[0]) ? "select" : "input");
    control.id = id;
    control.dataset.editable = "true";
    if (control.tagName === "SELECT")
      for (const [v, key] of spec[0]) {
        const option = node("option", t(key));
        option.value = v;
        if (TEXT[key]) option.dataset.t = key;
        control.append(option);
      }
    else {
      control.type = "number";
      control.min = spec[0];
      control.max = spec[1];
      control.step = spec[2] ?? 1;
      control.required = true;
    }
    control.value = value;
    box.append(lab, control);
    if (help) {
      const hint = node("small", t(help));
      hint.dataset.t = help;
      hint.id = id + "-help";
      control.setAttribute("aria-describedby", hint.id);
      box.append(hint);
    }
    parent.append(box);
    return control;
  }
  function fieldId(path) {
    return path.replace(".", "-");
  }
  for (const f of fields) {
    const [part, key] = f[0].split(".");
    buildField(
      $(
        part === "bas"
          ? "basicFields"
          : part === "pas"
            ? "pasFields"
            : "throttleFields",
      ),
      fieldId(f[0]),
      f[0],
      Array.isArray(f[1]) ? [f[1]] : [f[1], f[2], f[3]],
      state[part][key] ?? 255,
      Array.isArray(f[1]) ? f[2] : f[4],
    );
  }
  for (let i = 0; i < 10; i++) {
    const tr = node("tr");
    tr.append(node("td", String(i)));
    for (const k of ["ALC", "ALBP"]) {
      const td = node("td"),
        input = node("input");
      input.type = "number";
      input.min = 0;
      input.max = 100;
      input.step = 1;
      input.required = true;
      input.id = `${k}-${i}`;
      input.dataset.editable = "true";
      input.value = state.bas[k][i];
      td.append(input);
      tr.append(td);
    }
    const amps = node("td");
    amps.id = "amps-" + i;
    tr.append(amps);
    $("assistRows").append(tr);
  }
  for (const [container, list] of [
    ["scenarioFields", scenarioFields],
    ["advancedFields", advancedFields],
    ["rangeFields", rangeFields],
  ])
    for (const [key, min, max, value, step] of list) {
      const isSelect = Array.isArray(min);
      buildField(
        $(container),
        "sim-" + key,
        key,
        isSelect ? [min] : [min, max, step],
        isSelect ? max : value,
      );
    }
  for (const [key, p] of Object.entries(presets)) {
    const button = node("button", undefined, "preset");
    button.dataset.editable = "true";
    button.dataset.preset = key;
    const label = node("strong", t(p.label));
    label.dataset.t = p.label;
    const help = node("small", t(p.help));
    help.dataset.t = p.help;
    button.append(label, help);
    button.onclick = () => applyPreset(p);
    $("presetList").append(button);
    const opt = node("option", t(p.label));
    opt.value = key;
    opt.dataset.t = p.label;
    $("compare").append(opt);
  }
  for (const [key, p] of Object.entries(BBSPresets)) {
    const option = node("option", p.name + " [" + key + "]");
    option.value = key;
    $("historicalPreset").append(option);
  }
  function pull() {
    const draft = C.clone(state);
    for (const f of fields) {
      const control = $(fieldId(f[0]));
      if (!control.checkValidity() || control.value === "")
        throw new C.Fault("VALUE", f[0]);
      const [part, key] = f[0].split(".");
      draft[part][key] =
        key === "WM" && control.value === "255" ? null : Number(control.value);
    }
    for (const k of ["ALC", "ALBP"])
      draft.bas[k] = range(0, 9).map((i) => {
        const input = $(`${k}-${i}`);
        if (input.value === "" || !input.checkValidity())
          throw new C.Fault("VALUE", `bas.${k}.${i}`);
        return Number(input.value);
      });
    return C.validate(draft);
  }
  function push(profile, newSource) {
    state = C.clone(profile);
    if (newSource) source = newSource;
    for (const f of fields) {
      const [part, key] = f[0].split(".");
      $(fieldId(f[0])).value = state[part][key] ?? 255;
    }
    for (const k of ["ALC", "ALBP"])
      for (let i = 0; i < 10; i++) $(`${k}-${i}`).value = state.bas[k][i];
    refresh();
  }
  function setStatus(key, error = false, detail = "") {
    lastStatus = { key, error, detail };
    $("status").textContent = t(key) + (detail ? " · " + detail : "");
    $("status").classList.toggle("error", error);
  }
  function report(error) {
    const code = error.code || error.name;
    setStatus(
      TEXT[code] ? code : "invalid",
      true,
      error.detail || (!TEXT[code] ? error.message : ""),
    );
    log("ERROR", error.code || error.message);
  }
  const logs = [];
  function log(kind, data) {
    const line =
      new Date().toISOString() +
      " " +
      kind +
      " " +
      (Array.isArray(data)
        ? data.map((v) => v.toString(16).padStart(2, "0")).join(" ")
        : data);
    logs.push(line);
    if (logs.length > 600) logs.shift();
    $("log").textContent = logs.join("\n");
  }
  function connected() {
    return session && !session.closed && session.device;
  }
  function refresh() {
    const device = connected(),
      known = device && C.identify(device);
    $("connectionState").textContent = t(device ? "online" : "offline");
    $("capability").textContent = t(
      "serial" in navigator && isSecureContext ? "serialOk" : "serialMissing",
    );
    $("connect").disabled =
      busy || !!device || !("serial" in navigator) || !isSecureContext;
    $("disconnect").disabled = !session || busy;
    $("readAll").disabled = !device || busy;
    $("bench").disabled = !known || !storageReady || busy;
    const writeOk =
      device &&
      known &&
      loadedSession === session.id &&
      $("bench").checked &&
      storageReady &&
      !busy;
    $("writeAll").disabled = !writeOk;
    document
      .querySelectorAll(".write-block")
      .forEach((e) => (e.disabled = !writeOk));
    document
      .querySelectorAll(
        "[data-editable],#import,#export,#restore,#applyHistorical,#historicalPreset,#compare,#language,#theme",
      )
      .forEach((e) => (e.disabled = busy || (e.id === "restore" && !backup)));
    $("backupEl").disabled = $("backupJson").disabled = !backup;
    $("source").textContent = t(source);
    $("storageStatus").textContent = t(
      storageReady ? "storageReady" : "storageUnavailable",
    );
    $("writeEligibility").textContent = t(
      device ? (known ? "eligible" : "unknown") : "readOnly",
    );
    $("device").textContent = device ? describeDevice(device) : t("noDevice");
    $("backupInfo").textContent = backup
      ? backup.at +
        " · " +
        backup.device.manufacturer +
        " " +
        backup.device.model
      : t("noBackup");
  }
  function describeDevice(d) {
    return `${d.manufacturer} ${d.model}\nHW ${d.hw} · FW ${d.fw}\nGeneral: ${[24, 36, 48, 60, "24–48", "24–60"][d.nominalCode]} V · ${d.maxCurrent} A`;
  }
  function remember(key, value) {
    S.put("prefs", value, key).catch(() => {});
  }
  function applyLanguage() {
    document.documentElement.lang = lang;
    $("language").value = lang;
    document
      .querySelectorAll("[data-t]")
      .forEach((el) => (el.textContent = t(el.dataset.t)));
    $("theme").textContent = t(theme === "dark" ? "light" : "dark");
    $("tabs").setAttribute("aria-label", t("title"));
    $("log").setAttribute("aria-label", t("log"));
    for (let i = 0; i < 10; i++) {
      $("ALC-" + i).setAttribute("aria-label", `PAS ${i}: ${t("currentPct")}`);
      $("ALBP-" + i).setAttribute("aria-label", `PAS ${i}: ${t("speedPct")}`);
    }
    if (lastStatus)
      setStatus(lastStatus.key, lastStatus.error, lastStatus.detail);
    refresh();
    renderCalculations();
  }
  function getScenario() {
    const p = {};
    for (const [key] of allScenario) {
      const el = $("sim-" + key);
      if (el.value === "" || !el.checkValidity())
        throw new C.Fault("SCENARIO", key);
      p[key] = key === "model" ? el.value : Number(el.value);
    }
    C.scenario(p);
    return p;
  }
  function changesTable(changes) {
    const table = node("table"),
      thead = node("thead"),
      tr = node("tr");
    for (const key of ["field", "before", "after"])
      tr.append(node("th", t(key)));
    thead.append(tr);
    table.append(thead);
    const tbody = node("tbody");
    for (const change of changes) {
      const row = node("tr");
      if (/^(bas\.(LBP|LC|WD|SMType|SMSig)|thr\.)/.test(change.field))
        row.className = "risk";
      const match = change.field.match(/^bas\.(ALC|ALBP)\.(\d)$/);
      row.append(
        node(
          "td",
          match
            ? `PAS ${match[2]} · ${t(match[1] === "ALC" ? "currentPct" : "speedPct")}`
            : t(change.field),
        ),
        node("td", String(change.before ?? "—")),
        node("td", String(change.after ?? "—")),
      );
      tbody.append(row);
    }
    table.append(tbody);
    return table;
  }
  function renderCalculations() {
    try {
      const profile = pull(),
        p = getScenario();
      state = profile;
      const other = C.ridingPreset(profile, presets[$("compare").value]);
      const rows = C.profileRows(profile, p),
        comparison = C.profileRows(other, p),
        selected = rows[p.level];
      for (let i = 0; i < 10; i++)
        $("amps-" + i).textContent = rows[i].currentA.toFixed(1);
      $("gearLimit").textContent = C.gearLimit(p).toFixed(1);
      $("cadence").textContent = selected.cadence.toFixed(0);
      $("levelCurrent").textContent = selected.currentA.toFixed(1);
      $("reality").textContent =
        t(selected.thermalRisk ? "risk" : "noRisk") +
        (profile.bas.LC > C.MODELS[p.model].maxAmps
          ? " " + t("modelLimit")
          : "");
      $("reality").className =
        "notice" +
        (selected.thermalRisk || profile.bas.LC > C.MODELS[p.model].maxAmps
          ? " warning"
          : "");
      const body = $("simRows");
      body.replaceChildren();
      for (let i = 0; i < 10; i++)
        for (const [label, r] of [
          ["draft", rows[i]],
          ["template", comparison[i]],
        ]) {
          const tr = node("tr");
          if (r.thermalRisk) tr.className = "risk";
          for (const value of [
            i,
            t(label),
            r.currentA.toFixed(1),
            r.powerW.toFixed(0),
            r.flatKmh.toFixed(1),
            r.climbKmh.toFixed(1),
            r.cadence.toFixed(0),
          ])
            tr.append(node("td", String(value)));
          body.append(tr);
        }
      const differences = C.diff(profile, other);
      $("compareDiff").replaceChildren(
        differences.length
          ? changesTable(differences)
          : node("p", t("noChanges")),
      );
      const estimate = C.rangeEstimate(profile, p, {
        ah: p.ah,
        grade: p.rangeGrade,
        hillShare: p.hillShare / 100,
        level: p.level,
      });
      $("rangeKm").textContent =
        estimate.km === null ? "—" : estimate.km.toFixed(1);
      $("whKm").textContent =
        estimate.whKm === null ? "—" : estimate.whKm.toFixed(1);
      $("availableWh").textContent = estimate.availableWh.toFixed(0);
    } catch (error) {
      for (const id of [
        "gearLimit",
        "cadence",
        "levelCurrent",
        "rangeKm",
        "whKm",
        "availableWh",
      ])
        $(id).textContent = "—";
      $("simRows").replaceChildren();
      $("reality").textContent =
        t(error.code || "invalid") + " · " + t(error.detail || "");
      $("reality").className = "notice warning";
    }
  }
  function applyPreset(preset) {
    if (busy) return;
    try {
      push(C.ridingPreset(pull(), preset), "sourcePreset");
      renderCalculations();
      setStatus("loaded");
    } catch (error) {
      report(error);
    }
  }
  function download(name, text, type = "text/plain") {
    const blob = new Blob([text], { type }),
      url = URL.createObjectURL(blob),
      a = node("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function backupFilename(extension) {
    return `bbs-backup-${backup.device.model}-${backup.at.replace(/[:.]/g, "-")}.${extension}`;
  }
  async function saveBackup(snapshot) {
    try {
      backup = await S.saveBackup(snapshot);
      refresh();
    } catch {
      storageReady = false;
      refresh();
      throw new C.Fault("STORAGE");
    }
  }
  function preview({ changes, snapshot }) {
    const dialog = $("writeDialog");
    $("previewChanges").replaceChildren(changesTable(changes));
    $("previewDevice").textContent = describeDevice(snapshot.device);
    $("hardwareNotice").hidden = !changes.some((c) =>
      /^(bas\.(LBP|LC|WD|SMType|SMSig)|thr\.)/.test(c.field),
    );
    $("confirmSafety").checked = false;
    $("confirmWrite").disabled = true;
    dialog.returnValue = "cancel";
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener(
        "close",
        () => resolve(dialog.returnValue === "confirm"),
        { once: true },
      );
    });
  }
  async function run(operation) {
    if (busy) return;
    busy = true;
    setStatus("busy");
    refresh();
    try {
      await operation();
    } catch (error) {
      report(error);
    } finally {
      busy = false;
      refresh();
    }
  }
  async function doWrite(blocks) {
    await run(async () => {
      if (!connected() || loadedSession !== session.id)
        throw new C.Fault("DISCONNECTED");
      const target = pull();
      try {
        const result = await C.safeWrite({
          session,
          target,
          blocks,
          saveBackup,
          confirm: preview,
          benchEnabled: $("bench").checked,
        });
        if (result.profile) {
          push(result.profile, "sourceRead");
          renderCalculations();
        }
        setStatus(
          result.status === "written"
            ? "written"
            : result.status === "unchanged"
              ? "noChanges"
              : "cancelled",
        );
      } catch (error) {
        if (error.attempted !== undefined && error.attempted !== null) {
          await session.close();
          session = null;
          loadedSession = null;
          $("bench").checked = false;
          setStatus("partial", true, t(error.code || "VERIFY"));
        } else throw error;
      }
    });
  }
  function lost(error) {
    loadedSession = null;
    $("bench").checked = false;
    if ($("writeDialog").open) $("writeDialog").close("cancel");
    report(error);
    refresh();
  }
  $("connect").onclick = () =>
    run(async () => {
      if (session) await session.close();
      session = null;
      loadedSession = null;
      $("bench").checked = false;
      const port = await navigator.serial.requestPort();
      session = new C.SerialSession(port, { onLog: log, onFault: lost });
      await session.open();
      setStatus("connected");
    });
  $("disconnect").onclick = () =>
    run(async () => {
      await session?.close();
      session = null;
      loadedSession = null;
      $("bench").checked = false;
      setStatus("disconnected");
    });
  $("readAll").onclick = () =>
    run(async () => {
      if (!connected()) throw new C.Fault("DISCONNECTED");
      const snap = await session.exclusive(() => session.readAll());
      loadedSession = session.id;
      push(snap.profile, "sourceRead");
      renderCalculations();
      setStatus("readDone");
    });
  $("bench").onchange = refresh;
  $("writeAll").onclick = () => doWrite([82, 83, 84]);
  document
    .querySelectorAll(".write-block")
    .forEach((el) => (el.onclick = () => doWrite([Number(el.dataset.block)])));
  $("confirmSafety").onchange = () => {
    $("confirmWrite").disabled = !$("confirmSafety").checked;
  };
  $("cancelWrite").onclick = () => $("writeDialog").close("cancel");
  $("confirmWrite").onclick = () => {
    if ($("confirmSafety").checked) $("writeDialog").close("confirm");
  };
  $("dialogDownload").onclick = $("backupEl").onclick = () => {
    if (backup) download(backupFilename("el"), backup.el);
  };
  $("backupJson").onclick = () => {
    if (backup)
      download(
        backupFilename("json"),
        JSON.stringify(backup, null, 2),
        "application/json",
      );
  };
  $("restore").onclick = () => {
    if (backup && !busy) {
      push(C.validate(C.clone(backup.profile)), "sourceBackup");
      renderCalculations();
      setStatus("loaded");
    }
  };
  $("import").onclick = () => {
    if (!busy) $("importFile").click();
  };
  $("importFile").onchange = () =>
    run(async () => {
      try {
        const file = $("importFile").files[0];
        if (!file) return;
        if (file.size > 65536) throw new C.Fault("PROFILE");
        const imported = C.fromEl(await file.text());
        push(imported, "sourceImport");
        renderCalculations();
        setStatus("loaded");
      } finally {
        $("importFile").value = "";
      }
    });
  $("export").onclick = () => {
    try {
      download("bbs-draft.el", C.toEl(pull()));
    } catch (error) {
      report(error);
    }
  };
  $("applyHistorical").onclick = () =>
    applyPreset(BBSPresets[$("historicalPreset").value]);
  $("compare").onchange = renderCalculations;
  $("language").onchange = () => {
    lang = $("language").value;
    applyLanguage();
    remember("lang", lang);
  };
  $("theme").onclick = () => {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    $("theme").textContent = t(theme === "dark" ? "light" : "dark");
    remember("theme", theme);
  };
  $("exportLog").onclick = () =>
    download("bbs-serial-log.txt", logs.join("\n"));
  $("clearLog").onclick = () => {
    logs.length = 0;
    $("log").textContent = "";
  };
  document.querySelectorAll("[data-panel]").forEach(
    (button) =>
      (button.onclick = () => {
        document.querySelectorAll("[data-panel]").forEach((b) => {
          const active = b === button;
          b.setAttribute("aria-selected", String(active));
          $("panel-" + b.dataset.panel).hidden = !active;
        });
        if (button.dataset.panel === "simulator") renderCalculations();
      }),
  );
  document
    .querySelectorAll("input[data-editable],select[data-editable]")
    .forEach((control) =>
      control.addEventListener("input", () => {
        if (control.id === "sim-model")
          $("sim-rpm").value = C.MODELS[control.value].maxRpm;
        renderCalculations();
      }),
    );
  // Disconnect events may arrive before the stream rejects on some platforms.
  if ("serial" in navigator)
    navigator.serial.addEventListener("disconnect", (event) => {
      if (session && event.target === session.port)
        session.fail(new C.Fault("DISCONNECTED"));
    });
  window.addEventListener("beforeunload", (event) => {
    if (busy && session) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  applyLanguage();
  $("storageStatus").textContent = t("storageWaiting");
  (async () => {
    const db = await S.ready;
    storageReady = !!db;
    if (db) {
      try {
        const [savedLang, savedTheme, savedBackup] = await Promise.all([
          S.get("prefs", "lang"),
          S.get("prefs", "theme"),
          S.latest(),
        ]);
        if (["ru", "en"].includes(savedLang)) lang = savedLang;
        if (["light", "dark"].includes(savedTheme)) theme = savedTheme;
        backup = savedBackup || null;
        document.documentElement.dataset.theme = theme;
      } catch {
        storageReady = false;
      }
    }
    applyLanguage();
  })();
})();
