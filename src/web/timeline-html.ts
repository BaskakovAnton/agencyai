import type { GitModel } from "../core/gitgraph.ts";
import type { GanttModel } from "../core/gantt.ts";
import { SLA_LEGEND_TITLES, SLA_PHASES } from "../core/sla-at.ts";
import { pluralize } from "../core/text.ts";
import { formatDay } from "../core/timeline.ts";
import { HERO_INCIDENT_ID } from "../data/hero.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import { renderPanel } from "./components.ts";
import { renderGanttGrid } from "./gantt-grid.ts";
import { renderEventList } from "./timeline-events.ts";
import { renderGitSvg } from "./git-svg.ts";
import { hrefChat, hrefIncidents, hrefTimeline, type ViewMode } from "./router.ts";
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
  /** Плотность отображения графа и Ганта. */
  readonly density?: "normal" | "compact";
  /** Мобильный: показывать графический режим вместо списка событий. */
  readonly graphMode?: boolean;
}

/** На мобильном граф рисуется с шагом ≥ 44 px, чтобы зона попадания коммита не перекрывала соседей. */
const gitOptions = (): { columnWidth: number; rowHeight: number; slotStep: number; hitSize: number } | Record<string, never> =>
  typeof window !== "undefined" && window.innerWidth < 768
    ? { columnWidth: 56, rowHeight: 56, slotStep: 44, hitSize: 44 }
    : {};

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
  return (
    '<div class="chips" data-chips role="group" tabindex="0" aria-label="Заявки на дату: прокручивается по горизонтали">' +
    chips +
    "</div>"
  );
};

/** Только картинка (граф или Гант) — её перерисовывают при движении ползунка. */
/** Только картинка (граф или Гант) — её перерисовывают при движении ползунка.
 *  Тултип живёт в body (position: fixed): внутри прокручиваемой области он менял бы раскладку. */
export const renderCanvas = (input: TimelinePageInput): string =>
  '<div class="graph-wrap"><div class="canvas graph-canvas" data-canvas tabindex="0" role="region" aria-label="' +
  (input.view === "gantt" ? "Диаграмма Ганта: заявки по дням" : "Git-граф заявок: узлы по колонкам, дни по строкам") +
  '">' +
  (input.view === "gantt" ? renderGanttGrid(input.gantt, input.filter) : renderGitSvg(input.git, input.filter, gitOptions())) +
  "</div></div>";

export const renderBody = (input: TimelinePageInput): string =>
  renderCanvas(input) + renderEventList(input) +
  '<div class="node-card-slot" data-node-card-slot>' + (input.card ?? "") + "</div>" +
  input.chat;

/** Кнопки вида и сброса фильтра: их перерисовывают, когда фильтр меняется. */
export const renderControls = (input: TimelinePageInput): string =>
  '<div class="timeline-controls" data-controls>' +
  '<span class="timeline-date">◷ ' + formatDay(input.day) + "</span>" +
  '<span class="hint">Срез времени:</span>' +
  '<div class="segmented view-switch" data-view-switch role="group" aria-label="Вид">' +
  '<button data-view="git"' + (input.view === "git" ? ' class="on"' : "") + ' aria-pressed="' + String(input.view === "git") + '">Git-граф</button>' +
  '<button data-view="gantt"' + (input.view === "gantt" ? ' class="on"' : "") + ' aria-pressed="' + String(input.view === "gantt") + '">Диаграмма Ганта</button>' +
  "</div>" +
  '<div class="segmented" data-density-switch role="group" aria-label="Плотность">' +
  '<button data-density="normal"' + (input.density !== "compact" ? ' class="on"' : "") + ">Обычная</button>" +
  '<button data-density="compact"' + (input.density === "compact" ? ' class="on"' : "") + ">Компактная</button>" +
  "</div>" +
  '<button data-action="clear"' + (input.filter === "" ? " disabled" : "") + ">Показать все заявки</button>" +
  '<button class="graph-toggle" data-graph-toggle aria-pressed="' + String(input.graphMode === true) + '">Граф' +
  (input.graphMode === true ? " скрыть" : " показать") + "</button>" +
  "</div>";

/** Подсказка про горизонтальную прокрутку и клавиатуру. */
export const renderScrollHint = (): string =>
  '<p class="scroll-hint" data-scroll-hint>Граф шире экрана — прокручивайте по горизонтали. Канвас доступен с клавиатуры: Tab и стрелки.</p>';

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
    '<div class="ruler-scroll"><div class="ruler-track">' +
    '<div class="ruler-days">' + ticks + "</div>" +
    '<div class="ruler-hours">' + hours + "</div>" +
    '<div class="ruler-marker" data-ruler-marker style="left:' + share + '%"></div>' +
    "</div></div>" +
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
  return '<div class="legends graph-legend" data-legends>' + sla + graph + "</div>";
};

/** Панели-справка под графом: как читать граф и связанные представления. */
export const renderTimelineHelp = (input: TimelinePageInput): string =>
  '<div class="two-col section-gap">' +
  renderPanel({
    title: input.view === "gantt" ? "Принцип визуального отображения SLA" : "Как читать граф",
    body:
      input.view === "gantt"
        ? '<p class="muted">Полоса — время заявки на узле: цвет роли показывает исполнителя, рамка — фазу SLA (в срок, пауза, просрочка). ' +
          "Диаграмма прокручивается по горизонтали, строки доступны с клавиатуры.</p>"
        : '<p class="muted">Колонки — узлы процесса, строки — дни, точки — события заявок. Цвет точки показывает фазу SLA, ' +
          "но не заменяет текстовую подпись. Граф прокручивается по горизонтали и доступен с клавиатуры.</p>",
  }) +
  renderPanel({
    title: "Связанные виды",
    body:
      '<div class="stack">' +
      '<a class="button" href="' + hrefTimeline(input.day, "gantt") + '">Диаграмма Ганта →</a>' +
      '<a class="button" href="' + hrefChat(HERO_INCIDENT_ID, input.day) + '">Переписка ' + HERO_INCIDENT_ID + " →</a>" +
      '<a class="button" href="' + hrefIncidents(input.day) + '">Все обращения →</a></div>',
  }) +
  "</div>";

export const renderTimelinePage = (input: TimelinePageInput): string =>
  renderTimelineHeader(input) + renderTimeRuler(input) + renderLegends(input) + renderScrollHint() +
  renderBody(input) + renderTimelineFooter() + renderTimelineHelp(input);

export const tooltipText = (commit: { incidentId: string; nodeId: string; title?: string; day: string; role: string; text: string }, nodeTitle: string): string =>
  commit.incidentId + " · " + commit.nodeId + " " + escapeHtml(nodeTitle) + " · " + formatDay(commit.day) + " · " + commit.role + ": " + commit.text;
