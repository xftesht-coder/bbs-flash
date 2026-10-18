/* Curated PAS starting points, not hardware-tested tunes. Source: Penoff's
 * BBSTool Help (supplied archive). All currents are limits, not measurements. */
(function (root, factory) {
  const api = factory(typeof module === "object" ? require("./core.js") : root.BBSCore);
  if (typeof module === "object") module.exports = api;
  else root.BBSRideProfiles = api;
})(globalThis, (C) => {
  "use strict";
  const profiles = [
    {
      id: "economy", code: "01 / ECO", category: "calm", tone: "mint",
      name: ["Максимальная экономия", "Maximum economy"],
      tagline: ["Больше педалей. Меньше расхода.", "More pedaling. Less assistance."],
      description: ["Небольшая помощь на первых уровнях и потолок PAS до 12 А. Для спокойного маршрута, где ты готов больше работать ногами.", "Light assistance on early levels and a PAS ceiling up to 12 A. For relaxed routes with more rider effort."],
      tradeoff: ["Разгон и подъёмы потребуют больше помощи ногами и лёгкой передачи. Экономия не гарантирована: медленное движение под высокой нагрузкой может ухудшить КПД.", "Acceleration and hills need more rider effort and a low gear. Savings are not guaranteed: slow, heavily loaded riding can reduce efficiency."],
      cap: 12, current: [0,15,22,30,38,48,60,72,86,100], speed: [0,45,55,65,75,85,90,95,100,100],
      start: 10, ramp: 6, pulses: 6, keep: 40, decay: 4,
    },
    {
      id: "smooth", code: "02 / FLOW", category: "calm", tone: "blue",
      name: ["Суперплавный", "Super smooth"],
      tagline: ["Мягкое включение. Плавные ступени.", "Gentle engagement. Gradual steps."],
      description: ["Стартовый ток 10%, более плавный код нарастания 6 и небольшие прибавки между уровнями. Цель — спокойный подхват при начале педалирования.", "10% start current, gentler ramp code 6 and small steps between levels. Intended for a calmer initial pickup."],
      tradeoff: ["Отклик менее резкий; это не датчик момента. Фактическую плавность нужно проверить на твоей прошивке. На подъёме заранее выбирай лёгкую передачу.", "Response is less sharp; this does not add a torque sensor. Actual smoothness needs testing on your firmware. Select a low gear before climbing."],
      cap: 18, current: [0,15,23,32,42,53,65,77,89,100], speed: [0,60,70,80,90,100,100,100,100,100],
      start: 10, ramp: 6, pulses: 5, keep: 50, decay: 5,
    },
    {
      id: "city", code: "03 / CITY", category: "daily", tone: "orange",
      name: ["Городской ритм", "City rhythm"],
      tagline: ["Уверенный подхват для повседневных поездок.", "Responsive help for everyday rides."],
      description: ["Универсальная отправная точка: старт 12%, включение после 4 импульсов и равномерный рост помощи. Первые уровни — спокойные, верхние — заметно бодрее.", "An everyday starting point: 12% start, engagement after 4 pulses and progressive assistance. Lower levels stay gentle; upper levels add more help."],
      tradeoff: ["Частые разгоны увеличивают расход. Название не задаёт разрешённую скорость: предел дисплея и условия маршрута проверяй отдельно.", "Frequent acceleration uses more energy. The name does not set a permitted speed: check your display limit and route conditions separately."],
      cap: 20, current: [0,18,27,37,48,59,70,80,90,100], speed: [0,55,65,75,85,95,100,100,100,100],
      start: 12, ramp: 4, pulses: 4, keep: 60, decay: 6,
    },
    {
      id: "park", code: "04 / PARK", category: "calm", tone: "mint",
      name: ["Прогулка в парке", "Park cruise"],
      tagline: ["Спокойная помощь для неспешной прогулки.", "Gentle help for an unhurried ride."],
      description: ["Невысокий потолок PAS до 12 А и уменьшенные проценты скорости: от 25% до 60% текущего предела. Мотор включается после 6 импульсов педалей.", "PAS capped at 12 A with speed percentages from 25% to 60% of the existing limit. Assistance engages after 6 pedal pulses."],
      tradeoff: ["Это не ограничитель скорости в км/ч и не пешеходный режим. Например, 60% от 40 км/ч — расчётные 24 км/ч, что слишком быстро рядом с людьми. Установи подходящий предел отдельно.", "This is not an absolute speed limiter or a walking mode. For example, 60% of 40 km/h is an estimated 24 km/h, too fast around people. Set an appropriate limit separately."],
      cap: 12, current: [0,18,25,33,42,52,63,75,87,100], speed: [0,25,30,35,40,45,50,55,60,60],
      start: 10, ramp: 6, pulses: 6, keep: 40, decay: 4,
    },
    {
      id: "trail", code: "05 / TRAIL", category: "active", tone: "sand",
      name: ["Бездорожье", "Trail control"],
      tagline: ["Дозируй тягу. Работай передачами.", "Meter the assistance. Use your gears."],
      description: ["До 20 А PAS, умеренный старт 12% и более выраженная поддержка на средних уровнях. Для неровного покрытия, где важнее дозировать помощь, чем резко стартовать.", "Up to 20 A PAS, moderate 12% starting current and stronger mid-level support. For uneven surfaces where control matters more than a hard launch."],
      tradeoff: ["Профиль не добавляет сцепления. Тяжёлая передача, низкий каденс и затяжной подъём нагружают BBS02. Понижай передачу, а не только повышай PAS.", "A profile cannot add tire grip. A high gear, low cadence and a long climb load the BBS02. Shift down instead of only raising PAS."],
      cap: 20, current: [0,20,30,42,55,67,78,87,94,100], speed: [0,60,70,80,90,100,100,100,100,100],
      start: 12, ramp: 5, pulses: 4, keep: 65, decay: 6,
    },
    {
      id: "forward", code: "06 / BOOST", category: "active", tone: "orange",
      name: ["Полный вперёд", "Full ahead"],
      tagline: ["Самый энергичный старт в этой подборке.", "The most energetic start in this collection."],
      description: ["Старт 20%, код нарастания 3 и включение после 3 импульсов. Больше помощи уже на первых ступенях; потолок PAS — до исходного лимита, максимум 25 А.", "20% start current, ramp code 3 and engagement after 3 pulses. More assistance on early levels; PAS stays within the original ceiling, up to 25 A."],
      tradeoff: ["Выше нагрузка на цепь, редуктор и батарею. Это экспериментальный бодрый профиль, а не обещание «ракетного» разгона. Первую проверку делай с низкого PAS и лёгкой передачи.", "Higher loads on the chain, gears and battery. This is an experimental lively tune, not a promised rocket launch. First evaluate it at a low PAS level and in a low gear."],
      cap: 25, current: [0,25,35,46,57,68,78,87,94,100], speed: [0,65,75,85,95,100,100,100,100,100],
      start: 20, ramp: 3, pulses: 3, keep: 70, decay: 7,
    },
    {
      id: "speed", code: "07 / CRUISE", category: "active", tone: "blue",
      name: ["Максимальная скорость", "Maximum speed"],
      tagline: ["Один предел скорости. Разная сила помощи.", "One speed ceiling. Different assist levels."],
      description: ["На PAS 1–9 процент скорости равен 100%, а ток растёт по ступеням. Это убирает дополнительное ограничение скорости уровня PAS, сохраняя предел дисплея и контроллера.", "PAS 1–9 use 100% speed with progressively higher current. This removes the extra PAS-level speed cap while retaining display and controller limits."],
      tradeoff: ["Новая максималка не гарантирована: её определяют передача 32T, задняя звезда, каденс, заряд и нагрузка. Профиль не повышает напряжение и не снимает общий лимит скорости.", "A higher top speed is not guaranteed: the 32T chainring, rear sprocket, cadence, charge and load determine it. This does not increase voltage or remove the overall speed limit."],
      cap: 25, current: [0,15,23,32,42,54,66,78,90,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 12, ramp: 4, pulses: 4, keep: 65, decay: 6,
    },
    {
      id: "acceleration", code: "08 / KAMON", category: "active", tone: "orange",
      name: ["Камон! Ускорение", "Come on! Acceleration"],
      tagline: ["Быстрый подхват. Собранный городской разгон.", "Quick pickup. A focused city launch."],
      description: ["Для повторных стартов после остановок: включение после 3 импульсов, старт 18% и код нарастания 3. В сравнении с «Полный вперёд» потолок PAS ниже — до 22 А, а остаточная помощь 55% вместо 70%. Задумка — бодро набрать ход и больше участвовать педалями дальше.", "For repeated starts after stops: engagement after 3 pulses, 18% start and ramp code 3. Compared with Full ahead, PAS is capped lower at 22 A and keep current is 55% rather than 70%. The intent is a lively pickup followed by more rider effort."],
      tradeoff: ["Это не турбокнопка с таймером: настройки действуют постоянно, а время и сила разгона зависят от прошивки, передачи и нагрузки. Перед стартом выбирай лёгкую передачу; на мокром покрытии такой подхват может быть избыточным.", "This is not a timed boost button: settings remain active, and acceleration depends on firmware, gearing and load. Select a low gear before starting; this pickup can be excessive on wet surfaces."],
      cap: 22, current: [0,22,32,43,54,65,76,86,94,100], speed: [0,65,75,85,95,100,100,100,100,100],
      start: 18, ramp: 3, pulses: 3, keep: 55, decay: 5,
    },
    {
      id: "climb", code: "09 / CLIMB", category: "active", tone: "sand",
      name: ["Длинный подъём", "Long climb"],
      tagline: ["Ровная поддержка. Лёгкая передача. Рабочий каденс.", "Steady support. Low gear. Keep spinning."],
      description: ["Для затяжного подъёма с активным педалированием: потолок PAS до 18 А, мягкий старт 10%, остаточная помощь 70%. В отличие от «Бездорожья», ток ниже, а процент скорости на PAS 1–9 равен 100%, чтобы ступени выбирали силу помощи без дополнительных низких порогов скорости.", "For sustained climbs with active pedaling: PAS capped at 18 A, gentle 10% start and 70% keep current. Compared with Trail control, current is lower and PAS 1–9 use 100% speed so levels select assistance without extra low speed thresholds."],
      tradeoff: ["18 А не гарантируют отсутствие перегрева. Профиль не измеряет температуру и не переключает передачи. Если каденс падает и мотор тянет внатяг, понижай передачу, помогай ногами или делай паузу. Это не режим штурма крутой горки на тяжёлой передаче.", "18 A does not guarantee cool operation. This profile neither measures temperature nor shifts gears. If cadence falls and the motor labors, shift down, add rider effort or pause. It is not intended for forcing a steep climb in a high gear."],
      cap: 18, current: [0,20,30,41,53,65,76,86,94,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 10, ramp: 5, pulses: 4, keep: 70, decay: 6,
    },
    {
      id: "technical", code: "10 / PRECISION", category: "active", tone: "blue",
      name: ["Техничная тропа", "Technical trail"],
      tagline: ["Раннее включение. Малые шаги тяги.", "Early engagement. Small assist steps."],
      description: ["Для узкой тропы, поворотов и частого возобновления педалирования: 3 импульса до включения, старт 10% и плавное нарастание с кодом 6. Первые уровни дают меньше тока, чем «Бездорожье», потолок PAS — до 16 А. Ранний отклик здесь сочетается с мягким набором помощи.", "For narrow trails, turns and frequent pedaling restarts: 3 pulses to engage, 10% start and gentle ramp code 6. Early levels supply less current than Trail control, with PAS capped at 16 A. Early engagement is paired with a gentler build-up of assistance."],
      tradeoff: ["Это не контроль сцепления и не датчик момента. Случайное движение педалей тоже может включить помощь; задержки остановки остаются твоими. На сложном препятствии заранее выбирай низкий PAS или отключай помощь, если она мешает контролю велосипеда.", "This adds neither traction control nor a torque sensor. An unintended pedal movement can also engage assistance; your stop delays remain unchanged. Choose a low PAS or turn assistance off before an obstacle if it interferes with bike control."],
      cap: 16, current: [0,10,16,24,34,46,60,74,88,100], speed: [0,50,60,70,80,90,100,100,100,100],
      start: 10, ramp: 6, pulses: 3, keep: 50, decay: 5,
    },
    {
      id: "touring", code: "11 / TOUR", category: "daily", tone: "mint",
      name: ["Дальнобой", "Long-distance tour"],
      tagline: ["Умеренная помощь на целый маршрут.", "Moderate assistance for the whole route."],
      description: ["Для длинного смешанного маршрута: до 16 А PAS, старт 10%, небольшие прибавки помощи на нижних ступенях и 55% остаточной помощи. В отличие от «Максимальной экономии», есть больший запас тока на подъём; PAS 1–9 используют один общий предел скорости.", "For long mixed routes: up to 16 A PAS, 10% start, small assistance increments on lower levels and 55% keep current. Compared with Maximum economy, more current is available for hills; PAS 1–9 share the overall speed ceiling."],
      tradeoff: ["Комфорт может обойтись дороже по расходу, чем экономичный профиль. Название не обещает километраж или автоматический резерв заряда. Для твоих 48 В / 19,2 А·ч дальность нужно оценивать по реальным поездкам, рельефу и участию ногами.", "Comfort may use more energy than the economy profile. The name promises neither mileage nor an automatic charge reserve. For your 48 V / 19.2 Ah battery, assess range from actual rides, terrain and rider effort."],
      cap: 16, current: [0,12,20,29,40,52,65,78,90,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 10, ramp: 5, pulses: 5, keep: 55, decay: 5,
    },
    {
      id: "training", code: "12 / TRAIN", category: "daily", tone: "sand",
      name: ["Тренировка", "Rider workout"],
      tagline: ["Ты задаёшь темп. Мотор немного помогает.", "You set the pace. The motor lends a little help."],
      description: ["Для поездки, в которой хочется больше крутить самому: потолок PAS до 10 А, очень небольшая помощь на первых ступенях и остаточная помощь 30%. В сравнении с «Максимальной экономией» поддержки меньше, а дополнительные пороги скорости PAS убраны — можно выбирать небольшую помощь для своего темпа.", "For rides with more of your own pedaling: PAS capped at 10 A, very light assistance on early levels and 30% keep current. Compared with Maximum economy, assistance is lower and additional PAS speed thresholds are removed so you can choose light help at your own pace."],
      tradeoff: ["Это не тренажёр: профиль не измеряет пульс, мощность ног или тренировочную зону и не создаёт сопротивление. На некоторых контроллерах очень малый ток даёт слабую или незаметную помощь. Подъёмы потребуют заметной работы ногами и подходящей передачи.", "This is not an exercise trainer: it measures neither heart rate, rider power nor training zones and adds no resistance. Very low current may produce little or no noticeable assistance on some controllers. Hills require more rider effort and suitable gearing."],
      cap: 10, current: [0,8,13,20,29,40,53,68,84,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 10, ramp: 5, pulses: 5, keep: 30, decay: 4,
    },
    {
      id: "city-sport", code: "13 / SPORT", category: "daily", tone: "orange",
      name: ["Город Спорт", "City Sport"],
      tagline: ["Лёгкие первые ступени. Бодрая середина.", "Gentle lower levels. Lively mid-range."],
      description: ["Для активного города без постоянно резкого старта. Включение после 3 импульсов, старт 15% и код нарастания 4. Нижние ступени слабее «Камон!», а на ходу остаётся 60% помощи вместо 55%. Все уровни PAS используют 100% действующего предела скорости: уровень выбирает прежде всего силу помощи. Потолок PAS — до 22 А.", "For active city rides without a consistently sharp launch. Engagement after 3 pulses, 15% start and ramp code 4. Lower levels are lighter than Come on!, with 60% keep current instead of 55%. All PAS levels use 100% of the existing speed limit, primarily selecting assistance strength. PAS is capped at 22 A."],
      tradeoff: ["Не быстрее «Полного вперёд» по определению: старт мягче, запас тока меньше. Единый процент скорости не снимает общий предел и не гарантирует отсутствие пульсаций на твоей прошивке. Перед остановкой переключайся на лёгкую передачу.", "Not inherently faster than Full ahead: initial pickup is gentler and the current ceiling is lower. A shared speed percentage does not remove the overall limit or guarantee surge-free operation on your firmware. Shift to a low gear before stopping."],
      usage: [
        ["Знакомство с профилем и спокойный участок.", "Get used to the profile on a relaxed section."],
        ["Основной рабочий диапазон для активной поездки.", "The main assistance range for an active ride."],
        ["Дополнительная помощь по необходимости; расход и нагрузка выше.", "Extra help when needed, with higher energy use and load."],
      ],
      cap: 22, current: [0,14,22,33,46,60,74,85,94,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 15, ramp: 4, pulses: 3, keep: 60, decay: 6,
    },
    {
      id: "trail-flow", code: "14 / FLOW TRAIL", category: "active", tone: "blue",
      name: ["Трейл Flow", "Trail Flow"],
      tagline: ["Ранний отклик. Мягкий подхват. Запас на ходу.", "Early response. Gentle pickup. Support while moving."],
      description: ["Для волнистой тропы с частым возобновлением педалирования. По сравнению с «Бездорожьем» включается после 3 вместо 4 импульсов, старт снижен с 12% до 10%, первые ступени дают меньше тока. На верхних уровнях остаётся запас до 20 А; Keep Current 65%. Процент скорости PAS 1–9 — 100%, без дополнительных низких порогов по уровням.", "For rolling trails with frequent pedaling restarts. Compared with Trail control, it engages after 3 rather than 4 pulses, reduces start current from 12% to 10% and offers lighter lower levels. Upper levels retain up to 20 A, with 65% keep current. PAS 1–9 use 100% speed without extra low per-level thresholds."],
      tradeoff: ["Это не датчик момента и не автоматическое управление тягой. На тесном препятствии раннее включение может мешать; заранее выбирай низкий PAS. Для затяжного подъёма есть отдельный профиль с меньшим потолком тока — «Длинный подъём».", "This adds neither a torque sensor nor automatic traction control. Early engagement can be intrusive on a tight obstacle; choose a low PAS beforehand. For sustained climbs, Long climb provides a separate lower-current starting point."],
      usage: [
        ["Освоение подхвата и участки, где важнее точность.", "Learn the pickup and use it where precision matters."],
        ["Ритмичная езда по неровной тропе с работой передачами.", "Rolling trail riding while actively using the gears."],
        ["Запас помощи; не замена лёгкой передаче при падении каденса.", "Assistance reserve, not a substitute for shifting down when cadence drops."],
      ],
      cap: 20, current: [0,12,20,31,44,58,72,84,93,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 10, ramp: 5, pulses: 3, keep: 65, decay: 6,
    },
    {
      id: "loose-ground", code: "15 / SOFT", category: "calm", tone: "mint",
      name: ["Мягкий грунт", "Loose ground"],
      tagline: ["Небольшие порции помощи на нижних уровнях.", "Small portions of assistance on the lower levels."],
      description: ["Для знакомства с рыхлым покрытием на малой помощи: потолок PAS до 14 А, старт 10%, код нарастания 6 и включение после 5 импульсов. Первые три ступени намеренно небольшие; поддержка на ходу 45%. Процент скорости растёт от 40% на PAS 1 до 100% на PAS 9.", "A low-assistance starting point for loose surfaces: PAS capped at 14 A, 10% start, ramp code 6 and engagement after 5 pulses. The first three levels are deliberately light, with 45% keep current. Speed percentage rises from 40% at PAS 1 to 100% at PAS 9."],
      tradeoff: ["Профиль не обнаруживает пробуксовку и не улучшает сцепление шин. На песке, мокрых корнях или крутом уклоне этой помощи может не хватить; не компенсируй это ездой внатяг. Пороги скорости относительные, это не режим «безопасной скорости».", "The profile cannot detect wheelspin or improve tire grip. Assistance may be insufficient on sand, wet roots or steep slopes; do not compensate by laboring in a high gear. Speed thresholds are relative, not a safe-speed mode."],
      usage: [
        ["Начни здесь: небольшая помощь для проверки реакции на покрытии.", "Start here with light assistance to evaluate the surface response."],
        ["Прибавляй постепенно, если велосипед остаётся управляемым.", "Increase gradually while the bike remains controllable."],
        ["Верхний диапазон этого профиля; осторожный старт не исключает пробуксовку.", "The upper range of this profile; a gentle start does not prevent wheelspin."],
      ],
      cap: 14, current: [0,10,16,24,34,46,60,74,88,100], speed: [0,40,45,50,55,60,70,80,90,100],
      start: 10, ramp: 6, pulses: 5, keep: 45, decay: 4,
    },
    {
      id: "bread-run", code: "16 / HILL MIX", category: "daily", tone: "orange", fresh: true,
      name: ["За хлебом · баланс", "Bread run · balanced"],
      tagline: ["Умеренно в горку. Запас помощи на разгон.", "Moderate hill assistance. Extra help to build pace."],
      description: ["Для смешанной поездки с подъёмом: PAS 1–4 — постепенно растущая умеренная помощь, PAS 5–9 — больший запас до 18 А. Включение после 3 импульсов, старт 12% и код нарастания 4: ранний отклик с меньшей стартовой долей, чем у «Полного вперёд». Keep Current 60%. Все ступени используют 100% действующего предела скорости, без дополнительных низких порогов. Это не поддержание скорости: если мощности не хватает, скорость снизится.", "For mixed trips with a hill: PAS 1–4 gradually increase moderate assistance; PAS 5–9 add reserve up to 18 A. Engagement after 3 pulses, 12% start and ramp code 4 give early response with a lower starting percentage than Full ahead. Keep Current is 60%. Every level uses 100% of the existing speed limit without extra low-speed thresholds. This is not cruise control: speed drops when available power is insufficient."],
      tradeoff: ["Резкость старта общая для PAS 1–9; верхние ступени не включают отдельный режим старта. На большой горке не держись за PAS 1–4 любой ценой: заранее выбери лёгкую механическую передачу. Если мотор тянет внатяг, снизь нагрузку; при необходимости остановись. Профиль не измеряет температуру и не гарантирует отсутствие перегрева или износа. Для первого знакомства начни с низкой помощи на ровном свободном участке.", "Start behavior is shared across PAS 1–9; upper levels do not enable a separate launch mode. Do not insist on PAS 1–4 on a large hill: select a low mechanical gear in advance. If the motor labors, reduce the load and stop if necessary. This profile does not measure temperature or guarantee freedom from overheating or wear. First try low assistance on a clear, level section."],
      bands: [[1,4],[5,7],[8,9]],
      usage: [
        ["Умеренная помощь с работой ногами. На подъёме выбирай лёгкую механическую передачу; низкий PAS сам по себе не защищает мотор.", "Moderate assistance with rider effort. Select a low mechanical gear uphill; low PAS alone does not protect the motor."],
        ["Больше тяги для набора темпа и участков, где нижних ступеней мало. Перед переключением передачи разгрузи цепь.", "More assistance to build pace or where lower levels are insufficient. Unload the chain before shifting gears."],
        ["Верхний запас помощи с большим расходом. Это не временный boost и не режим с термоконтролем.", "Upper assistance reserve with higher energy use. This is neither a timed boost nor a temperature-controlled mode."],
      ],
      cap: 18, current: [0,25,38,52,65,73,81,88,94,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 12, ramp: 4, pulses: 3, keep: 60, decay: 6,
    },
    {
      id: "bread-eco", code: "17 / HILL ECO", category: "calm", tone: "mint", fresh: true,
      name: ["За хлебом · эконом", "Bread run · economy"],
      tagline: ["Меньше доступной помощи. Больше работы ногами.", "Less available assistance. More rider effort."],
      description: ["Вариант того же маршрута с потолком PAS до 14 А, стартом 10%, включением после 4 импульсов и более плавным кодом нарастания 5. Keep Current 50%. Первые четыре ступени дают умеренную помощь, пять верхних — запас внутри меньшего потолка. Общий предел скорости действует на всех уровнях: профиль не вводит низкие пороги скорости PAS, но и не обещает сохранить темп на подъёме.", "An alternative for the same route with PAS capped at 14 A, 10% start, engagement after 4 pulses and gentler ramp code 5. Keep Current is 50%. The first four levels offer moderate help; the five upper levels add reserve within the lower ceiling. The overall speed limit applies at every level: there are no additional low PAS speed caps, but maintaining uphill pace is not promised."],
      tradeoff: ["Выбирай этот вариант, если готов сильнее помогать ногами и при необходимости ехать медленнее. Меньший потолок тока не доказывает экономию на конкретной горке: езда внатяг может ухудшить КПД. Если помощь недостаточна, сначала облегчи механическую передачу и снизь нагрузку. Нет датчика нагрузки, термоконтроля или гарантии ресурса трансмиссии.", "Choose this version if you can contribute more pedaling and accept a slower pace when needed. A lower current ceiling does not prove savings on a particular hill: laboring can reduce efficiency. If assistance is insufficient, first select a lower mechanical gear and reduce load. There is no load sensing, temperature control or drivetrain-life guarantee."],
      bands: [[1,4],[5,7],[8,9]],
      usage: [
        ["Лёгкая и умеренная помощь для педалирования. На крутом участке этих ступеней может не хватить.", "Light to moderate assistance for pedaling. These levels may be insufficient on a steep section."],
        ["Добавляй помощь по потребности, сохраняя подходящую механическую передачу и свободное вращение педалей.", "Add assistance as needed while keeping a suitable mechanical gear and comfortable pedaling."],
        ["Максимум этого экономичного шаблона. Это не обещание меньшего нагрева или прежней скорости.", "The top of this economy template. It promises neither less heat nor unchanged speed."],
      ],
      cap: 14, current: [0,22,35,48,60,70,78,86,93,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 10, ramp: 5, pulses: 4, keep: 50, decay: 5,
    },
  ];
  function apply(original, id) {
    C.validate(original);
    const preset = profiles.find((p) => p.id === id);
    if (!preset) throw new C.Fault("PROFILE");
    const p = C.clone(original);
    // Preserve the global limit, so switching modes does not ratchet it down.
    // Limit assistance through PAS percentages, rounded DOWN to respect the cap.
    const scale = Math.min(1, preset.cap / p.bas.LC);
    for (let i = 1; i < 10; i++) {
      p.bas.ALC[i] = Math.floor(preset.current[i] * scale);
      p.bas.ALBP[i] = preset.speed[i];
    }
    // PAS 0 is hardware/user intent; never silently change throttle-at-PAS-0.
    p.pas.SC = preset.start;
    p.pas.SSM = preset.ramp;
    p.pas.SDN = preset.pulses;
    p.pas.KC = preset.keep;
    p.pas.CD = preset.decay;
    // Preserve sensor, Work Mode, stop timing, throttle calibration and limits.
    return C.validate(p);
  }
  return { profiles, apply };
});
