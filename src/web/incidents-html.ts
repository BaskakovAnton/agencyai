import { PRIORITY_TITLES } from "../data/roles.ts";
import { SLA_LEGEND_TITLES, SLA_PHASES } from "../core/sla-at.ts";
import { formatDay, formatStamp } from "../core/timeline.ts";
import { renderBadge, renderEmptyState, renderPanel, renderSlaBadge } from "./components.ts";
import { hrefIncident } from "./router.ts";
import type { IncidentFilters, IncidentRow, IncidentSort } from "./incidents.ts";
import { PHASE_TONES, type Tone } from "./overview.ts";

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

const select = (name: string, label: string, options: readonly (readonly [string, string])[], value: string): string =>
  '<label class="hint">' + label + ' <select data-' + name + ' aria-label="Фильтр: ' + label + '">' +
  options.map(([id, title]) => '<option value="' + id + '"' + (id === value ? " selected" : "") + ">" + title + "</option>").join("") +
  "</select></label>";

const entries = (record: Readonly<Record<string, string>>): readonly (readonly [string, string])[] =>
  Object.entries(record).map(([id, title]) => [id, title] as const);

const PRIORITY_TONES: Readonly<Record<string, Tone>> = { urgent: "red", normal: "amber", routine: "gray", none: "gray" };

const stageTitle = (row: IncidentRow): string => (row.nodeTitle === "" ? row.nodeId : row.nodeId + " " + row.nodeTitle);

const assignee = (row: IncidentRow): string =>
  row.roleTitle === ""
    ? '<span class="muted">Нет данных</span>'
    : '<div class="assignee"><span class="mini-avatar" aria-hidden="true">' + row.roleTitle.slice(0, 2) +
      '</span><span class="assignee-name">' + row.roleTitle + "</span></div>";

/** Тело таблицы реестра: одна строка — одна заявка. */
export const renderIncidentsBody = (rows: readonly IncidentRow[], filters: IncidentFilters, day: string): string => {
  const head =
    '<tr><th scope="col">Номер / обращение</th><th scope="col">Приоритет</th><th scope="col">Текущий этап</th>' +
    '<th scope="col">Роль узла</th><th scope="col">Срок SLA</th><th scope="col">Изменено</th><th scope="col">Карточка</th></tr>';
  const body =
    rows.length === 0
      ? '<tr><td colspan="7">' + renderEmptyState("Ничего не найдено — измените фильтры или сбросьте их.") + "</td></tr>"
      : rows
          .map(
            (row) =>
              '<tr class="click-row" data-incident-row="' + row.id + '">' +
              '<td><div class="case-id">' + row.id + '</div><div class="case-title">' + row.title +
              (row.situation === "" ? "" : '</div><div class="case-sub">' + row.situation) + "</div></td>" +
              "<td>" + renderBadge(PRIORITY_TITLES[row.priority], PRIORITY_TONES[row.priority] ?? "gray") + "</td>" +
              "<td>" + stageTitle(row) + "</td>" +
              "<td>" + assignee(row) + "</td>" +
              "<td>" + renderSlaBadge(row.slaText, PHASE_TONES[row.phase]) + "</td>" +
              '<td class="muted">' + formatStamp(row.lastEvent) + "</td>" +
              '<td><a class="panel-link" href="' + hrefIncident(row.id, day) + '">→</a></td></tr>',
          )
          .join("");
  return (
    '<div class="table-wrap" data-incidents-body tabindex="0" role="region" aria-label="Таблица обращений: прокручивается по вертикали">' +
    '<table class="data-table" data-incidents-table><caption class="sr-only">Реестр обращений на ' + formatDay(day) + "</caption>" +
    "<thead>" + head + "</thead><tbody>" + body + "</tbody></table></div>"
  );
};

const toolbar = (input: IncidentsInput): string => {
  const nodes: readonly (readonly [string, string])[] = [
    ["", "все узлы"],
    ...(input.nodes ?? []).map((node) => [node.id, node.id + " " + node.title] as const),
  ];
  const priorities: readonly (readonly [string, string])[] = [["", "любой"], ...entries(PRIORITY_TITLES)];
  const slaOptions: readonly (readonly [string, string])[] = [["", "любой"], ...SLA_PHASES.map((phase) => [phase, SLA_LEGEND_TITLES[phase]] as const)];
  return (
    '<div class="toolbar" data-incidents-filters>' +
    '<input type="search" data-search aria-label="Поиск обращений" placeholder="Найти по номеру, тексту или адресу…" value="' +
    input.filters.q.replace(/"/g, "&quot;") + '">' +
    select("filter-priority", "Приоритет", priorities, input.filters.priority) +
    select("filter-sla", "SLA", slaOptions, input.filters.sla) +
    select("filter-node", "Узел", nodes, input.filters.node) +
    select("sort", "Сортировка", entries(SORT_TITLES), input.filters.sort) +
    '<label class="hint">Дата: <select data-day-select aria-label="Дата среза">' +
    input.days.map((value) => '<option value="' + value + '"' + (value === input.day ? " selected" : "") + ">" + formatDay(value) + "</option>").join("") +
    "</select></label>" +
    '<button data-reset>Сбросить</button><span class="grow"></span>' +
    '<span class="count" data-incidents-count>Найдено: ' + input.rows.length + "</span></div>"
  );
};

const guidance: readonly (readonly [string, string])[] = [
  ["⌕", "<b>Поиск</b> по номеру, названию, адресу и заявителю — только по полям модели."],
  ["⚑", "<b>Фильтры</b> не меняют данные: они ограничивают видимый список."],
  ["↕", "<b>Сортировка</b> по номеру, приоритету, дате события и срочности."],
];

const helpPanel = (title: string, subtitle: string, items: readonly (readonly [string, string])[]): string =>
  renderPanel({
    title,
    subtitle,
    body:
      '<div class="activity-list">' +
      items
        .map(
          ([icon, text]) =>
            '<ui-activity class="activity"><span class="activity-icon" aria-hidden="true">' + icon +
            '</span><div><div class="activity-text">' + text + "</div></div></ui-activity>",
        )
        .join("") +
      "</div>",
  });

const slaLegend = (): string =>
  renderPanel({
    title: "Статусы и SLA",
    subtitle: "Обозначения в реестре",
    body:
      '<div class="legend legend-single">' +
      ([
        ["red", "Просрочка", "Срок нарушен"],
        ["amber", "Риск", "Срок приближается"],
        ["green", "В срок", "Норматив не нарушен"],
        ["gray", "Нет SLA", "Неприменимо или данных нет"],
      ] as const)
        .map(([tone, title, note]) => '<div class="legend-item">' + renderBadge(title, tone) + "<span>" + note + "</span></div>")
        .join("") +
      "</div>",
  });

/** Экран «Обращения» по композиции incidents.html. */
export const renderIncidents = (input: IncidentsInput): string =>
  '<section class="incidents-screen" data-incidents>' + toolbar(input) +
  renderPanel({
    title: "Все обращения",
    subtitle: "Демонстрационный реестр: " + input.rows.length + " записей в срезе",
    actions: '<span class="count">' + input.rows.length + "</span>",
    body: renderIncidentsBody(input.rows, input.filters, input.day),
  }) +
  '<div class="two-col section-gap">' +
  helpPanel("Порядок работы со списком", "Принципы реализации", guidance) +
  slaLegend() +
  "</div></section>";
