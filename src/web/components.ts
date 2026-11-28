/** Хелперы компонентов дизайн-системы: Light DOM, теги ui-*, без вычислений модели. */
export const esc = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

export type BadgeTone = "red" | "amber" | "green" | "blue" | "gray";

export interface PanelInput {
  readonly title: string;
  readonly subtitle?: string;
  readonly actions?: string;
  readonly body: string;
}

/** Панель/карточка: единый контракт заголовка и тела. */
export const renderPanel = (input: PanelInput): string =>
  "<ui-panel class=\"panel\">" +
  '<div class="panel-head"><div><h2 class="panel-title">' + esc(input.title) +
  (input.subtitle ? '</h2><p class="panel-sub">' + esc(input.subtitle) + "</p>" : "</h2>") + "</div>" +
  (input.actions ? '<div class="panel-actions">' + input.actions + "</div>" : "") +
  "</div>" +
  '<div class="panel-body">' + input.body + "</div></ui-panel>";

export interface KpiDeltaView {
  readonly text: string;
  readonly tone: "good" | "bad" | "neutral";
  readonly title: string;
}

/** KPI-карточка по разметке overview.html: подпись, иконка, значение, пояснение и динамика. */
export const renderKpi = (
  label: string,
  value: string,
  foot = "",
  icon = "",
  key = "",
  delta?: KpiDeltaView,
  /** Контекстный переход: подпись становится ссылкой на отфильтрованный реестр (UX-3.2.3.1). */
  href?: string,
): string =>
  "<ui-kpi class=\"kpi\"" + (key === "" ? "" : ' data-kpi="' + key + '"') +
  '><div class="kpi-top"><span class="kpi-label">' +
  (href === undefined ? esc(label) : '<a class="panel-link" data-kpi-link="' + esc(key) + '" href="' + esc(href) + '">' + esc(label) + "</a>") +
  "</span>" + icon + "</div>" +
  '<div class="kpi-value">' + esc(value) + "</div>" +
  (delta === undefined
    ? ""
    : '<div class="kpi-delta kpi-delta-' + delta.tone + '" data-kpi-delta title="' + esc(delta.title) + '">' +
      esc(delta.text) + "</div>") +
  (foot ? '<div class="kpi-note">' + esc(foot) + "</div>" : "") + "</ui-kpi>";

/** Статус-бейдж: цвет всегда продублирован текстом. */
export const renderBadge = (text: string, tone: BadgeTone = "gray"): string =>
  '<ui-badge class="badge ' + tone + '">' + esc(text) + "</ui-badge>";

/** Бейдж SLA. */
export const renderSlaBadge = (text: string, tone: BadgeTone = "gray"): string =>
  '<ui-sla class="sla ' + tone + '">' + esc(text) + "</ui-sla>";

/** Пустой результат. */
export const renderEmptyState = (text: string, extra = "", glyph = ""): string =>
  '<div class="empty-state" data-empty-state' + extra + ">" +
  (glyph === "" ? "" : '<span class="empty-glyph" aria-hidden="true">' + glyph + "</span>") +
  '<span class="empty-text">' + esc(text) + "</span></div>";

/** Напоминание, что экран только для чтения. */
export const renderReadOnlyNotice = (text = "Только чтение: действия недоступны"): string =>
  '<p class="read-only-notice" data-read-only>' + esc(text) + "</p>";

/** Пометка демонстрационных данных. */
export const renderDemoNotice = (text = "Демо-данные модели процессов"): string =>
  '<span class="demo-notice" data-demo-notice>' + esc(text) + "</span>";

/** Единый бейдж приоритета: экраны не собирают его вручную (этап 1 плана). */
export const renderPriorityBadge = (text: string, tone: BadgeTone = "gray"): string => renderBadge(text, tone);

/** Чип активного фильтра: одна разметка для всех экранов. */
export const renderActiveFilterChip = (input: { readonly label: string; readonly text: string; readonly key: string }): string =>
  '<span class="incident-chip" data-chip="' + input.key + '">' + esc(input.label) + ": " + esc(input.text) +
  '<button type="button" data-filter-clear="' + input.key + '" aria-label="Снять фильтр: ' + esc(input.label) +
  " — " + esc(input.text) + '">×</button></span>';

/** Заголовок раздела: единый уровень h2 и подпись для всех экранов. */
export const renderSectionHeader = (title: string, subtitle = ""): string =>
  '<div class="section-header"><h2 class="section-title">' + esc(title) + "</h2>" +
  (subtitle === "" ? "" : '<p class="section-subtitle muted">' + esc(subtitle) + "</p>") +
  "</div>";

/** Синонимы по плану этапа 1: одно имя на смысл. */
export const statusBadge = renderSlaBadge;
export const emptyState = renderEmptyState;
export const actionCard = renderPanel;

/** Пустое состояние с жирным заголовком и пояснением: части экранируются по отдельности. */
export const renderEmptyStateRich = (input: {
  readonly title: string;
  readonly note?: string;
  readonly glyph?: string;
  /** Готовая SVG-иллюстрация (C2); приоритетнее текстового глифа. */
  readonly art?: string;
  readonly extra?: string;
}): string =>
  '<div class="empty-state" data-empty-state' + (input.extra ?? "") + ">" +
  (input.art ?? (input.glyph === undefined ? "" : '<span class="empty-glyph" aria-hidden="true">' + input.glyph + "</span>")) +
  '<span class="empty-text"><b>' + esc(input.title) + "</b>" +
  (input.note === undefined || input.note === "" ? "" : " " + esc(input.note)) + "</span></div>";
