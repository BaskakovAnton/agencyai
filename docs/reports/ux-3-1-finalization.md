# UX-3.1 FINALIZATION — устранение замечаний аудита

**Тип:** Git Hygiene / Documentation / Final Verification. **Коммит и push не выполнялись.**
**Дата:** 25.11.2026 · **Ветка:** `main` · **HEAD:** `4a4815b` (= `origin/main`)

## 1. Закрытые замечания

### B1 — `docs/reports/` игнорировался Git · ЗАКРЫТО

**Назначение исходного правила:** `.gitignore`, строка 22, `reports/` — выгрузки терминальной модели (`src/io/writers.ts`: `REPORTS_DIR = "reports"`; `src/cli/args.ts`: `outDir: get("--out") ?? "reports"`; README: «`reports/`: отчёт и финальное состояние»). Правило задумывалось для **корневого** каталога, но без якоря матчило каталог на любой глубине, включая `docs/reports/`.

**Выбран вариант:** замена на якорное `/reports/` (минимальная правка; исключения `!docs/reports/` не понадобились, так как вложенных каталогов `reports/` в проекте нет). Комментарий уточнён: «Выгрузки терминальной модели в корне репозитория».

**Проверка (фактический вывод):**

| Команда | Результат |
|---|---|
| `git check-ignore -v docs/reports/ux-3-kpi-periods.md` | не игнорируется |
| `git check-ignore -v docs/reports/ux-3-1-kpi-correctness.md` | не игнорируется |
| `git check-ignore -v docs/reports/ux-3-1-1-historical-mode.md` | не игнорируется |
| `git check-ignore -v docs/reports/ux-3-1-2-historical-consistency.md` | не игнорируется |
| `git check-ignore -v docs/reports/ux-3-1-final-audit.md` | не игнорируется |
| `git check-ignore -v reports/x.md` (корень) | игнорируется — `​.gitignore:23:/reports/` (исходный смысл сохранён) |
| `git status --short` | отчёты видны как новые файлы |

### M1 — дублирование `lastSubmitter` в UI · ЗАКРЫТО

**Было:** `src/web/org-integration.ts:132` — `[...lifecycle.records].reverse().find((record) => record.type === "submitted")?.byUserId ?? null`.
**Стало:** `const submitter = lastSubmitter(lifecycle.records);` — доменный источник `src/core/org/completion-types.ts:84`, ре-экспортируемый `src/core/org/completion.ts`.
**Эквивалентность проверена:** ядро возвращает `byUserId` последней записи типа `submitted` или `null` — та же семантика, что и прежнее выражение; правила не менялись.
**Тесты (сначала тест, затем правка):** новый `tests/org-actions.test.ts` — 4 проверки: демо содержит обращения на проверке; для **каждого** такого обращения сдавший работу не видит доступного подтверждения (сверка с доменным `lastSubmitter`); контролёр может подтвердить чужую работу и не может свою; неизвестный пользователь не получает действий. Тест проходил до рефакторинга и после него — поведение сохранено.

### M2 — нет записи об этапе UX-3.1 · ЗАКРЫТО

Факт подтверждён: записи об этапе UX-3.1 в журнале не было. Добавлена отдельная строка **в конец** журнала (append-only), с пометкой о восстановлении: исправление `attention`, разделение `reachedTerminal` и `approved`, корректировка Snapshot, согласование Dashboard/реестра/карточки, результаты тестов этапа (286 unit + 66 e2e) и ссылка на `docs/reports/ux-3-1-kpi-correctness.md`. Дублирования существующих записей нет: запись описывает иной этап, чем строки UX-3, UX-3.1.1, UX-3.1.2 и аудита.

### M4 — контракт порядка событий · ЗАКРЫТО (документацией)

Добавлены пояснения без изменения модели и поведения:
- `src/core/org/completion-types.ts` — комментарий к `IncidentLifecycle.records`: журнал **append-only** (только `withRecord` в конец), порядок массива — часть контракта, записи с одинаковым `at` разрешаются по позиции (побеждает последняя), потребители не должны пересортировывать журнал, sequence ID не нужен;
- `src/core/analytics/snapshot.ts` — комментарий к `lifecycleStatusOn`: сортировка не применяется, порядок берётся из контракта журнала.
- Подтверждающий тест уже существует: `tests/event-order.test.ts` (6 сценариев с одинаковым timestamp).

## 2. Открытые замечания

| ID | Уровень | Замечание | Статус |
|---|---|---|---|
| M3 | MEDIUM | пре-существующие нарушения лимита 200 строк: `tests/web.test.ts` 212, `src/web/timeline-view.ts` 203 | открыто (по условию задания не исправлялось) |
| L1 | LOW | лишний слой `src/web/periods-reexport.ts` | открыто |
| L2 | LOW | `src/web/incident.ts` берёт `slaHoursLeft` через `overview.ts` вместо ядра | открыто |
| L3 | LOW | нет индикатора исторического среза на `#timeline` и в `#chat` | открыто |
| L4 | LOW | тач-цели меньше рекомендованных (2837 замеров) | открыто |
| L5 | LOW | смена дня в реестре теряет фокус поиска при полной перерисовке | открыто |
| L6 | LOW | инцидент аудита: при записи журнала были потеряны две строки, восстановлены дословно | закрыто, зафиксировано в отчёте аудита |

## 3. Изменённые файлы финализации

| Файл | Изменение | Строк |
|---|---|---|
| `.gitignore` | `reports/` → `/reports/` + уточнён комментарий (B1) | 35 |
| `src/web/org-integration.ts` | доменный `lastSubmitter` вместо локального вычисления (M1) | 140 |
| `src/core/org/completion-types.ts` | комментарий-контракт append-only (M4) | 107 |
| `src/core/analytics/snapshot.ts` | комментарий о порядке записей (M4) | 99 |
| `tests/org-actions.test.ts` | **новый**, 4 проверки (M1) | 40 |
| `docs/journal.md` | запись об этапе UX-3.1 (M2) и запись о финализации | 63 записи |
| `docs/reports/ux-3-1-finalization.md` | **новый**, этот отчёт | — |
| `demo/app.js` | пересборка после правки UI (M1) | — |

Бизнес-логика UX-3.1.x, правила Snapshot и Flow, модельное время и исторический режим не изменялись.

## 4. Результаты проверок

| Проверка | Результат |
|---|---|
| `bun run typecheck` | чисто |
| `bun test` | **313 pass / 0 fail** (было 309; +4 теста M1), 64 файла |
| `bun run build:demo` | собрано, 7 файлов |
| `bun run e2e` | **72 passed / 0 failed** |
| `bun run audit` | 137 замеров: axe **0**, контраст **0**, overflow **0**, кеглей <12 px **0** |
| `bun run scripts/verify-live.ts` (`LIVE_BASE=http://127.0.0.1:4321/`) | **LIVE OK** |
| Изменения к коммиту | **57 путей**: 36 изменённых (tracked) + 6 отчётов в индексе + 15 новых вне индекса |
| `git diff --check` | ошибок пробелов нет |
| `git check-ignore -v docs/reports/ux-3-1-final-audit.md` | не игнорируется |
| Лимит 200 строк | соблюдён во всех изменённых файлах (максимум — `src/web/incident-html.ts` 196) |

## 5. Подтверждение видимости отчётов для Git

Все шесть отчётов каталога `docs/reports/` не игнорируются и видны Git:
`ux-3-kpi-periods.md`, `ux-3-1-kpi-correctness.md`, `ux-3-1-1-historical-mode.md`, `ux-3-1-2-historical-consistency.md`, `ux-3-1-final-audit.md`, `ux-3-1-finalization.md`. Проверено `git check-ignore` (пустой ответ для каждого) и `git status --short` (каталог показан как новый). Файлы добавлены в индекс (`git add docs/reports`) — **без коммита**, чтобы проверить `git ls-files docs/reports`. Ссылки из `docs/journal.md` на все отчёты ведут на существующие файлы.

## 6. Состояние рабочего дерева

- Ветка `main`, HEAD `4a4815b` = `origin/main`; коммитов и push не делалось.
- Ничего не удалено: удалённых путей нет; прежние изменения не сбрасывались и не перезаписывались.
- **57 путей к коммиту** (точные данные `git diff --name-only`, `git diff --cached --name-only`, `git ls-files --others --exclude-standard`): 36 изменённых — `src/web` 10, `src/core` 4, `tests` 2, `e2e` 1, `demo` 2, `.gitignore`, `docs/journal.md`, 15 снимков аудита; 6 отчётов в индексе; 15 новых вне индекса — `src/core/analytics` 2 (`registry.ts`, `kpi-types.ts`), `src/web/historical.ts`, 11 файлов тестов, `e2e/ux-historical.spec.ts`.
- Индекс: отчёты `docs/reports/` добавлены (`git add`), остальные файлы — по-прежнему только в рабочем дереве; готово к `git add -A && git commit` по команде владельца.

## 7. Заключение

**READY FOR COMMIT.** Все четыре замечания финализации (B1, M1, M2, M4) закрыты с доказательствами; открытыми остаются только M3 и L1–L5, которые по условию задания не исправлялись и блокирующими не являются. Проверки: typecheck чисто, 313 unit / 0 fail, 72 e2e / 0 fail, сборка 7 файлов, аудит без нарушений, локальный `verify-live` — LIVE OK. Изменения готовы к фиксации в Git; решение о commit и push принимает владелец.
