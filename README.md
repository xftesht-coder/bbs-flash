# BBS Flash 3.1.0

[Открыть конфигуратор](https://xftesht-coder.github.io/bbs-flash/bbs-flash.html) · [Главная](https://xftesht-coder.github.io/bbs-flash/) · [Изменения](CHANGELOG.md) · [Roadmap](ROADMAP.md)

Редактор настроек Bafang BBS UART: импорт/экспорт `.el`, пресеты, сравнение PAS, расчёт скорости и дальности, чтение контроллера и резервные копии. Vanilla JavaScript, без сборщика и зависимостей в браузере. Это **настройки, не прошивка firmware**.

**Запись экспериментальная и ещё не проверена на физическом моторе.** Она выключена по умолчанию и допускается только для известной сигнатуры HZXT SZZ9 / FW 2.0.1.1 / 48 V, после полного чтения и включения экспериментального режима. Другие модели/прошивки — только чтение. Нельзя выбирать модель вручную, чтобы обойти этот запрет. CAN не поддерживается.

Перед каждым изменением контроллера приложение дважды читает все блоки, проверяет совпадение, сохраняет оригинал в IndexedDB, проверяет сохранение и показывает точную дельту. После подтверждения снова проверяет исходные данные, записывает выбранные блоки и сверяет повторным чтением. Отказ хранилища, неверный кадр, превышение лимита или несовпадение останавливают процедуру. Это **не гарантирует безопасность оборудования**: см. [ограничения](docs/SAFETY.md).

## Запуск и проверка

Нужен Node.js 22+ для тестов; для самого сайта — статический HTTPS-хостинг. Для разработки подходит `http://localhost`.

```sh
npm ci
npm test
npm run check
npx playwright install --with-deps chromium
npm run test:browser
# Для ручной проверки, если установлен Python:
python -m http.server 8765
```

Открой `http://localhost:8765/bbs-flash.html`. Подключение к мотору требует поддерживаемого desktop Chrome/Edge, безопасного контекста и совместимого Bafang UART programming cable. Редактор и расчёты работают без Web Serial, в том числе на мобильном экране.

## Структура

- `index.html`, `landing.html` — одинаковая главная страница; `bbs-flash.html` — приложение.
- `src/core.js` — валидация, `.el`, UART, единая процедура записи, физические оценки.
- `src/storage.js` — асинхронная инициализация IndexedDB и проверяемая запись копий.
- `src/app.js`, `src/presets.js`, `src/styles.css` — интерфейс RU/EN, темы и исторические числовые образцы.
- `tests/` — независимые эталонные кадры, fixture Penoff и браузерные сценарии с имитацией порта.
- `docs/PROTOCOL.md`, `docs/TESTING.md`, `docs/DEPLOY.md` — источники, воспроизводимые проверки и публикация.

Файлы `bafang_intelligence*`, `docs-v3/`, старые промпты и `docs/archive/` — исторические материалы. Их советы не заменяют актуальную политику безопасности. Старые HTML-конфигураторы перенаправлены на текущую версию.

## English

A local Bafang UART settings workbench with `.el` import/export, PAS templates, A/B comparison, range estimates and verified backups. **Physical hardware validation is outstanding.** Writes default to off, require explicit experimental opt-in and a recognized HZXT SZZ9 / FW 2.0.1.1 / 48 V signature. Unknown controllers are read-only. There is no CAN support, firmware flashing, live telemetry or cloud profile upload. See [Safety](docs/SAFETY.md), [Protocol](docs/PROTOCOL.md) and [Roadmap](ROADMAP.md).
