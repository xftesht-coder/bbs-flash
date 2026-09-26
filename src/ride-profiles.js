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
      traits: [2,5,1],
    },
    {
      id: "smooth", code: "02 / FLOW", category: "calm", tone: "blue",
      name: ["Суперплавный", "Super smooth"],
      tagline: ["Мягкое включение. Плавные ступени.", "Gentle engagement. Gradual steps."],
      description: ["Стартовый ток 10%, более плавный код нарастания 6 и небольшие прибавки между уровнями. Цель — спокойный подхват при начале педалирования.", "10% start current, gentler ramp code 6 and small steps between levels. Intended for a calmer initial pickup."],
      tradeoff: ["Отклик менее резкий; это не датчик момента. Фактическую плавность нужно проверить на твоей прошивке. На подъёме заранее выбирай лёгкую передачу.", "Response is less sharp; this does not add a torque sensor. Actual smoothness needs testing on your firmware. Select a low gear before climbing."],
      cap: 18, current: [0,15,23,32,42,53,65,77,89,100], speed: [0,60,70,80,90,100,100,100,100,100],
      start: 10, ramp: 6, pulses: 5, keep: 50, decay: 5,
      traits: [2,5,3],
    },
    {
      id: "city", code: "03 / CITY", category: "daily", tone: "orange",
      name: ["Городской ритм", "City rhythm"],
      tagline: ["Уверенный подхват для повседневных поездок.", "Responsive help for everyday rides."],
      description: ["Универсальная отправная точка: старт 12%, включение после 4 импульсов и равномерный рост помощи. Первые уровни — спокойные, верхние — заметно бодрее.", "An everyday starting point: 12% start, engagement after 4 pulses and progressive assistance. Lower levels stay gentle; upper levels add more help."],
      tradeoff: ["Частые разгоны увеличивают расход. Название не задаёт разрешённую скорость: предел дисплея и условия маршрута проверяй отдельно.", "Frequent acceleration uses more energy. The name does not set a permitted speed: check your display limit and route conditions separately."],
      cap: 20, current: [0,18,27,37,48,59,70,80,90,100], speed: [0,55,65,75,85,95,100,100,100,100],
      start: 12, ramp: 4, pulses: 4, keep: 60, decay: 6,
      traits: [3,4,3],
    },
    {
      id: "park", code: "04 / PARK", category: "calm", tone: "mint",
      name: ["Прогулка в парке", "Park cruise"],
      tagline: ["Спокойная помощь для неспешной прогулки.", "Gentle help for an unhurried ride."],
      description: ["Невысокий потолок PAS до 12 А и уменьшенные проценты скорости: от 25% до 60% текущего предела. Мотор включается после 6 импульсов педалей.", "PAS capped at 12 A with speed percentages from 25% to 60% of the existing limit. Assistance engages after 6 pedal pulses."],
      tradeoff: ["Это не ограничитель скорости в км/ч и не пешеходный режим. Например, 60% от 40 км/ч — расчётные 24 км/ч, что слишком быстро рядом с людьми. Установи подходящий предел отдельно.", "This is not an absolute speed limiter or a walking mode. For example, 60% of 40 km/h is an estimated 24 km/h, too fast around people. Set an appropriate limit separately."],
      cap: 12, current: [0,18,25,33,42,52,63,75,87,100], speed: [0,25,30,35,40,45,50,55,60,60],
      start: 10, ramp: 6, pulses: 6, keep: 40, decay: 4,
      traits: [1,5,1],
    },
    {
      id: "trail", code: "05 / TRAIL", category: "active", tone: "sand",
      name: ["Бездорожье", "Trail control"],
      tagline: ["Дозируй тягу. Работай передачами.", "Meter the assistance. Use your gears."],
      description: ["До 20 А PAS, умеренный старт 12% и более выраженная поддержка на средних уровнях. Для неровного покрытия, где важнее дозировать помощь, чем резко стартовать.", "Up to 20 A PAS, moderate 12% starting current and stronger mid-level support. For uneven surfaces where control matters more than a hard launch."],
      tradeoff: ["Профиль не добавляет сцепления. Тяжёлая передача, низкий каденс и затяжной подъём нагружают BBS02. Понижай передачу, а не только повышай PAS.", "A profile cannot add tire grip. A high gear, low cadence and a long climb load the BBS02. Shift down instead of only raising PAS."],
      cap: 20, current: [0,20,30,42,55,67,78,87,94,100], speed: [0,60,70,80,90,100,100,100,100,100],
      start: 12, ramp: 5, pulses: 4, keep: 65, decay: 6,
      traits: [3,3,4],
    },
    {
      id: "forward", code: "06 / BOOST", category: "active", tone: "orange",
      name: ["Полный вперёд", "Full ahead"],
      tagline: ["Самый энергичный старт в этой подборке.", "The most energetic start in this collection."],
      description: ["Старт 20%, код нарастания 3 и включение после 3 импульсов. Больше помощи уже на первых ступенях; потолок PAS — до исходного лимита, максимум 25 А.", "20% start current, ramp code 3 and engagement after 3 pulses. More assistance on early levels; PAS stays within the original ceiling, up to 25 A."],
      tradeoff: ["Выше нагрузка на цепь, редуктор и батарею. Это экспериментальный бодрый профиль, а не обещание «ракетного» разгона. Первую проверку делай с низкого PAS и лёгкой передачи.", "Higher loads on the chain, gears and battery. This is an experimental lively tune, not a promised rocket launch. First evaluate it at a low PAS level and in a low gear."],
      cap: 25, current: [0,25,35,46,57,68,78,87,94,100], speed: [0,65,75,85,95,100,100,100,100,100],
      start: 20, ramp: 3, pulses: 3, keep: 70, decay: 7,
      traits: [5,2,5],
    },
    {
      id: "speed", code: "07 / CRUISE", category: "active", tone: "blue",
      name: ["Максимальная скорость", "Maximum speed"],
      tagline: ["Один предел скорости. Разная сила помощи.", "One speed ceiling. Different assist levels."],
      description: ["На PAS 1–9 процент скорости равен 100%, а ток растёт по ступеням. Это убирает дополнительное ограничение скорости уровня PAS, сохраняя предел дисплея и контроллера.", "PAS 1–9 use 100% speed with progressively higher current. This removes the extra PAS-level speed cap while retaining display and controller limits."],
      tradeoff: ["Новая максималка не гарантирована: её определяют передача 32T, задняя звезда, каденс, заряд и нагрузка. Профиль не повышает напряжение и не снимает общий лимит скорости.", "A higher top speed is not guaranteed: the 32T chainring, rear sprocket, cadence, charge and load determine it. This does not increase voltage or remove the overall speed limit."],
      cap: 25, current: [0,15,23,32,42,54,66,78,90,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 12, ramp: 4, pulses: 4, keep: 65, decay: 6,
      traits: [3,3,5],
    },
    {
      id: "acceleration", code: "08 / KAMON", category: "active", tone: "orange",
      name: ["Камон! Ускорение", "Come on! Acceleration"],
      tagline: ["Быстрый подхват. Собранный городской разгон.", "Quick pickup. A focused city launch."],
      description: ["Для повторных стартов после остановок: включение после 3 импульсов, старт 18% и код нарастания 3. В сравнении с «Полный вперёд» потолок PAS ниже — до 22 А, а остаточная помощь 55% вместо 70%. Задумка — бодро набрать ход и больше участвовать педалями дальше.", "For repeated starts after stops: engagement after 3 pulses, 18% start and ramp code 3. Compared with Full ahead, PAS is capped lower at 22 A and keep current is 55% rather than 70%. The intent is a lively pickup followed by more rider effort."],
      tradeoff: ["Это не турбокнопка с таймером: настройки действуют постоянно, а время и сила разгона зависят от прошивки, передачи и нагрузки. Перед стартом выбирай лёгкую передачу; на мокром покрытии такой подхват может быть избыточным.", "This is not a timed boost button: settings remain active, and acceleration depends on firmware, gearing and load. Select a low gear before starting; this pickup can be excessive on wet surfaces."],
      cap: 22, current: [0,22,32,43,54,65,76,86,94,100], speed: [0,65,75,85,95,100,100,100,100,100],
      start: 18, ramp: 3, pulses: 3, keep: 55, decay: 5,
      traits: [4,2,4],
    },
    {
      id: "climb", code: "09 / CLIMB", category: "active", tone: "sand",
      name: ["Длинный подъём", "Long climb"],
      tagline: ["Ровная поддержка. Лёгкая передача. Рабочий каденс.", "Steady support. Low gear. Keep spinning."],
      description: ["Для затяжного подъёма с активным педалированием: потолок PAS до 18 А, мягкий старт 10%, остаточная помощь 70%. В отличие от «Бездорожья», ток ниже, а процент скорости на PAS 1–9 равен 100%, чтобы ступени выбирали силу помощи без дополнительных низких порогов скорости.", "For sustained climbs with active pedaling: PAS capped at 18 A, gentle 10% start and 70% keep current. Compared with Trail control, current is lower and PAS 1–9 use 100% speed so levels select assistance without extra low speed thresholds."],
      tradeoff: ["18 А не гарантируют отсутствие перегрева. Профиль не измеряет температуру и не переключает передачи. Если каденс падает и мотор тянет внатяг, понижай передачу, помогай ногами или делай паузу. Это не режим штурма крутой горки на тяжёлой передаче.", "18 A does not guarantee cool operation. This profile neither measures temperature nor shifts gears. If cadence falls and the motor labors, shift down, add rider effort or pause. It is not intended for forcing a steep climb in a high gear."],
      cap: 18, current: [0,20,30,41,53,65,76,86,94,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 10, ramp: 5, pulses: 4, keep: 70, decay: 6,
      traits: [2,4,4],
    },
    {
      id: "technical", code: "10 / PRECISION", category: "active", tone: "blue",
      name: ["Техничная тропа", "Technical trail"],
      tagline: ["Раннее включение. Малые шаги тяги.", "Early engagement. Small assist steps."],
      description: ["Для узкой тропы, поворотов и частого возобновления педалирования: 3 импульса до включения, старт 10% и плавное нарастание с кодом 6. Первые уровни дают меньше тока, чем «Бездорожье», потолок PAS — до 16 А. Ранний отклик здесь сочетается с мягким набором помощи.", "For narrow trails, turns and frequent pedaling restarts: 3 pulses to engage, 10% start and gentle ramp code 6. Early levels supply less current than Trail control, with PAS capped at 16 A. Early engagement is paired with a gentler build-up of assistance."],
      tradeoff: ["Это не контроль сцепления и не датчик момента. Случайное движение педалей тоже может включить помощь; задержки остановки остаются твоими. На сложном препятствии заранее выбирай низкий PAS или отключай помощь, если она мешает контролю велосипеда.", "This adds neither traction control nor a torque sensor. An unintended pedal movement can also engage assistance; your stop delays remain unchanged. Choose a low PAS or turn assistance off before an obstacle if it interferes with bike control."],
      cap: 16, current: [0,10,16,24,34,46,60,74,88,100], speed: [0,50,60,70,80,90,100,100,100,100],
      start: 10, ramp: 6, pulses: 3, keep: 50, decay: 5,
      traits: [2,5,2],
    },
    {
      id: "touring", code: "11 / TOUR", category: "daily", tone: "mint",
      name: ["Дальнобой", "Long-distance tour"],
      tagline: ["Умеренная помощь на целый маршрут.", "Moderate assistance for the whole route."],
      description: ["Для длинного смешанного маршрута: до 16 А PAS, старт 10%, небольшие прибавки помощи на нижних ступенях и 55% остаточной помощи. В отличие от «Максимальной экономии», есть больший запас тока на подъём; PAS 1–9 используют один общий предел скорости.", "For long mixed routes: up to 16 A PAS, 10% start, small assistance increments on lower levels and 55% keep current. Compared with Maximum economy, more current is available for hills; PAS 1–9 share the overall speed ceiling."],
      tradeoff: ["Комфорт может обойтись дороже по расходу, чем экономичный профиль. Название не обещает километраж или автоматический резерв заряда. Для твоих 48 В / 19,2 А·ч дальность нужно оценивать по реальным поездкам, рельефу и участию ногами.", "Comfort may use more energy than the economy profile. The name promises neither mileage nor an automatic charge reserve. For your 48 V / 19.2 Ah battery, assess range from actual rides, terrain and rider effort."],
      cap: 16, current: [0,12,20,29,40,52,65,78,90,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 10, ramp: 5, pulses: 5, keep: 55, decay: 5,
      traits: [2,4,3],
    },
    {
      id: "training", code: "12 / TRAIN", category: "daily", tone: "sand",
      name: ["Тренировка", "Rider workout"],
      tagline: ["Ты задаёшь темп. Мотор немного помогает.", "You set the pace. The motor lends a little help."],
      description: ["Для поездки, в которой хочется больше крутить самому: потолок PAS до 10 А, очень небольшая помощь на первых ступенях и остаточная помощь 30%. В сравнении с «Максимальной экономией» поддержки меньше, а дополнительные пороги скорости PAS убраны — можно выбирать небольшую помощь для своего темпа.", "For rides with more of your own pedaling: PAS capped at 10 A, very light assistance on early levels and 30% keep current. Compared with Maximum economy, assistance is lower and additional PAS speed thresholds are removed so you can choose light help at your own pace."],
      tradeoff: ["Это не тренажёр: профиль не измеряет пульс, мощность ног или тренировочную зону и не создаёт сопротивление. На некоторых контроллерах очень малый ток даёт слабую или незаметную помощь. Подъёмы потребуют заметной работы ногами и подходящей передачи.", "This is not an exercise trainer: it measures neither heart rate, rider power nor training zones and adds no resistance. Very low current may produce little or no noticeable assistance on some controllers. Hills require more rider effort and suitable gearing."],
      cap: 10, current: [0,8,13,20,29,40,53,68,84,100], speed: [0,100,100,100,100,100,100,100,100,100],
      start: 10, ramp: 5, pulses: 5, keep: 30, decay: 4,
      traits: [1,4,1],
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
