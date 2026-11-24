/** Разметка периода UX-3: переключатель 7/30 дней, динамика по дням и ограничения данных. */
import { PERIOD_LENGTHS, type PeriodAnalytics, type PeriodLength } from "./periods-reexport.ts";
import { renderEmptyState, renderPanel } from "./components.ts";

const dayLabel = (day: string): string => day.slice(8, 10) + "." + day.slice(5, 7);

const deltaText = (delta: { readonly text: string; readonly change: number } | null): string => {
  if (delta === null) return "— нет сравнения";
  const arrow = delta.change > 0 ? "↑ " : delta.change < 0 ? "↓ " : "→ ";
  return arrow + delta.text;
};

/** Переключатель периода: 7 или 30 дней. */
export const renderPeriodSwitch = (period: PeriodLength): string =>
  '<div class="segmented period-switch" data-period-switch role="group" aria-label="Период обзора">' +
  PERIOD_LENGTHS.map(
    (value) =>
      '<button data-period="' + value + '" data-period-button="' + value + '"' +
      (value === period ? ' class="on"' : "") +
      ' aria-pressed="' + String(value === period) + '">' + value + " дней</button>",
  ).join("") +
  "</div>";

const bars = (created: number, finished: number, max: number): string =>
  '<div class="dynamics-bars" aria-hidden="true">' +
  '<span class="dynamics-bar dynamics-bar-created" style="width:' + Math.round((created / max) * 100) + '%"></span>' +
  '<span class="dynamics-bar dynamics-bar-finished" style="width:' + Math.round((finished / max) * 100) + '%"></span>' +
  "</div>";

/** Панель «Динамика за период»: поступление и завершение по дням, дельта остатка и доля в срок. */
export const renderPeriodPanel = (analytics: PeriodAnalytics, formattedRange: string): string => {
  const { flow, backlogDelta, inTimeShare, dynamics } = analytics;
  const max = Math.max(1, ...dynamics.map((point) => Math.max(point.created, point.finished)));
  const total = dynamics.reduce((sum, point) => sum + point.created + point.finished, 0);
  const body =
    '<p class="muted">Поступило <b data-flow-created>' + flow.created + "</b> · завершено <b data-flow-finished>" +
    flow.finished + '</b> · изменение остатка <b data-backlog-delta>' + (backlogDelta > 0 ? "+" : "") + backlogDelta +
    '</b> · завершено в срок <b data-in-time-share>' + (inTimeShare === null ? "Нет данных" : inTimeShare + " %") + "</b></p>" +
    (total === 0
      ? renderEmptyState("Недостаточно данных для динамики за выбранный период")
      : '<ul class="dynamics-list">' +
        dynamics
          .map(
            (point) =>
              '<li class="dynamics-row" data-dynamics-row="' + point.day + '">' +
              '<span class="dynamics-day">' + dayLabel(point.day) + "</span>" +
              bars(point.created, point.finished, max) +
              '<span class="dynamics-value">' + point.created + " / " + point.finished + "</span></li>",
          )
          .join("") +
        "</ul>") +
    '<p class="fact-label section-gap">Поступило / завершено по дням · период ' + formattedRange + "</p>";
  return renderPanel({ title: "Динамика за период", subtitle: "Реальные события модели, без расчётных заглушек", body });
};

/** Ограничения данных: показываются рядом с показателями, чтобы не выдавать оценку за факт. */
export const renderPeriodNotes = (analytics: PeriodAnalytics): string =>
  '<div class="readonly period-notes" data-period-notes><b>Как считаем:</b><ul>' +
  analytics.notes.map((note) => "<li>" + note + "</li>").join("") +
  "</ul></div>";

export { deltaText };
