# Отчёт: этап 1 — дизайн-система и общая оболочка

> ⚠️ Уборка 24.11.2026: промежуточные каталоги скриншотов удалены из HEAD (доступны в истории git до коммита `8cb6217`). Актуальные снимки: `docs/screenshots/redesign-stage-5-kit/`, `docs/screenshots/ux4/`, `docs/screenshots/audit/` — см. `docs/screenshots/README.md`.

**Статус:** PASS локально, ждёт приёмки · **Ветка:** `main` (локальный коммит, push не делался)
**Утверждённый источник:** каталог `docs/redesign-reference/index.html` и `reference.css` из комплекта goshva.

## 1. Что сделано

- **Токены по `reference.css`:** фон `#f4f6fa`, поверхности `#fff`/`#f8fafc`, акцент `#2563eb`, тёмный акцент `#1d4ed8`, мягкий `#eaf1ff`, текст `#172033`, границы `#dce3ec`/`#e9eef4`, нейтральный `#eef2f7`, радиус 13 px, тень кита, кольцо фокуса `rgba(37,99,235,.22)`, Inter первым в стеке, сайдбар 250 px, топбар 68 px.
- **Компонентная система:** `src/web/components.css` с host-стилями тегов `ui-sidebar`, `ui-topbar`, `ui-panel`, `ui-kpi`, `ui-badge`, `ui-sla`, `ui-activity`, `ui-chat-message`, `ui-process-node` и классами кита `.panel`, `.panel-head`, `.panel-title`, `.panel-body`, `.kpi`, `.badge` (+варианты red/amber/green/blue/gray), `.sla` (+green/amber/red/gray), `.role-chip`, `.role-color`, `.avatar`, `.empty-state`, `.read-only-notice`, `.demo-notice`.
- **Оболочка на `ui-*`:** `shell.ts` теперь отдаёт `ui-sidebar` (role complementary, ширина 250) и `ui-topbar` (role banner, высота 68), H1 28 px/790 прямо в топбаре, подпись раздела, блок статуса, метка демо-данных, переключатель темы; мобильное меню и поведение сохранены.
- **Хелперы компонентов** `src/web/components.ts`: `renderPanel`, `renderKpi`, `renderBadge`, `renderSlaBadge`, `renderEmptyState`, `renderReadOnlyNotice`, `renderDemoNotice` — Light DOM, без вычислений модели, текст экранируется.
- **Сборка:** `components.css` копируется в `demo/`; страница подключает `tokens.css → components.css → shell.css → screens.css → style.css`.
- **Цвета ролей** взяты из кит-макетов (чат): житель `#4e83d9`, диспетчер `#2d986e`, подрядчик `#9066c8`, система `#a0aaba`; остальные три роли подобраны в той же гамме.

## 2. Изменённые файлы

| Файл | Что |
|---|---|
| `src/web/tokens.css` | переписан под палитру кита, роли, тёмная тема как надстройка |
| `src/web/components.css` | **новый**: host-стили `ui-*` и классы компонентов |
| `src/web/shell.css` | переписан: светлый сайдбар 250, топбар 68, nav-link, контент 1560 |
| `src/web/shell.ts` | оболочка на `ui-sidebar`/`ui-topbar`, демо-метка из хелпера |
| `src/web/components.ts` | **новый**: хелперы компонентов |
| `src/web/nav.ts` | классы `nav-item nav-link`, активный `active` |
| `src/web/index.html` | подключён `components.css` |
| `src/web/screens.css` | убраны дубли `.kpi*` (теперь в components.css), галочка на текстовый вариант успеха |
| `scripts/build-web.ts`, `tests/build-web.test.ts`, `tests/web.test.ts` | новый файл в сборке и проверках |
| `tests/design-system.test.ts`, `e2e/design-system.spec.ts` | **новые** проверки системы (вместо тестов DarkStore) |
| `tests/forest-theme.test.ts`, `e2e/forest.spec.ts` | удалены (относились к неутверждённой палитре) |

## 3. Проверки

| Проверка | Результат |
|---|---|
| `bun run typecheck` | чисто |
| `bun test` | **202 pass / 0 fail** (43 файла) |
| `bun run e2e` | **50 passed** |
| `bun run build:demo` | 7 файлов: `app.js`, `index.html`, `tokens/components/shell/screens/style.css` |
| `bun run audit` | 5 ширин × 8 экранов: axe **0**, контраст **0**, overflow **0**, кеглей <12 px **0** |
| Скриншоты | `docs/screenshots/redesign-stage-1-kit/` — 28 наших (7 × 4) + 28 панелей сравнения |

## 4. Визуальная сверка

Размеры по `redesign-validation-guide.md`: 1440×1000, 1024×900, 768×1024, 390×844, zoom 100 %. Панели `cmp-<экран>-<ширина>.png` ставят эталон слева, нашу реализацию справа. Оболочка совпадает с эталонами по составу и метрикам (сайдбар 250, топбар 68, H1 28/790, радиус 13, тень кита, светлый сайдбар).

**Осознанные отклонения от эталонов (наши доработки доступности):**

| Что | Кит | У нас | Причина |
|---|---|---|---|
| Вторичный текст | `#526176` (4.48:1) | `#4c5a6c` (5.4:1) | порог AA |
| Мелкие подписи | `#78869a` (3.6:1) | `#616f81` (4.8:1) | AA |
| Подпись «Разделы» | `#8a97a9` (2.97:1) | `#64748b` (4.6:1) | AA |
| Цвета ролей | светлые оттенки кита | те же оттенки, но темнее (`#4e83d9`→`#3566b8`, …, `#a0aaba`→`#5c6878`) | белый текст на заливке проходит AA |
| Кегли | `.badge` 10 px, `.sla` 11 px, `.role-chip` 10 px, `.avatar` 11 px | минимум 12 px | читаемость |
| Фокус | кольцо `box-shadow` | `outline: 2px` | работает в режиме высокой контрастности |
| Тёмная тема | нет | есть, как наша надстройка | ранее согласованная опция |

## 5. Регрессии

Нет: все 202 unit и 50 e2e зелёные, маршруты не менялись, `src/core` и `src/data` не тронуты, старые deep links работают.

## 6. Открытые вопросы

1. Подтвердить список отклонений доступности (таблица выше) — предлагаю принять как есть.
2. Экраны пока используют прежние классы (`.card`, `.sla s-ok`, `.prio`); перевод на `ui-panel`/`ui-badge`/`ui-sla` и kit-классы — в этапах 2–4.
3. `scripts/redesign-shots.ts` снимает 5 ширин, включая 1024×768; по гайду нужно 1024×900 — поправлю на этапе 5 (или раньше, если скажете).
4. Инструмент пиксельной сверки (`visual-acceptance.py`, `acceptance-metrics.ts`) пока сравнивает с макетами старого кита — на этапе 5 перенастрою на утверждённый комплект.

## 7. Следующий безопасный шаг

Этап 2 — «Обзор» и «Реестр обращений» по `overview.html` и `incidents.html`: KPI, «Требуют внимания», активность, поиск/фильтры/сортировка, пустой результат; все цифры — из модели, каждая формула KPI с unit-тестом.
