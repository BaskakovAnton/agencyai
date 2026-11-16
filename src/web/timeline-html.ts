import type { GitModel } from "../core/gitgraph.ts";
import type { GanttModel } from "../core/gantt.ts";
import { pluralize } from "../core/text.ts";
import { formatDay } from "../core/timeline.ts";
import { renderGanttGrid } from "./gantt-grid.ts";
import { renderGitSvg } from "./git-svg.ts";
import type { ViewMode } from "./router.ts";

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
  '<div class="canvas" data-canvas>' +
  (input.view === "gantt" ? renderGanttGrid(input.gantt, input.filter) : renderGitSvg(input.git, input.filter)) +
  "</div>";

export const renderBody = (input: TimelinePageInput): string => renderCanvas(input) + input.chat;

/** Шапка, ползунок времени и переключатель вида — всё, кроме самой картинки. */
export const renderTimelineHeader = (input: TimelinePageInput): string =>
  [
    '<header class="top">',
    '<h1 class="brand">Хронология заявок · Git-граф</h1>',
    renderStats(input),
    '<div class="controls">',
    '<button data-view="git"' + (input.view === "git" ? ' class="on"' : "") + ">Git-граф</button>",
    '<button data-view="gantt"' + (input.view === "gantt" ? ' class="on"' : "") + ">Диаграмма Ганта</button>",
    input.filter === "" ? "" : '<button data-action="clear">Показать все заявки</button>',
    "</div>",
    "</header>",
    '<div class="timebar">',
    '<label class="hint" for="slider">Перемотка времени</label>',
    '<input id="slider" data-slider type="range" min="0" max="' + Math.max(input.days.length - 1, 0) +
      '" value="' + Math.max(input.dayIndex, 0) + '">',
    '<b data-day-label>' + formatDay(input.day) + "</b>",
    '<button class="chip" data-action="jump" data-day="2026-01-02">Сценарий: 2 января</button>',
    "</div>",
    renderChips(input),
  ].join("");

export const renderTimelineFooter = (): string =>
  '<footer class="foot">Клик по точке графа открывает мобильный чат этой заявки на выбранную дату. ' +
  "Точки — события процесса, линии — путь заявки, колонки — узлы U1…U30.</footer>";

export const renderTimelinePage = (input: TimelinePageInput): string =>
  renderTimelineHeader(input) + renderBody(input) + renderTimelineFooter();

export const tooltipText = (commit: { incidentId: string; nodeId: string; title?: string; day: string; role: string; text: string }, nodeTitle: string): string =>
  commit.incidentId + " · " + commit.nodeId + " " + escapeHtml(nodeTitle) + " · " + formatDay(commit.day) + " · " + commit.role + ": " + commit.text;
