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
