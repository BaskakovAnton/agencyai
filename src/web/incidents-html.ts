import { PRIORITY_TITLES } from "../data/roles.ts";
import { SLA_LEGEND_TITLES, SLA_PHASES } from "../core/sla-at.ts";
import { formatDay, formatStamp } from "../core/timeline.ts";
import { hrefIncident } from "./router.ts";
import type { IncidentFilters, IncidentRow, IncidentSort } from "./incidents.ts";

export interface IncidentsInput {
  readonly rows: readonly IncidentRow[];
  readonly days: readonly string[];
  readonly day: string;
  readonly filters: IncidentFilters;
  readonly nodes?: readonly { readonly id: string; readonly title: string }[];
}

const SORT_TITLES: Readonly<Record<IncidentSort, string>> = {
  id: "по номеру",
  priority: "по приоритету",
  date: "по дате события",
  urgency: "по срочности",
};

const entries = (record: Readonly<Record<string, string>>): readonly (readonly [string, string])[] =>
  Object.entries(record).map(([id, title]) => [id, title] as const);

const select = (name: string, label: string, options: readonly (readonly [string, string])[], value: string): string =>
  '<label class="hint">' + label + ' <select data-' + name + ">" +
  options.map(([id, title]) => '<option value="' + id + '"' + (id === value ? " selected" : "") + ">" + title + "</option>").join("") +
  "</select></label>";

const toolbar = (input: IncidentsInput): string => {
  const nodes: readonly (readonly [string, string])[] = [
    ["", "все узлы"],
    ...(input.nodes ?? []).map((node) => [node.id, node.id + " " + node.title] as const),
  ];
  const priorities: readonly (readonly [string, string])[] = [["", "любой"], ...entries(PRIORITY_TITLES)];
  const slaOptions: readonly (readonly [string, string])[] = [
    ["", "любой"],
    ...SLA_PHASES.map((phase) => [phase, SLA_LEGEND_TITLES[phase]] as const),
  ];
  return (
    '<div class="filters" data-incidents-filters>' +
    '<input type="search" data-search placeholder="Поиск: номер, название, адрес, заявитель" value="' +
    input.filters.q.replace(/"/g, "&quot;") + '">' +
    select("filter-priority", "Приоритет", priorities, input.filters.priority) +
    select("filter-sla", "SLA", slaOptions, input.filters.sla) +
    select("filter-node", "Узел", nodes, input.filters.node) +
    select("sort", "Сортировка", entries(SORT_TITLES), input.filters.sort) +
    '<label class="hint">Дата: <select data-day-select>' +
    input.days.map((value) => '<option value="' + value + '"' + (value === input.day ? " selected" : "") + ">" + formatDay(value) + "</option>").join("") +
    "</select></label>" +
    '<button data-reset>Сбросить</button>' +
    "</div>"
  );
};

export const renderIncidentsBody = (rows: readonly IncidentRow[], filters: IncidentFilters, day: string): string => {
  const head =
    "<tr><th>Номер</th><th>Название</th><th>Приоритет</th><th>Узел</th><th>SLA</th><th>Последнее событие</th></tr>";
  const body = rows
    .map(
      (row) =>
        '<tr data-incident-row="' + row.id + '"><td><a href="' + hrefIncident(row.id, day) + '">' + row.id + "</a></td>" +
        "<td>" + row.title + (row.situation === "" ? "" : ' <span class="hint">' + row.situation + "</span>") + "</td>" +
        '<td><span class="prio ' + row.priority + '">' + PRIORITY_TITLES[row.priority] + "</span></td>" +
        "<td>" + row.nodeId + " " + row.nodeTitle + "</td>" +
        '<td><span class="sla s-' + row.phase + '">' + SLA_LEGEND_TITLES[row.phase] + "</span>" +
        (row.dueDay === "" ? "" : ' <span class="hint">до ' + formatDay(row.dueDay) + "</span>") + "</td>" +
        '<td class="hint">' + formatStamp(row.lastEvent) + "</td></tr>",
    )
    .join("");
  const empty = '<tr><td colspan="6" class="hint">Ничего не найдено — измените фильтры или сбросьте их.</td></tr>';
  return (
    '<div class="table-wrap"><table class="incidents-table" data-incidents-table><thead>' + head + "</thead><tbody>" +
    (rows.length === 0 ? empty : body) + "</tbody></table></div>" +
    '<p class="hint" data-incidents-count>Найдено: ' + rows.length + (filters.q === "" ? "" : " · поиск: " + filters.q) + "</p>"
  );
};

/** Экран «Обращения»: панель фильтров и таблица, собранная из модели. */
export const renderIncidents = (input: IncidentsInput): string =>
  '<section class="incidents-screen" data-incidents>' + toolbar(input) +
  '<div data-incidents-body>' + renderIncidentsBody(input.rows, input.filters, input.day) + "</div></section>";
