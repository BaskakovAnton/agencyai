/** Хелперы компонентов дизайн-системы: Light DOM, теги ui-*, без вычислений модели. */
const esc = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

export type BadgeTone = "red" | "amber" | "green" | "blue" | "gray";

export interface PanelInput {
  readonly title: string;
  readonly subtitle?: string;
  readonly actions?: string;
  readonly body: string;
  readonly tag?: "panel" | "kpi";
}

/** Панель/карточка: единый контракт заголовка и тела. */
export const renderPanel = (input: PanelInput): string =>
  "<ui-panel class=\"panel\">" +
  '<div class="panel-head"><div><h2 class="panel-title">' + esc(input.title) +
  (input.subtitle ? '</h2><p class="panel-sub">' + esc(input.subtitle) + "</p>" : "</h2>") + "</div>" +
  (input.actions ? '<div class="panel-actions">' + input.actions + "</div>" : "") +
  "</div>" +
  '<div class="panel-body">' + input.body + "</div></ui-panel>";

/** KPI-карточка. */
export const renderKpi = (label: string, value: string, foot = ""): string =>
  '<ui-kpi class="kpi"><span class="kpi-top">' + esc(label) + '</span><b class="kpi-value">' + esc(value) +
  "</b>" + (foot ? '<span class="kpi-foot">' + esc(foot) + "</span>" : "") + "</ui-kpi>";

/** Статус-бейдж: цвет всегда продублирован текстом. */
export const renderBadge = (text: string, tone: BadgeTone = "gray"): string =>
  '<ui-badge class="badge ' + tone + '">' + esc(text) + "</ui-badge>";

/** Бейдж SLA. */
export const renderSlaBadge = (text: string, tone: "green" | "amber" | "red" | "gray" = "gray"): string =>
  '<ui-sla class="sla ' + tone + '">' + esc(text) + "</ui-sla>";

/** Пустой результат. */
export const renderEmptyState = (text: string): string =>
  '<div class="empty-state" data-empty-state>' + esc(text) + "</div>";

/** Напоминание, что экран только для чтения. */
export const renderReadOnlyNotice = (text = "Только чтение: действия недоступны"): string =>
  '<p class="read-only-notice" data-read-only>' + esc(text) + "</p>";

/** Пометка демонстрационных данных. */
export const renderDemoNotice = (text = "Демо-данные модели процессов"): string =>
  '<span class="demo-notice" data-demo-notice>' + esc(text) + "</span>";
