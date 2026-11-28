# Orbit CSS: исследование для мобильной веб-разработки (память проекта)

| Поле | Значение |
|---|---|
| Статус | **ГОТОВО**, проверено 28.11.2026 |
| Машиночитаемая версия | `docs/research/orbit-css-research.json` |
| Главное предупреждение | это два **разных** проекта; не смешивать в коде и документации |

## Быстрая сводка

| | Orbit (@zumer/orbit) | OrbitCSS (orbitcss) |
|---|---|---|
| Что это | CSS/JS-система радиальных интерфейсов: датчики, циферблаты, кольцевые меню | лёгкий Flexbox-фреймворк без JS: сетки, карточки, кнопки |
| Версия | **2.3.1** (релиз 12.11.2026) | **2.0.0** (релиз 27.10.2021, репозиторий архивирован 2023) |
| Пакет | `@zumer/orbit`, MIT, ⭐775 | `orbitcss`, MIT, ⭐15 |
| Репозиторий | github.com/zumerlab/orbit | github.com/OrbitCSS/orbitcss |
| Доки | zumerlab.com/orbit/ | orbitcss.com/documentation |
| Подключение | npm или CDN (unpkg/jsDelivr), нужен CSS **и** JS | только CSS (npm или jsDelivr) |
| Типы | TypeScript, React-типы, Custom Elements Manifest, VS Code custom data | нет |
| Стиль разметки | `.bigbang` → `.gravity-spot` → `.orbit-N` + `<o-arc>` / `<o-progress>` | `.grid` / `.column`, `.card__header`, модификаторы `is-*` / `has-*` |
| Для мобильного | кольцевые датчики и меню; touch через `hit-width`, `prefers-reduced-motion` | обычная адаптивная вёрстка, брейкпоинты 767/922/1200 |

## Orbit (@zumer/orbit): структура и пример

```html
<link rel="stylesheet" href="https://unpkg.com/@zumer/orbit/dist/orbit.min.css">
<script defer src="https://unpkg.com/@zumer/orbit/dist/orbit.min.js"></script>
<div class="gauge bigbang">
  <div class="gravity-spot">
    <div class="orbit-10" style="--o-size-ratio: 2">
      <o-progress value="72" shape="rounded" role="progressbar"
                  aria-valuenow="72" aria-valuemin="0" aria-valuemax="100"></o-progress>
    </div>
  </div>
</div>
```

- `.bigbang` — бокс системы (единственное место, где задаётся размер); `.gravity-spot` — центр масс, `--o-force`; `orbit-1…orbit-12` — 12 дорожек, `orbit-0` — центр.
- Теги: `<o-arc>` (`value, max, shape, interactive, hit-width, start, text-anchor, flip, fit-range, range`), `<o-progress>` (`value, max, shape, interactive, hit-width, variant`).
- Рантайм: `Orbit.ready()`, `Orbit.refresh(target)`, `Orbit.resize(target)`, событие `o-rendered`; обновления батчатся в animation frame; SSR-безопасен; поддержан shadow DOM.
- Типы: `import type {} from '@zumer/orbit/react'`; манифест `@zumer/orbit/custom-elements.json`; VS Code: `"html.customData": ["./node_modules/@zumer/orbit/dist/vscode.html-custom-data.json"]`.
- Отладка: `dev-orbit` показывает, где стоят кольца и что перекрывается; тема `theme-cyan`; обе и дефолтная тема имеют нулевую специфичность.
- Требования браузера: CSS `sin()`, `cos()`, container query units, `@property`, а для CSS-фолбэка без JS ещё `:has()` и `:nth-child(… of …)`. MDN: `sin()` и `:has()` — Baseline widely available, `@property` — Baseline 2024. `<o-arc>` и `<o-progress>` всегда требуют рантайма.

## OrbitCSS (orbitcss): структура и пример

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/orbitcss/css/orbit.min.css">
<div class="grid">
  <div class="column is-half">
    <div class="card">
      <div class="card__header">Заголовок</div>
      <div class="card__content">Содержимое</div>
      <div class="card__footer"><button class="button is-primary">Действие</button></div>
    </div>
  </div>
</div>
```

- Именование: блок + элемент через `__` (`.card__header`), состояния и модификаторы `is-*` / `has-*` (`is-primary`, `is-outline`, `is-active`, `has-error`, `is-mobile-responsive`).
- Сетка: 12 колонок (`$max-cols`), размеры долями (`is-half`, `is-one-third`, `is-full`, пятые доли), смещения `is-offset{экран}-{размер}`; брейкпоинты 767/768, 922, 1200 px.
- Sass-переменные (примеры): `$card-radius` (0 по умолчанию), `$card-shadow`, `$card-header-background`, `$button-radius`, `$button-padding`, `$button-hover-*`, `$max-cols`, `$col-padding`, `$grid-sizes`.
- Сборка: `sass --style expanded orbit.scss css/orbit.css` → autoprefixer → cleancss.
- Типов TypeScript, React-типов и VS Code custom data нет; `main` пакета — `orbit.scss`.

## Ограничения для мобильной разработки

1. **Orbit (@zumer) — браузерная библиотека**: custom elements + JS-рантайм + современный CSS. В WebView работает при актуальном движке; нативный React Native (без DOM) и нативный Flutter её использовать не могут — только через WebView. Официальных утверждений нет, это вывод (**UNVERIFIED**).
2. **Orbit (@zumer) на тач-устройствах**: дуги по умолчанию декоративны — нужны `interactive` и `hit-width`; глубина отключается при `prefers-reduced-motion`; `.bigbang` прямо в `<body>` ограничен высотой вьюпорта.
3. **OrbitCSS** — обычный CSS без JS: работает в любом WebView и в каркасах с Web-слоем; для React Native тоже нужен WebView. Проект **архивирован** (2023), релиз 2021: новые браузерные исправления не выходят.
4. Ни один из проектов не является заменой другого: Orbit — про кольцевые датчики и меню, OrbitCSS — про обычную адаптивную сетку.

## Статусы проверки

| Статус | Что так помечено |
|---|---|
| VERIFIED | версии, даты релизов, лицензии, звёзды и архивность репозиториев (npm, jsDelivr, GitHub API); CDN и команды установки (README/package.json); HTML-структура, классы, теги и атрибуты (README + Custom Elements Manifest); Sass-переменные и сборка (SCSS-файлы); Baseline для `sin()`, `:has()`, `@property` (MDN) |
| UNVERIFIED | точные минимальные версии браузеров для container query units и `:nth-child(… of …)`; работа в WebView/React Native/Flutter (вывод); поддержка браузеров у OrbitCSS; полнота списка тем и детали `dev-orbit` |
| CONFLICT | адрес доков: в задании `zumerlab.com/orbit-docs` (заглушка), в README — `zumerlab.com/orbit/`; принят второй |

## Открытые вопросы

1. Точные минимальные версии браузеров для Orbit (container query units, `:nth-child(… of …)`).
2. Эмпирическая проверка Orbit в iOS WKWebView и Android WebView.
3. Полный список тем Orbit (файл `_themes.scss` содержит больше, чем `theme-cyan`?).
4. Что именно визуализирует `dev-orbit`.
5. Официальная поддержка браузеров у OrbitCSS и судьба проекта (архив с 2023).

## Чек-лист готовности к будущим задачам (Definition of Ready)

- [x] Версии и CDN-ссылки зафиксированы и проверены (npm/jsDelivr data API).
- [x] Структура HTML и ключевые классы задокументированы с примерами для обоих проектов.
- [x] Ограничения мобильных браузеров и WebView описаны; спорные места помечены UNVERIFIED.
- [x] Все источники перечислены со статусами (см. JSON).
- [x] Открытые вопросы перечислены.
- [ ] Проверка Orbit в реальном WKWebView/Android WebView (нужен доступ к устройству или эмулятору).
- [ ] Уточнение минимальных версий браузеров по container queries и `:nth-child(… of …)`.
