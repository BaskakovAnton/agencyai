import type { DayEvent } from "../core/events.ts";
import type { GanttModel } from "../core/gantt.ts";
import { SLA_LEGEND_TITLES, SLA_PHASES } from "../core/sla-at.ts";
import { formatDay } from "../core/timeline.ts";
import { HERO_INCIDENT_ID } from "../data/hero.ts";
import { renderPanel } from "./components.ts";
import { renderGanttGrid } from "./gantt-grid.ts";
import { hrefChat, hrefIncidents, hrefTimeline, type ViewMode } from "./router.ts";
import { renderChips, renderStats } from "./timeline-blocks.ts";
import { renderEventList } from "./timeline-events.ts";
import { renderTimeRuler } from "./timeline-ruler.ts";
import { SLA_COLORS } from "./theme.ts";

export interface TimelinePageInput {
  readonly day: string;
  readonly days: readonly string[];
  readonly dayIndex: number;
  readonly view: ViewMode;
  readonly filter: string;
  readonly gantt: GanttModel;
  /** События процесса до выбранного дня — источник списка событий. */
  readonly events: readonly DayEvent[];
  /** Готовая разметка компактного чата рядом с диаграммой (на широком экране). */
  readonly chat: string;
  /** Плотность отображения диаграммы. */
  readonly density?: "normal" | "compact";
  /** Мобильный: показывать диаграмму вместо списка событий. */
  readonly graphMode?: boolean;
}

/** Подсказка про горизонтальную прокрутку и клавиатуру. */
export const renderScrollHint = (): string =>
  '<p class="scroll-hint" data-scroll-hint>Диаграмма шире экрана — прокручивайте по горизонтали. Строки и полосы доступны с клавиатуры: Tab и стрелки.</p>';

/** Только диаграмма — её перерисовывают при движении ползунка. */
export const renderCanvas = (input: TimelinePageInput): string =>
  '<div class="graph-wrap" data-graph-wrap>' + renderScrollHint() +
  '<div class="canvas graph-canvas" data-canvas tabindex="0" role="region" aria-label="Диаграмма Ганта: заявки по дням">' +
  renderGanttGrid(input.gantt, input.filter) + "</div></div>";

export const renderBody = (input: TimelinePageInput): string =>
  renderCanvas(input) + renderEventList(input) + input.chat;

/** Кнопки плотности и сброса фильтра: их перерисовывают, когда фильтр меняется. */
export const renderControls = (input: TimelinePageInput): string =>
  '<div class="timeline-controls" data-controls>' +
  '<span class="timeline-date">◷ ' + formatDay(input.day) + "</span>" +
  '<span class="hint">Срез времени:</span>' +
  '<div class="segmented" data-density-switch role="group" aria-label="Плотность">' +
  '<button data-density="normal"' + (input.density !== "compact" ? ' class="on"' : "") + ">Обычная</button>" +
  '<button data-density="compact"' + (input.density === "compact" ? ' class="on"' : "") + ">Компактная</button>" +
  "</div>" +
  '<button data-action="clear"' + (input.filter === "" ? " disabled" : "") + ">Показать все заявки</button>" +
  '<button class="graph-toggle" data-graph-toggle aria-pressed="' + String(input.graphMode === true) + '">Диаграмма' +
  (input.graphMode === true ? " скрыть" : " показать") + "</button>" +
  "</div>";

/** Шапка, ползунок времени и переключатели — всё, кроме самой диаграммы. */
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
  '<footer class="foot">Клик или Enter по строке открывают переписку заявки на эту дату. ' +
  "Полоса — время заявки на узле, цвет полосы — исполнитель, рамка — фаза SLA.</footer>";

/** Легенды: что означают цвета SLA и сколько данных в срезе. */
export const renderLegends = (input: TimelinePageInput): string => {
  const sla = SLA_PHASES.map(
    (phase) =>
      '<span class="legend-item" data-legend-sla="' + phase + '"><i style="background:' + SLA_COLORS[phase] + '"></i>' +
      SLA_LEGEND_TITLES[phase] + "</span>",
  ).join("");
  const events = input.events.filter((event) => event.day === input.day).length;
  const counts =
    '<span class="legend-item" data-legend-counts>заявок ' + input.gantt.rows.length + " · событий " + events + "</span>";
  return '<div class="legends graph-legend" data-legends>' + sla + counts + "</div>";
};

/** Панели-справка под диаграммой: как её читать и связанные представления. */
export const renderTimelineHelp = (input: TimelinePageInput): string =>
  '<div class="two-col section-gap">' +
  renderPanel({
    title: "Принцип визуального отображения SLA",
    body:
      '<p class="muted">Полоса — время заявки на узле: цвет роли показывает исполнителя, рамка — фазу SLA (в срок, пауза, просрочка). ' +
      "Диаграмма прокручивается по горизонтали, строки доступны с клавиатуры.</p>",
  }) +
  renderPanel({
    title: "Связанные виды",
    body:
      '<div class="stack">' +
      '<a class="button" href="' + hrefChat(HERO_INCIDENT_ID, input.day) + '">Переписка ' + HERO_INCIDENT_ID + " →</a>" +
      '<a class="button" href="' + hrefIncidents(input.day) + '">Все обращения →</a></div>',
  }) +
  "</div>";

export const renderTimelinePage = (input: TimelinePageInput): string =>
  renderTimelineHeader(input) + renderTimeRuler(input) + renderLegends(input) +
  renderBody(input) + renderTimelineFooter() + renderTimelineHelp(input);

export { renderTimeRuler } from "./timeline-ruler.ts";
export { renderChips, renderStats, visibleIds } from "./timeline-blocks.ts";
