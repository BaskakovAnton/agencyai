# AgencyAI — baseline редизайна (Этап 0)

**Дата:** 17.11.2026
**Ветка:** `redesign/deepseek-harness` (от `main` = `19fd5ef`)
**Статус:** PASS — продуктовый код не изменён
**Инструмент скриншотов:** `scripts/redesign-shots.ts`

---

## 1. Инструменты, доступные в этой сессии

| Возможность | Есть | Комментарий |
|---|---|---|
| Чтение/поиск файлов | ✔ | read, glob, grep |
| Редактирование файлов | ✔ | write, edit |
| Терминал | ✔ | pwsh; bun 1.4.4 по абсолютному пути |
| Unit/E2E тесты | ✔ | `bun test`, `bun run e2e` (Playwright + chromium) |
| Браузерная проверка | ✔ | Playwright-скрипты проекта, скриншоты |
| axe-core (доступность) | ✔ | devDependency, `bun run audit` |
| Субагенты | ✔ | только анализ/review, без параллельного редактирования общих файлов |
| browser-use / computer-use | ✘ | вместо них локальный Playwright |
| Просмотр изображений | ✘ | модель без image input: пиксельную сверку делает владелец; я даю скриншоты и замеры DOM |

**Отклонение от гайда (§3):** сессия работает в `danger-full-access` с автоотклонением approvals. Владелец подтвердил режим «как есть» при условии отсутствия разрушительных команд (никаких `reset --hard`, `clean -fd`, force push, установок плагинов).

## 2. Точки входа и сборка

| Что | Файл | Как работает |
|---|---|---|
| Оболочка страницы | `src/web/index.html` | `#nav`, `#app`, подключает `./app.js` |
| Вход приложения | `src/web/main.ts` | экспортирует API модели; `demoModel(seed=7)` = `buildProcessGraph(NODES)` + `buildStory`; `mountRouter(graph, story)` по DOMContentLoaded |
| Роутер | `src/web/router.ts` | `parseRoute(hash)`, `mountRouter`, `hrefTimeline`, `hrefChat`; на каждый hashchange пересоздаёт `#app` |
| Сборка | `scripts/build-web.ts` | `Bun.build` → `demo/app.js` + копии `index.html`, `style.css`; `bun run build:demo` |
| Локальная раздача | `scripts/serve-demo.ts` | статика `demo/` на `http://127.0.0.1:4321` |
| Скриншоты | `scripts/redesign-shots.ts` | `bun run scripts/redesign-shots.ts <outDir>` (нужен запущенный сервер) |

## 3. Фактические маршруты

| Hash | route.name | Параметры | Обработчик | Данные | Эталон |
|---|---|---|---|---|---|
| `#` и **любой неизвестный** (включая `#model`) | model | игнорируются | `mountModel` | `createState(buildGraph(NODES), seed)` + `generateIncidents` + навигация | `model.html` |
| `#timeline?at=YYYY-MM-DD&view=git\|gantt` | timeline | `at`, `view` | `mountTimeline` | `buildStory(graph, 7)`, `buildGitGraph`, `buildGantt`, `sla-at`, `conversation` | `timeline-git.html`, `timeline-gantt.html` |
| `#chat/<id>?at=YYYY-MM-DD` | chat | `incidentId`, `at` | `mountChat` | `conversationFor`, `chatAt`, `slaPhaseOnDay` | `chat.html` |
| `#dashboard`, `#incidents`, `#incident/<id>` | **нет** | — | попадают в model | — | `overview.html`, `incidents.html`, `incident-detail.html` |

Детали: `view` распознаёт только `gantt`, остальное → `git`; пустой/неизвестный `at` → последний день истории; URL обновляется через `history.replaceState` (перемотка дня, смена вида). Отдельного `#model` нет — это fallback.

## 4. Источники данных

| Слой | Файлы | Что даёт |
|---|---|---|
| История | `core/story.ts`, `core/timeline.ts`, `data/hero.ts` | 30 заявок с датами; `DEMO_ORIGIN=2025-12-20T09:00Z`, создание каждые 12 ч; герой З-015 (U6→U7→U19) |
| SLA | `core/sla.ts`, `core/sla-at.ts`, `data/sla.ts` | фазы ok/paused/overdue/none, профили 1/24, 24/72, ≤720 ч, пауза U14 / возобновление U15, пересчёт U2 |
| Граф и Гант | `core/gitgraph.ts`, `core/gantt.ts` | коммиты, связи, колонки-узлы; сегменты по дням |
| Переписка | `core/conversation.ts`, `data/messages.ts` | сценарные сообщения по узлам, снимок на дату |
| Процесс | `core/navigation.ts`, `core/graph.ts`, `data/edges.ts` | переходы, развилки с весами, `prev` |
| Роли и права | `core/roles.ts`, `data/roles.ts` | 7 ролей, 30 узлов, уровни доступа, названия |
| Ситуации | `data/situations.ts`, `data/situation-nodes.ts` | 37 ситуаций: шаги, приоритет, SLA, связь с узлами |
| Заявки | `core/incident.ts`, `core/generator.ts` | id `З-001…З-030`, приоритеты, сортировка |

**Только демонстрация:** все заявки генерируются из seed; CLI (`src/cli`), отчёты и запись на диск (`src/io/writers.ts`, `reports/`) — вне веб-демо; переписка read-only; backend/API/БД/авторизации нет. Данные в HTML-эталонах — вымышленные, за реальные не принимать.

## 5. Стили и тема

- `src/web/style.css` — 200 строк, тёмная тема в `:root` (`--bg #0f1115`, `--panel #171a21`, `--text #e7ebf2`, `--accent #4da3ff`, `--hero #ffd166`), один медиазапрос `max-width:1100px` и узкая правка `max-width:700px` для строк «Модели».
- `src/web/theme.ts` — цвета ролей (7) и фаз SLA (4), инициалы, значки развилки/слияния.
- Светлой темы и системы токенов нет: план редизайна требует светлую как основную — это работа Этапа 1.

## 6. Baseline проверок

| Проверка | Команда | Результат |
|---|---|---|
| Типы | `bun run typecheck` | чисто, 0 ошибок |
| Unit | `bun test` | **160 pass / 0 fail**, 33 файла, 3329 expect |
| E2E | `bun run e2e` | **26 passed** (chromium) |
| Сборка | `bun run build:demo` | `demo/app.js`, `demo/index.html`, `demo/style.css`; `git status` без изменений → вывод детерминирован |
| Аудит UI (16.11) | `bun run audit` | 82 находки, axe serious = 0 |

E2E-сценарии: `e2e/timeline.spec.ts` (12), `e2e/model.spec.ts` (7), `e2e/chat.spec.ts` (7).

## 7. Baseline-скриншоты

Папка `docs/screenshots/redesign-baseline/` — 32 PNG (~3,4 МБ):

- приложение: `app-{model,timeline-git,timeline-gantt,chat}-{1440,1024,768,390}.png` — 16;
- эталоны: `ref-{index,overview,incidents,incident-detail,timeline-git,timeline-gantt,chat,model}-{1440,390}.png` — 16.

## 8. Карта «экран → маршрут → исходник → данные → тесты → эталон»

| Экран | Маршрут | Исходники UI | Данные | Тесты | Эталон |
|---|---|---|---|---|---|
| Модель процесса | `#` (fallback) | `model-view.ts`, `view.ts`, `card.ts`, `session.ts` | `NODES`, `generateIncidents`, `navigation`, `roles`, `sla` | `web.test.ts`, `web-session.test.ts`, `model.spec.ts` | `model.html` |
| Хронология · Git | `#timeline?...&view=git` | `timeline-view.ts`, `timeline-html.ts`, `git-svg.ts`, `node-card.ts` | `story`, `gitgraph`, `sla-at`, `conversation` | `timeline-html.test.ts`, `git-svg.test.ts`, `node-card.test.ts`, `timeline.spec.ts` | `timeline-git.html` |
| Хронология · Гант | `#timeline?...&view=gantt` | `gantt-grid.ts`, `timeline-html.ts` | `gantt`, `sla-at` | `gantt-grid.test.ts`, `timeline.spec.ts` | `timeline-gantt.html` |
| Переписка | `#chat/<id>?at=` | `chat-view.ts`, `chat-html.ts` | `conversation`, `messages`, `sla-at` | `conversation.test.ts`, `chat.spec.ts` | `chat.html` |
| Обзор | нет | нет | — | — | `overview.html` |
| Обращения | нет | нет | — | — | `incidents.html` |
| Детали обращения | нет | нет | — | — | `incident-detail.html` |

## 9. Ограничения и риски

1. **Тема:** текущая тёмная; план требует светлую основную — Этап 1 меняет палитру и вводит токены.
2. **Маршруты:** `#dashboard`, `#incidents`, `#incident/<id>` отсутствуют; любой неизвестный hash сейчас молча показывает модель. Добавлять новые нужно так, чтобы не сломать fallback и старые URL.
3. **Sandbox:** гайд требует `workspace-write` + approvals, сессия — `danger-full-access` (решение владельца «как есть», без разрушительных команд).
4. **Коммиты:** по решению владельца коммитов нет; изменения копятся в рабочем дереве ветки.
5. **Визуальная приёмка:** я не вижу изображения; сверка возможна через скриншоты (владелец/модель с image input) и замеры DOM, но не пиксельно.
6. **Размер артефактов:** baseline ~3,4 МБ; решить, что коммитить из скриншотов.
7. **Документы:** комплект скопирован в `docs/`; версии `redesign-plan.md` (589 строк) и `claude-code-redesign-tasks.md` (670 строк) из кита перекрыли более короткие варианты из коммита `913a908`.

## 10. Следующий шаг

Этап 1 — централизованные design tokens, App Shell (Sidebar/Topbar/PageHeader), адаптивная навигация, сохранение всех текущих маршрутов и тестов. Начинать только после приёмки Этапа 0.
