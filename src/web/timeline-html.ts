import type { GitModel } from "../core/gitgraph.ts";
import type { GanttModel } from "../core/gantt.ts";
import { SLA_LEGEND_TITLES, SLA_PHASES } from "../core/sla-at.ts";
import { pluralize } from "../core/text.ts";
import { formatDay } from "../core/timeline.ts";
import { renderGanttGrid } from "./gantt-grid.ts";
import { renderGitSvg } from "./git-svg.ts";
import type { ViewMode } from "./router.ts";
import { FORK_MARK, MERGE_MARK, SLA_COLORS } from "./theme.ts";

export interface TimelinePageInput {
  readonly day: string;
  readonly days: readonly string[];
  readonly dayIndex: number;
  readonly view: ViewMode;
  readonly filter: string;
  readonly git: GitModel;
  readonly gantt: GanttModel;
  /** Готовая разметка компактного чата рядом с графом (на широком экране). */
  readonly chat: string;
  /** Карточка выбранного узла (появляется по клику на коммит). */
  readonly card?: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

export const visibleIds = (input: TimelinePageInput): readonly string[] =>
  input.view === "gantt" ? input.gantt.rows.map((row) => row.incidentId) : input.git.incidents;

export const renderStats = (input: TimelinePageInput): string => {
  const total = visibleIds(input).length;
  return (
    '<div class="stats" data-stats>' + formatDay(input.day) + " · заявок на дату: " + total + " (" +
    pluralize(total, "заявка", "заявки", "заявок") + ") · узлов " + input.git.columns.length + "</div>"
  );
};

export const renderChips = (input: TimelinePageInput): string => {
  const ids = visibleIds(input);
  const chips = ids
    .map(
      (id) =>
        '<button class="chip' + (input.filter === id ? " on" : "") + '" data-incident-filter="' + id + '">' + id + "</button>",
    )
    .join("");
  return '<div class="chips" data-chips>' + chips + "</div>";
};

/** Только картинка (граф или Гант) — её перерисовывают при движении ползунка. */
/** Только картинка (граф или Гант) — её перерисовывают при движении ползунка.
 *  Тултип живёт в body (position: fixed): внутри прокручиваемой области он менял бы раскладку. */
export const renderCanvas = (input: TimelinePageInput): string =>
  '<div class="canvas" data-canvas tabindex="0" role="region" aria-label="' +
  (input.view === "gantt" ? "Диаграмма Ганта: заявки по дням" : "Git-граф заявок: узлы по колонкам, дни по строкам") +
  '">' +
  (input.view === "gantt" ? renderGanttGrid(input.gantt, input.filter) : renderGitSvg(input.git, input.filter)) +
  "</div>";

export const renderBody = (input: TimelinePageInput): string =>
  renderCanvas(input) +
  '<div class="node-card-slot" data-node-card-slot>' + (input.card ?? "") + "</div>" +
  input.chat;

/** Кнопки вида и сброса фильтра: их перерисовывают, когда фильтр меняется. */
export const renderControls = (input: TimelinePageInput): string =>
  '<div class="controls" data-controls>' +
  '<button data-view="git"' + (input.view === "git" ? ' class="on"' : "") + ">Git-граф</button>" +
  '<button data-view="gantt"' + (input.view === "gantt" ? ' class="on"' : "") + ">Диаграмма Ганта</button>" +
  (input.filter === "" ? "" : '<button data-action="clear">Показать все заявки</button>') +
  "</div>";

/** Шапка, ползунок времени и переключатель вида — всё, кроме самой картинки. */
export const renderTimelineHeader = (input: TimelinePageInput): string =>
  [
    '<header class="top">',
    renderStats(input),
    renderControls(input),
    "</header>",
    '<div class="timebar">',
    '<label class="hint" for="slider">Перемотка времени</label>',
    '<input id="slider" data-slider type="range" min="0" max="' + Math.max(input.days.length - 1, 0) +
      '" value="' + Math.max(input.dayIndex, 0) + '" aria-valuetext="' + formatDay(input.day) + '">',
    '<b data-day-label>' + formatDay(input.day) + "</b>",
    '<button class="chip" data-action="jump" data-day="2026-01-02">Сценарий: 2 января</button>',
    "</div>",
    renderChips(input),
  ].join("");

export const renderTimelineFooter = (): string =>
  '<footer class="foot">Клик или Enter по точке графа открывают карточку узла; из неё — чат заявки на эту дату. ' +
  "Точки — события процесса, линии — путь заявки, колонки — узлы U1…U30.</footer>";

/** Горизонтальная шкала времени: тики по суткам и часы выбранного дня. */
export const renderTimeRuler = (input: TimelinePageInput): string => {
  const ticks = input.days
    .map(
      (day, index) =>
        '<button class="ruler-day' + (day === input.day ? " on" : "") + '" data-ruler-day="' + day +
        '" data-ruler-index="' + index + '" title="' + formatDay(day) + '" aria-label="' + day.slice(8) + " · " + formatDay(day) + '"' +
        (day === input.day ? ' aria-current="date"' : "") + ">" + day.slice(8) + "</button>",
    )
    .join("");
  const hours = Array.from({ length: 24 }, (_, hour) =>
    '<span class="ruler-hour" data-ruler-hour="' + hour + '" title="' + String(hour).padStart(2, "0") + ':00"></span>',
  ).join("");
  const share = input.days.length > 1 ? Math.round((Math.max(input.dayIndex, 0) / (input.days.length - 1)) * 100) : 0;
  return (
    '<div class="ruler" data-ruler>' +
    '<div class="ruler-head"><span class="hint">Шкала времени: сутки и часы выбранного дня</span>' +
    '<b data-ruler-label>' + formatDay(input.day) + "</b></div>" +
    '<div class="ruler-days">' + ticks + "</div>" +
    '<div class="ruler-hours">' + hours + "</div>" +
    '<div class="ruler-marker" data-ruler-marker style="left:' + share + '%"></div>' +
    "</div>"
  );
};

/** Легенды: что означают цвета SLA и значки развилок и слияний. */
export const renderLegends = (input: TimelinePageInput): string => {
  const sla = SLA_PHASES.map(
    (phase) =>
      '<span class="legend-item" data-legend-sla="' + phase + '"><i style="background:' + SLA_COLORS[phase] + '"></i>' +
      SLA_LEGEND_TITLES[phase] + "</span>",
  ).join("");
  const graph =
    '<span class="legend-item" data-legend-graph="fork">' + FORK_MARK + " развилка</span>" +
    '<span class="legend-item" data-legend-graph="merge">' + MERGE_MARK + " слияние</span>" +
    '<span class="legend-item" data-legend-graph="counts">коммитов ' + input.git.commits.length +
    " · заявок " + input.git.incidents.length + " · узлов " + input.git.columns.length + "</span>";
  return '<div class="legends" data-legends>' + sla + graph + "</div>";
};

export const renderTimelinePage = (input: TimelinePageInput): string =>
  renderTimelineHeader(input) + renderTimeRuler(input) + renderLegends(input) + renderBody(input) + renderTimelineFooter();

export const tooltipText = (commit: { incidentId: string; nodeId: string; title?: string; day: string; role: string; text: string }, nodeTitle: string): string =>
  commit.incidentId + " · " + commit.nodeId + " " + escapeHtml(nodeTitle) + " · " + formatDay(commit.day) + " · " + commit.role + ": " + commit.text;
