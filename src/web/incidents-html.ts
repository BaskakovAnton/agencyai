import { PRIORITY_TITLES } from "../data/roles.ts";
import { formatDay, formatStamp } from "../core/timeline.ts";
import { esc, renderBadge, renderEmptyState, renderPanel, renderSlaBadge } from "./components.ts";
import { historicalIndicator } from "./historical.ts";
import { hrefIncident } from "./router.ts";
import type { IncidentFilters, IncidentRow } from "./incidents.ts";
import { PHASE_TONES, PRIORITY_TONES } from "./overview.ts";
import { filterChips, renderFilterChips } from "./incidents-chips.ts";
import { emptyStateFor, renderEmptyIncidents, type EmptyIncidentsState } from "./incidents-empty.ts";
import { renderAttributionNotice } from "./incidents-notice.ts";
import { renderToolbar } from "./incidents-toolbar.ts";

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

const stageTitle = (row: IncidentRow): string => (row.nodeTitle === "" ? row.nodeId : row.nodeId + " " + row.nodeTitle);

/** Ответственное подразделение обращения (UX-4); «Нет данных», если модель не подключена. */
const assignee = (row: IncidentRow): string => {
  const person = row.assigneeName === "" ? '<span class="muted">Без ответственного</span>' : esc(row.assigneeName);
  const department =
    row.departmentName === ""
      ? '<span class="muted">Нет данных</span>'
      : '<div class="assignee"><span class="mini-avatar" aria-hidden="true">' + esc(row.departmentName.slice(0, 2)) +
        '</span><span class="assignee-name">' + esc(row.departmentName) + "</span></div>";
  return department + '<div class="case-sub" data-assignee>' + person + "</div>";
};

/** Тело таблицы реестра: одна строка — одна заявка. */
export const renderIncidentsBody = (
  rows: readonly IncidentRow[],
  filters: IncidentFilters,
  day: string,
  /** Контекстное пустое состояние (UX-3.2.4): таблица сохраняется, объяснение — внутри неё. */
  empty?: EmptyIncidentsState | null,
): string => {
  const head =
    '<tr><th scope="col">Номер / обращение</th><th scope="col">Приоритет</th><th scope="col">Текущий этап</th>' +
    '<th scope="col">Подразделение</th><th scope="col">Срок SLA</th><th scope="col">Изменено</th><th scope="col">Карточка</th></tr>';
  const body =
    rows.length === 0
      ? '<tr><td colspan="7">' +
        (empty === undefined || empty === null
          ? renderEmptyState("Ничего не найдено — измените фильтры или сбросьте их.")
          : renderEmptyIncidents(empty)) +
        "</td></tr>"
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
export const renderIncidentsLive = (input: IncidentsInput): string => {
  const empty = emptyStateFor(input.filters, input.rows.length);
  return (
    '<div data-incidents-live>' +
    renderFilterChips(filterChips(input.filters, input.day, input.days, (id) => departmentTitle(input, id))) +
    renderAttributionNotice(input.historical === true, input.filters.department) +
    renderIncidentsBody(input.rows, input.filters, input.day, empty) +
    "</div>"
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
  '<section class="incidents-screen" data-incidents>' + renderToolbar(input) +
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