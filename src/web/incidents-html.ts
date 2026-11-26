import { PRIORITY_TITLES } from "../data/roles.ts";
import { SLA_LEGEND_TITLES, SLA_PHASES } from "../core/sla-at.ts";
import { formatDay, formatStamp } from "../core/timeline.ts";
import { esc, renderBadge, renderEmptyState, renderPanel, renderSlaBadge } from "./components.ts";
import { historicalIndicator } from "./historical.ts";
import { hrefIncident } from "./router.ts";
import type { IncidentFilters, IncidentRow, IncidentSort } from "./incidents.ts";
import { PHASE_TONES, PRIORITY_TONES } from "./overview.ts";
import { filterChips, renderFilterChips } from "./incidents-chips.ts";

export interface IncidentsInput {
  readonly rows: readonly IncidentRow[];
  readonly days: readonly string[];
  readonly day: string;
  readonly filters: IncidentFilters;
  readonly nodes?: readonly { readonly id: string; readonly title: string }[];
  /** Подразделения из справочника: селект формируется из модели, а не из разметки. */
  readonly departments?: readonly { readonly id: string; readonly name: string }[];
  /** Исторический срез: показывается единый индикатор. */
  readonly historical?: boolean;
}

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

const select = (name: string, label: string, options: readonly (readonly [string, string])[], value: string): string =>
  '<label class="hint">' + label + ' <select data-' + name + ' aria-label="Фильтр: ' + label + '">' +
  options.map(([id, title]) => '<option value="' + id + '"' + (id === value ? " selected" : "") + ">" + title + "</option>").join("") +
  "</select></label>";

const entries = (record: Readonly<Record<string, string>>): readonly (readonly [string, string])[] =>
  Object.entries(record).map(([id, title]) => [id, title] as const);

const stageTitle = (row: IncidentRow): string => (row.nodeTitle === "" ? row.nodeId : row.nodeId + " " + row.nodeTitle);

/** Ответственное подразделение обращения (UX-4); «Нет данных», если модель не подключена. */
const assignee = (row: IncidentRow): string =>
  row.departmentName === ""
    ? '<span class="muted">Нет данных</span>'
    : '<div class="assignee"><span class="mini-avatar" aria-hidden="true">' + esc(row.departmentName.slice(0, 2)) +
      '</span><span class="assignee-name">' + esc(row.departmentName) + "</span></div>";

/** Тело таблицы реестра: одна строка — одна заявка. */
export const renderIncidentsBody = (rows: readonly IncidentRow[], filters: IncidentFilters, day: string): string => {
  const head =
    '<tr><th scope="col">Номер / обращение</th><th scope="col">Приоритет</th><th scope="col">Текущий этап</th>' +
    '<th scope="col">Подразделение</th><th scope="col">Срок SLA</th><th scope="col">Изменено</th><th scope="col">Карточка</th></tr>';
  const body =
    rows.length === 0
      ? '<tr><td colspan="7">' + renderEmptyState("Ничего не найдено — измените фильтры или сбросьте их.") + "</td></tr>"
      : rows
          .map(
            (row) =>
              '<tr class="click-row" data-incident-row="' + row.id + '">' +
              '<td><div class="case-id">' + row.id + '</div><div class="case-title">' + row.title +
              (row.situation === "" ? "" : '</div><div class="case-sub">' + row.situation) + "</div></td>" +
              "<td>" + renderBadge(PRIORITY_TITLES[row.priority], PRIORITY_TONES[row.priority]) + "</td>" +
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

const departmentTitle = (input: IncidentsInput, departmentId: string): string =>
  input.departments?.find((item) => item.id === departmentId)?.name ?? departmentId;

/** Живая область реестра: па��ель активных фильтров и тело таблицы. */
export const renderIncidentsLive = (input: IncidentsInput): string =>
  '<div data-incidents-live>' +
  renderFilterChips(filterChips(input.filters, input.day, input.days, (id) => departmentTitle(input, id))) +
  renderIncidentsBody(input.rows, input.filters, input.day) +
  "</div>";

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
    select("filter-view", "Представление", VIEW_OPTIONS, input.filters.view) +
    select(
      "filter-department",
      "Подразделение",
      [["", "все подразделения"], ...(input.departments ?? []).map((item) => [item.id, item.name] as const), ["none", "без ответственного"]] as const,
      input.filters.department,
    ) +
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
  (input.historical === true ? historicalIndicator(input.day, input.days) : "") +
  renderPanel({
    title: "Все обращения",
    subtitle: "Демонстрационный реестр: " + input.rows.length + " записей в срезе",
    actions: '<span class="count">' + input.rows.length + "</span>",
    body: renderIncidentsLive(input),
  }) +
  '<div class="two-col section-gap">' +
  helpPanel("Порядок работы со списком", "Принципы реализации", guidance) +
  slaLegend() +
  "</div></section>";