/* Original explanations, paraphrased from the bundled Penoff Help.docx and
 * checked against Main.dfm / our release policy. Not a verbatim manual copy. */
globalThis.BBSGuide = {
  url: "https://penoff.me/2016/01/13/e-bike-conversion-software/",
  fields: {
    "bas.LBP": {
      name: "Low Battery Protection",
      ru: [
        "Напряжение, ниже которого контроллер прекращает помощь, чтобы ограничить разряд батареи.",
        "Выше — отключение раньше. Ниже — более глубокий разряд.",
        "Сохраняй значение, подходящее батарее и BMS. Пресеты его не меняют.",
      ],
      en: [
        "Voltage below which the controller stops assistance to limit battery discharge.",
        "Higher cuts assistance earlier. Lower allows a deeper discharge.",
        "Keep the value appropriate for your battery and BMS. Templates preserve it.",
      ],
    },
    "bas.LC": {
      name: "Current Limit",
      ru: [
        "Общий потолок тока. Ток каждого PAS задаётся долей этого значения.",
        "Больше — выше доступная тяга и нагрузка на батарею, мотор и трансмиссию.",
        "Допуск записи ограничен General и моделью контроллера. Это не измеренный ток.",
      ],
      en: [
        "The overall current ceiling. Each PAS level uses a percentage of this value.",
        "Higher allows more drive force and greater battery, motor and drivetrain load.",
        "Writes are capped by General and controller identity. This is not measured current.",
      ],
    },
    "bas.WD": {
      name: "Wheel Diameter",
      ru: [
        "Размер колеса, по которому контроллер переводит импульсы датчика в скорость.",
        "Несоответствие реальному колесу искажает скорость и работу ограничений.",
        "Не используй его для обхода лимита. Окружность в симуляторе задаётся отдельно.",
      ],
      en: [
        "Wheel size used by the controller to convert sensor pulses into speed.",
        "A mismatch with the actual wheel distorts speed and speed limiting.",
        "Do not use it to bypass limits. Simulation circumference is entered separately.",
      ],
    },
    "bas.SMType": {
      name: "Speed Meter Type",
      ru: [
        "Выбор источника сигнала скорости. В типичном BBS используется внешний датчик колеса.",
        "Это конфигурация оборудования, а не настройка характера разгона.",
        "Сохраняй исходный тип, если не менял оборудование.",
      ],
      en: [
        "Selects the speed signal source. A typical BBS uses an external wheel sensor.",
        "This is a hardware setting, not an acceleration adjustment.",
        "Keep the original type unless the hardware has changed.",
      ],
    },
    "bas.SMSig": {
      name: "Speed Meter Signals",
      ru: [
        "Число импульсов датчика за один оборот колеса.",
        "Значение должно соответствовать реальному числу импульсов. Один магнит обычно даёт один импульс.",
        "Ошибка меняет рассчитанную контроллером скорость.",
      ],
      en: [
        "Number of speed sensor pulses in one wheel revolution.",
        "Match the actual pulse count. A single magnet normally produces one pulse.",
        "An incorrect count changes the controller's calculated speed.",
      ],
    },
    "pas.PT": {
      name: "Pedal Sensor Type",
      ru: [
        "Тип датчика вращения педалей, установленного в приводе.",
        "Меняется при изменении оборудования, а не для увеличения мощности.",
        "Оставь считанное значение: неверный тип может нарушить работу помощи.",
      ],
      en: [
        "The pedal rotation sensor type fitted to the drive.",
        "Change it for different hardware, not to increase power.",
        "Keep the read value: the wrong type may disrupt pedal assistance.",
      ],
    },
    "pas.DA": {
      name: "Designated Assist Level",
      ru: [
        "Определяет, кто выбирает уровень PAS: дисплей или фиксированное значение 0–9.",
        "Фиксированный уровень использует соответствующую строку таблицы Basic.",
        "При фиксированном значении переключение уровней на дисплее может не менять помощь.",
      ],
      en: [
        "Chooses whether the display or a fixed level from 0 to 9 selects pedal assist.",
        "A fixed level uses its corresponding Basic table row.",
        "With a fixed setting, changing the display level may no longer change assistance.",
      ],
    },
    "pas.SL": {
      name: "Speed Limit",
      ru: [
        "Общий предел скорости для помощи педалей либо команда дисплея.",
        "Процент скорости выбранного PAS дополнительно масштабирует этот предел.",
        "Больший лимит не создаёт дополнительную мощность. Передача и нагрузка могут ограничить скорость раньше.",
      ],
      en: [
        "Overall pedal-assist speed ceiling, or the limit commanded by the display.",
        "The selected PAS speed percentage scales this ceiling further.",
        "A higher ceiling does not create more power. Gearing and load can limit speed first.",
      ],
    },
    "pas.SC": {
      name: "Start Current",
      ru: [
        "Доля общего лимита тока, запрашиваемая при начале помощи педалями.",
        "Больше — сильнее начальный подхват. Слишком большой старт нагружает редуктор и цепь.",
        "Политика BBS Flash запрещает увеличение выше 20%; это отдельное ограничение приложения.",
      ],
      en: [
        "Fraction of the overall current limit requested when pedal assistance starts.",
        "Higher gives stronger initial pickup. Excessive starting force loads the gears and chain.",
        "BBS Flash blocks increases above 20%; this is a separate application policy.",
      ],
    },
    "pas.SSM": {
      name: "Slow-start Mode",
      ru: [
        "Код темпа нарастания помощи при старте.",
        "По описанию Penoff, меньший код даёт более быстрый разгон; это не шкала мощности.",
        "Реакция конкретной прошивки требует проверки. Число 8 не означает «максимальная тяга».",
      ],
      en: [
        "Code controlling how quickly assistance ramps up at startup.",
        "Penoff describes lower codes as a faster ramp; this is not a power scale.",
        "Actual firmware behavior needs verification. Code 8 does not mean maximum drive force.",
      ],
    },
    "pas.SDN": {
      name: "Start Degree · Signal No.",
      ru: [
        "Сколько импульсов педального датчика нужно до включения помощи.",
        "Больше — педали нужно провернуть дальше. Меньше — помощь появляется раньше.",
        "Penoff предупреждает о неработающих 0/1 на описанном приводе. Поддержка значений зависит от прошивки.",
      ],
      en: [
        "How many pedal sensor pulses are required before assistance starts.",
        "Higher requires more pedal movement. Lower engages assistance sooner.",
        "Penoff reports that 0/1 did not work on the drive described. Firmware support varies.",
      ],
    },
    "pas.WM": {
      name: "Work Mode",
      ru: [
        "Режим, связанный с отношением скорости педалирования и колеса.",
        "В справочнике Penoff точная семантика отмечена как неясная.",
        "Сохраняй исходное значение, включая «не задано». Подтверждённого совета ↑/↓ здесь нет.",
      ],
      en: [
        "A mode associated with the relationship between pedal and wheel speed.",
        "Penoff's manual explicitly describes its exact meaning as unclear.",
        "Preserve the original value, including Undetermined. There is no verified up/down tuning advice here.",
      ],
    },
    "pas.TS": {
      name: "Stop Delay · Time of Stop",
      ru: [
        "Задержка до прекращения помощи после остановки педалей.",
        "Единица — 10 мс: 25 соответствует 250 мс. Больше — помощь остаётся дольше.",
        "Новое значение ниже 20 заблокировано до проверки поддержки на реальном контроллере.",
      ],
      en: [
        "Delay before assistance stops after the pedals stop moving.",
        "Each unit is 10 ms: 25 means 250 ms. Higher keeps assistance active longer.",
        "A new value below 20 is blocked until actual controller support is verified.",
      ],
    },
    "pas.CD": {
      name: "Current Decay",
      ru: [
        "Код поведения снижения тока по мере роста скорости педалирования.",
        "По описанию Penoff, при меньшем значении снижение тока начинается раньше.",
        "Это не время в миллисекундах. Оценивай вместе с Keep Current и прошивкой.",
      ],
      en: [
        "Code governing current reduction as pedaling speed rises.",
        "Penoff describes lower values as starting current reduction earlier.",
        "This is not a time in milliseconds. Consider Keep Current and the firmware together.",
      ],
    },
    "pas.SD": {
      name: "Stop Decay",
      ru: [
        "Время спада помощи при остановке, отдельно от задержки обнаружения остановки педалей.",
        "Единица — 10 мс. Больше — более длительное затухание команды помощи.",
        "Это не измерение тормозного пути. Точное поведение проверь на своей прошивке.",
      ],
      en: [
        "Assistance decay time when stopping, separate from the pedal-stop detection delay.",
        "Each unit is 10 ms. Higher requests a longer decay of assistance.",
        "This is not braking distance. Verify the exact behavior on your firmware.",
      ],
    },
    "pas.KC": {
      name: "Keep Current",
      ru: [
        "Доля тока выбранного PAS, сохраняемая после снижения тока при быстром педалировании.",
        "Пример: лимит 20 A × PAS 50% × Keep 60% даёт 6 A по описанной модели.",
        "Больше — сильнее поддержка после спада. Это описание настройки, не живая телеметрия.",
      ],
      en: [
        "Fraction of the selected PAS current retained after current reduction at faster pedaling.",
        "Example: 20 A limit × 50% PAS × 60% Keep gives 6 A in the described model.",
        "Higher retains more support after decay. This describes a setting, not live telemetry.",
      ],
    },
    "thr.SV": {
      name: "Start Voltage",
      ru: [
        "Сигнал ручки газа, с которого контроллер начинает реагировать.",
        "Единица — 0.1 V: 11 означает 1.1 V. Значение связано с реальной ручкой.",
        "Порог должен быть ниже End Voltage. Слишком низкий порог может вызвать нежелательный подхват.",
      ],
      en: [
        "Throttle signal voltage at which the controller starts responding.",
        "Each unit is 0.1 V: 11 means 1.1 V. Match the actual throttle hardware.",
        "It must be below End Voltage. Too low a threshold can cause unwanted pickup.",
      ],
    },
    "thr.EV": {
      name: "End Voltage",
      ru: [
        "Сигнал ручки, соответствующий её полному запросу в рамках остальных лимитов.",
        "Настраивает полезный ход ручки. Единица — 0.1 V: 35 означает 3.5 V.",
        "Калибруй по измеренному сигналу. Пресеты этот параметр не изменяют.",
      ],
      en: [
        "Throttle signal corresponding to a full request within the other limits.",
        "Calibrates the useful throttle travel. Each unit is 0.1 V: 35 means 3.5 V.",
        "Use the measured signal for calibration. Templates preserve this parameter.",
      ],
    },
    "thr.MODE": {
      name: "Throttle Mode",
      ru: [
        "Выбирает, чем управляет положение ручки: запросом скорости или тока.",
        "В режиме тока ход ручки задаёт ток. В режиме скорости — скоростную цель контроллера.",
        "Отклик и задержка зависят от прошивки и измерения скорости.",
      ],
      en: [
        "Chooses whether throttle position requests speed or current.",
        "Current mode maps throttle travel to current. Speed mode requests a speed target.",
        "Response and delay depend on the firmware and speed measurement.",
      ],
    },
    "thr.DA": {
      name: "Throttle · Designated Assist",
      ru: [
        "Выбирает строку PAS, чьи ограничения использует ручка газа: дисплей или фиксированный уровень.",
        "Фиксированная высокая ступень может дать сильный подхват даже при низком PAS на дисплее.",
        "Проверь дельту перед записью. Пресеты не меняют назначение ручки газа.",
      ],
      en: [
        "Selects the PAS row whose limits the throttle uses: display-selected or fixed.",
        "A high fixed level may give strong pickup even with a low PAS on the display.",
        "Review the change before writing. Templates preserve throttle designation.",
      ],
    },
    "thr.SL": {
      name: "Throttle · Speed Limit",
      ru: [
        "Предел скорости при использовании ручки газа.",
        "Меньше — раньше ограничивается дальнейший разгон; реальная скорость зависит от нагрузки.",
        "Взаимодействие с назначенным PAS зависит от прошивки. Не считай лимит гарантированным ограничителем.",
      ],
      en: [
        "Speed ceiling used while operating the throttle.",
        "Lower limits further acceleration earlier; actual speed depends on load.",
        "Interaction with designated PAS depends on firmware. Do not treat it as a guaranteed limiter.",
      ],
    },
    "thr.SC": {
      name: "Throttle · Start Current",
      ru: [
        "Доля общего лимита тока при начале реакции ручки газа.",
        "Больше — сильнее первый подхват. При лимите 20 A значение 10% соответствует 2 A.",
        "Повышение выше 20% заблокировано политикой BBS Flash. Слишком резкий старт нагружает трансмиссию.",
      ],
      en: [
        "Fraction of the overall current limit when throttle response begins.",
        "Higher gives stronger initial pickup. With a 20 A limit, 10% corresponds to 2 A.",
        "BBS Flash blocks increases above 20%. A sharp start loads the drivetrain.",
      ],
    },
    assist: {
      name: "Assist 0–9 · Current / Speed",
      ru: [
        "Каждая строка задаёт два ограничения: долю общего тока и долю предела скорости.",
        "Ток влияет на доступную тягу, скорость — на момент ограничения дальнейшего разгона.",
        "Поведение PAS 0 и ручки газа зависит от прошивки. Значения таблицы — команды, не измерения.",
      ],
      en: [
        "Each row sets two limits: a fraction of total current and a fraction of the speed ceiling.",
        "Current affects available drive force; speed determines when further acceleration is limited.",
        "PAS 0 and throttle behavior depend on firmware. Table values are commands, not measurements.",
      ],
    },
  },
};
