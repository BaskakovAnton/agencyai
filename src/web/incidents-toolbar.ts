import { PRIORITY_TITLES } from "../data/roles.ts";
import { SLA_LEGEND_TITLES, SLA_PHASES } from "../core/sla-at.ts";
import { formatDay } from "../core/timeline.ts";
import type { IncidentFilters, IncidentSort } from "./incidents.ts";

/** Представления реестра (UX-3.2.4, DEC-UX-324-02): один селект вместо «Подтверждение». */
const VIEW_OPTIONS: readonly (readonly [string, string])[] = [
  ["all", "все"],
  ["active", "активные"],
  ["attention", "требуют внимания"],
  ["overdue", "просроченные (активные)"],
  ["paused", "на паузе"],
  ["review", "ждут подтверждения"],
];

const SORT_TITLES: Readonly<Record<IncidentSort, string>> = {
  id: "по номеру",
  priority: "по приоритету",
  date: "по дате события",
  urgency: "по срочности",
};

const entries = (record: Readonly<Record<string, string>>): readonly (readonly [string, string])[] =>
  Object.entries(record).map(([id, title]) => [id, title] as const);

/** Селект с подписью: на мобильном текст скрыт, доступное имя остаётся в aria-label. */
const select = (name: string, label: string, options: readonly (readonly [string, string])[], value: string): string =>
  '<label class="hint"><span class="hint-label">' + label + '</span> <select data-' + name + ' aria-label="Фильтр: ' + label + '">' +
  options.map(([id, title]) => '<option value="' + id + '"' + (id === value ? " selected" : "") + ">" + title + "</option>").join("") +
  "</select></label>";

export interface ToolbarInput {
  readonly rows: readonly unknown[];
  readonly days: readonly string[];
  readonly day: string;
  readonly filters: IncidentFilters;
  readonly nodes?: readonly { readonly id: string; readonly title: string }[];
  readonly departments?: readonly { readonly id: string; readonly name: string }[];
}

/**
 * Панель фильтров реестра (UX-3.4, WP-1). На мобильном второстепенные контролы скрыты
 * за кнопкой «Параметры»; на широком экране видны сразу (display: contents).
 */
export const renderToolbar = (input: ToolbarInput): string => {
  const nodes = [
    ["", "все узлы"],
    ...(input.nodes ?? []).map((node) => [node.id, node.id + " " + node.title] as const),
  ] as readonly (readonly [string, string])[];
  const priorities = [["", "любой"], ...entries(PRIORITY_TITLES)] as readonly (readonly [string, string])[];
  const slaOptions = [
    ["", "любой"],
    ...SLA_PHASES.map((phase) => [phase, SLA_LEGEND_TITLES[phase]] as const),
  ] as readonly (readonly [string, string])[];
  const departments = [
    ["", "все подразделения"],
    ...(input.departments ?? []).map((item) => [item.id, item.name] as const),
    ["none", "без ответственного"],
  ] as readonly (readonly [string, string])[];
  return (
    '<div class="toolbar" data-incidents-filters>' +
    '<input type="search" data-search aria-label="Поиск обращений" placeholder="Найти по номеру, тексту или адресу…" value="' +
    input.filters.q.replace(/"/g, "&quot;") + '">' +
    select("filter-view", "Представление", VIEW_OPTIONS, input.filters.view) +
    '<label class="hint"><span class="hint-label">Дата</span> <select data-day-select aria-label="Дата среза">' +
    input.days.map((value) => '<option value="' + value + '"' + (value === input.day ? " selected" : "") + ">" + formatDay(value) + "</option>").join("") +
    "</select></label>" +
    '<button data-reset>Сбросить</button>' +
    '<div class="filters-more" data-filters-more data-open="false">' +
    '<button type="button" class="filters-toggle" data-filters-toggle aria-expanded="false" aria-controls="filters-more-body">Параметры</button>' +
    '<div class="filters-more-body" id="filters-more-body">' +
    select("filter-priority", "Приоритет", priorities, input.filters.priority) +
    select("filter-sla", "SLA", slaOptions, input.filters.sla) +
    select("filter-node", "Узел", nodes, input.filters.node) +
    select("sort", "Сортировка", entries(SORT_TITLES), input.filters.sort) +
    select("filter-department", "Подразделение", departments, input.filters.department) +
    "</div></div>" +
    '<span class="grow"></span><span class="count" data-incidents-count>Найдено: ' + input.rows.length + "</span></div>"
  );
};
