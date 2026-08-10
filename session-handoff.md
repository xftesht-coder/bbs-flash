# Session Handoff — NeoChoice / BBS-Flash

**Date:** 2026-08-11 · **Branch:** `reconcile-v21` · **Agent:** Hermes (tencent/hy3:free)

## Что сделано (verified)
- Reconcile bbs-flash к v2.1 базе через `git am` патча (`2a4e5dd`, `096351f`).
- Перенесены eco/throttle пресеты + калькулятор дальности (`computeRange`).
- S4 локализация: i18n-движок, 83 `data-i18n`, переключатель RU/EN (IndexedDB).
- S4 тултипы: 17 `TOOLTIPS`, клавиатурно доступны.
- Киберпанк-гейт (`RESTRICTED PADDOCK`) — только CSS.
- TDD: `tests/physics.test.mjs` → **7 passed, 0 failed** (solveSpeed/computeRange/computeDelta, no-localStorage, no-REF_MAX_KMH).
- Harness-артефакты: `HERMES.md`, SKILL `reliable-agent-harness`, `feature_list.json`, этот файл.

## Критический баг (найден субагентом #10, НЕ мной)
`buildBasWriteFrame` (L1645) + `safetyGate` (L1732) проверяют только **верхнюю**
границу Current Limit. Отрицательный LC (-5) → `new Uint8Array([-5])` → байт **251
= 251 А** уходит в контроллер. Пустое поле → `NaN` → байт 0.
**Фикс (запланирован F08):** `byteField(v,lo,hi,name)` клампит + валидирует все
байты ДО `sendFrame`; `safetyGate` добавляет нижнюю границу `1..ceiling` и
`Number.isFinite`. Патч уже написан в ревью-отчёте. Ещё НЕ применён (жду
реконсиляции всех 10 юзер-тестов).

## Open blockers (НЕ могу закрыть сам)
- **F09:** удалить 6 junk-репо — GitHub DELETE 403 (токен без `delete_repo`).
  Юзер удаляет вручную на github.com ИЛИ даёт scoped-токен.
- **F10:** `textanalyzer.neochoice.ru` — висячая DNS; удаляет юзер в панели
  регистратора (агент не может).

## Важные факты среды
- Сервер `5.181.23.24` (Debian 13, nginx). SSH-ключ `/c/Users/anton/.ssh/id_ed25519` (key-only).
- Живые сайты (HTTP 200): neochoice.ru, bbsflash, roomscope, toncheck.
- **LIVE SERVER STALE:** bbsflash.neochoice.ru = старая копия БЕЗ i18n/тултипов/киберпанка. Все S4-фиксы — только в локальном `reconcile-v21`. Юзеры 1/3 жаловались на «гейт по-английски» — это старая копия на сервере, не баг локальных правок. Нужен deploy (F14).
- `tools/smoke.mjs` (Playwright/Chromium) и `Audit-BbsFlash.ps1` (PowerShell) НЕ
  запускаются локально → отмечать как `NOT VERIFIED (no browser/PS)`.
- Токен GitHub берётся из Git Credential Manager (`git credential fill`), НЕ хардкодить.

## Resume-команды (следующая сессия)
```bash
cd C:\Users\anton\Projects\bbs-flash
git log --oneline -3           # контекст ветки
node tests/physics.test.mjs    # должен быть 0 fail
# Применить F08-патч (byteField + нижняя граница LC), затем:
node tests/security.test.mjs  # НУЖНО СОЗДАТЬ (edge-case: neg/NaN/overflow)
git push origin reconcile-v21 # после brand-grep = 0
```
## Следующий шаг
Собрать отчёты юзеров 1–9 (фон в этой сессии), агрегировать с F08-ревью,
предложить юзеру принять/починить, применить фиксы, запустить тесты, запушить.
