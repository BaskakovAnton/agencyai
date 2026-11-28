# Чек-лист пиксельной приёмки (C9)

| Поле | Значение |
|---|---|
| Назначение | Владелец сверяет снимки аудита с макетами и отмечает замечания; замечания превращаются в пакет исправлений с тестами |
| Как обновить снимки | `bun run audit` — 45 снимков в `docs/screenshots/audit/` |
| Как смотреть | открыть PNG в `docs/screenshots/audit/`; метрики — `audit.json` (нарушения и справочные метрики) |
| Что важно | на 390 px все интерактивные зоны ≥ 44 px; тёмная тема основная, светлая равноправна; тексты статусов не подменяются цветом |

Легенда: ☐ — не проверено, ✔ — принято, ✖ — замечание.

## mobile (390)

| Экран | Снимок | Проверено | Замечание |
|---|---|---|---|
| dashboard | `mobile-dashboard.png` | ☐ | |
| incidents | `mobile-incidents.png` | ☐ | |
| incident | `mobile-incident.png` | ☐ | |
| timeline | `mobile-timeline.png` | ☐ | |
| timeline-graph | `mobile-timeline-graph.png` | ☐ | |
| timeline-card | `mobile-timeline-card.png` | ☐ | |
| gantt | `mobile-gantt.png` | ☐ | |
| chat | `mobile-chat.png` | ☐ | |
| model | `mobile-model.png` | ☐ | |

## portrait (768)

| Экран | Снимок | Проверено | Замечание |
|---|---|---|---|
| dashboard | `portrait-dashboard.png` | ☐ | |
| incidents | `portrait-incidents.png` | ☐ | |
| incident | `portrait-incident.png` | ☐ | |
| timeline | `portrait-timeline.png` | ☐ | |
| timeline-graph | `portrait-timeline-graph.png` | ☐ | |
| timeline-card | `portrait-timeline-card.png` | ☐ | |
| gantt | `portrait-gantt.png` | ☐ | |
| chat | `portrait-chat.png` | ☐ | |
| model | `portrait-model.png` | ☐ | |

## tablet (1024)

| Экран | Снимок | Проверено | Замечание |
|---|---|---|---|
| dashboard | `tablet-dashboard.png` | ☐ | |
| incidents | `tablet-incidents.png` | ☐ | |
| incident | `tablet-incident.png` | ☐ | |
| timeline | `tablet-timeline.png` | ☐ | |
| timeline-graph | `tablet-timeline-graph.png` | ☐ | |
| timeline-card | `tablet-timeline-card.png` | ☐ | |
| gantt | `tablet-gantt.png` | ☐ | |
| chat | `tablet-chat.png` | ☐ | |
| model | `tablet-model.png` | ☐ | |

## desktop (1440)

| Экран | Снимок | Проверено | Замечание |
|---|---|---|---|
| dashboard | `desktop-dashboard.png` | ☐ | |
| incidents | `desktop-incidents.png` | ☐ | |
| incident | `desktop-incident.png` | ☐ | |
| timeline | `desktop-timeline.png` | ☐ | |
| timeline-graph | `desktop-timeline-graph.png` | ☐ | |
| timeline-card | `desktop-timeline-card.png` | ☐ | |
| gantt | `desktop-gantt.png` | ☐ | |
| chat | `desktop-chat.png` | ☐ | |
| model | `desktop-model.png` | ☐ | |

## wide (1920)

| Экран | Снимок | Проверено | Замечание |
|---|---|---|---|
| dashboard | `wide-dashboard.png` | ☐ | |
| incidents | `wide-incidents.png` | ☐ | |
| incident | `wide-incident.png` | ☐ | |
| timeline | `wide-timeline.png` | ☐ | |
| timeline-graph | `wide-timeline-graph.png` | ☐ | |
| timeline-card | `wide-timeline-card.png` | ☐ | |
| gantt | `wide-gantt.png` | ☐ | |
| chat | `wide-chat.png` | ☐ | |
| model | `wide-model.png` | ☐ | |

## Отдельные состояния (проверяются глазами на живом сайте)

| Состояние | Как открыть | Проверено | Замечание |
|---|---|---|---|
| Пустой реестр | `#incidents?at=2026-01-02&q=НЕТ-ТАКОГО` | ☐ | |
| События периода | `#incidents?period=30&at=2026-01-13` | ☐ | |
| Дата вне окна модели | `#incidents?at=2024-06-01` | ☐ | |
| Светлая тема | переключатель темы в шапке | ☐ | |
| Мобильные карточки реестра | `#incidents?at=2026-01-02` на 390 px | ☐ | |
| Список событий дня | `#timeline?at=2026-01-02` на 390 px | ☐ | |

## Процесс после приёмки

1. Замечания переносятся в план как пакеты с критериями готовности.
2. На каждое исправление — тест (unit или e2e), затем реализация.
3. После исправлений `bun run audit` обновляет снимки тем же коммитом.
