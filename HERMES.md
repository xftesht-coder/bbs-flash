# HERMES.md — Workspace Harness (NeoChoice / BBS-Flash)

> **Агент читает этот файл ПЕРЕД началом любой работы в `C:\Users\anton\Projects`.**
> Он определяет структуру, жёсткие правила и **Definition of Done**. Нарушение = баг.

## 0. Как использовать
- Перед правкой файла — прочти «Структура» и «Жёсткие правила».
- Перед тем как написать пользователю «готово» / `done` — пройди чек-лист **Definition of Done** (раздел 3).
- Если проверка невозможна в среде (нет браузера / Playwright / PowerShell) — напиши явно **«НЕ проверено: <что именно>»**. Никогда не пиши «готово» вместо этого.

## 1. Структура
- `C:\Users\anton\Projects\<repo>\` — один проект = одна папка.
- `bbs-flash/` — **single-file SPA** (`bbs-flash.html`, vanilla HTML/CSS/JS, ~146 KB). НЕ дробить на модули.
- Сервер: `5.181.23.24` (Debian 13, nginx + systemd), SSH-ключ `/c/Users/anton/.ssh/id_ed25519` (key-only, password off).
- Домены: `neochoice.ru` (+www), `bbsflash`, `roomscope`, `toncheck` — живые (HTTP 200). `textanalyzer` — висячая DNS (юзер удаляет A-запись в панели регистратора). `honorchoice`/`allocation` — offline (by design).
- GitHub `xftesht-coder`: живые — `bbs-flash`, `neochoice-site`, `roomscope`, `toncheck`. **Мусор (удалить, заблокировано 403 — токен без `delete_repo`):** `agent`, `llm-council`, `ankoridzh`, `allocation-archive`, `hc`, `yagody-dota`.

## 2. Жёсткие правила (HARD RULES)
- **БРЕНД:** НИКАКОГО внешнего «Honor Choice» (HONOR-earbuds, «М-Сота», `honor-choice-*.pptx`) в любом файле перед пушем. Свой «NeoChoice» / `neochoice.ru` — можно. Перед пушем: `grep -riE 'honor|choice|earbuds'` = 0 (кроме подстроки в собственном бренде).
- **ХРАНЕНИЕ:** никакого `localStorage` / `sessionStorage` — только **IndexedDB**. Аудит P1 блокирует само слово `localStorage`.
- **Bafang-протокол:** не трогать CRC/протокол; не хардкодить `REF_MAX_KMH` (скорость = передаточное × max RPM, а не константа 45 км/ч).
- **Инварианты UI:** UI по умолчанию RU; тёмная/светлая — через CSS-переменные; **НЕ рисовать** «температуру мотора» и «кадeнс как телеметрию» (датчика/канала нет — только расчётный в симуляторе).
- **БЕЗОПАСНОСТЬ ЗАПИСИ (критично):** ВСЕ байты фрейма клампятся в `0..255` и валидируются (число, конечно, в диапазоне) **ДО** `sendFrame`. Никаких отрицательных / `NaN` → контроллер. См. `byteField()` в `build*WriteFrame`.
- **Код/комменты:** английские; переводим только видимый райдеру текст (через `data-i18n` + словарь `I18N`).

## 3. Definition of Done (ОБЯЗАТЕЛЬНО)
Задача **НЕ готова**, пока НЕ выполнено:
1. [ ] `node --check` на извлечённом JS — без ошибок.
2. [ ] Прогнаны реальные тесты, где они есть (`node tests/physics.test.mjs` для bbs-flash) — **0 fail**.
3. [ ] Для safety-critical правок (запись в контроллер) — добавлен и прогнан **edge-case тест** (отрицательное / `NaN` / переполнение).
4. [ ] Инварианты целы: `localStorage` CALLS = 0, `REF_MAX_KMH=` = 0, `safetyGate` / кнопки Write через `guardedWriteBlock` на месте.
5. [ ] Нет фоновых subagent'ов в статусе `pending`, чьи результаты влияют на «готово».
6. [ ] В ответе явно разделено: **«Проверено реальным прогоном»** vs **«НЕ проверено (нет среды/браузера)»**.

❌ **НЕ писать «готово», если выполнено только статическое наличие маркеров** (grep `data-i18n`, подсчёт ключей и т.п.) без прогона логики. Пример провала: в этой сессии ad-hoc grep показал «83 data-i18n, 17 TOOLTIPS — OK», но баг «отрицательный Current Limit → байт 251 (251 А) в контроллер» пережил все проверки и всплыл только у субагента #10.

## 4. Проверки (что реально работает локально)
```bash
cd C:\Users\anton\Projects\bbs-flash
node tests/physics.test.mjs          # TDD suite — должен быть 0 fail
# синтаксис JS:
node -e "const fs=require('fs');const h=fs.readFileSync('bbs-flash.html','utf8');const js=h.match(/<script>([\s\S]*?)<\/script>/)[1];new Function(js);console.log('JS OK')"
```
- ⛔ `tools/smoke.mjs` — нужен **Playwright + Chromium** (НЕ установлен локально) → env-blocked.
- ⛔ `tools/Audit-BbsFlash.ps1` — нужен **PowerShell** + пути `/opt/...` из песочницы Клода → env-blocked.
→ Эти двое НЕ являются доказательством готовности здесь; отмечай как «требует CI / браузера».

## 5. Известные ловушки (из прошлых сессий)
- **Ad-hoc verify-скрипты дают ЛОЖНЫЕ негативы** (assert `"90" not in html` ловит `900px` / `90deg`). Читай реальный контекст подстроки.
- **MSYS:** `git am` не видит `/c/Users/Downloads/...` — копируй патч в папку проекта.
- Случайный `./nul` ломает `git add -A` (`short read while indexing nul`) — `rm -f ./nul`.
- CSS/JS-инъекция через python `html.replace("</style>", CSS+…)` может встать **частично** — ре-грепни токены после вставки.

## 6. Handoff
Перед завершением сессии обнови `session-handoff.md` и (при долгой работе) `feature_list.json`.
