import { formatDay } from "../core/timeline.ts";
import { SLA_LEGEND_TITLES } from "../core/sla-at.ts";
import { hrefIncident, hrefIncidents, hrefTimeline } from "./router.ts";
import type { Overview } from "./overview.ts";

export interface DashboardInput {
  readonly overview: Overview;
  readonly days: readonly string[];
  readonly day: string;
}

const kpi = (key: string, label: string, value: number): string =>
  '<article class="kpi" data-kpi="' + key + '"><span>' + label + "</span><b>" + value + "</b></article>";

const daySelect = (days: readonly string[], day: string): string =>
  '<label class="hint">Срез: <select data-day-select>' +
  days
    .map((value) => '<option value="' + value + '"' + (value === day ? " selected" : "") + ">" + formatDay(value) + "</option>")
    .join("") +
  "</select></label>";

/** Экран «Обзор»: KPI из модели, требующие внимания заявки, последние события. */
export const renderDashboard = (input: DashboardInput): string => {
  const { overview } = input;
  if (overview.kpi.total === 0) {
    return (
      '<section class="dashboard" data-dashboard>' +
      '<div class="dashboard-head">' + daySelect(input.days, input.day) +
      '<a href="' + hrefIncidents(input.day) + '">Все обращения →</a></div>' +
      '<p class="hint">В этом срезе нет заявок — выберите другую дату.</p>' +
      "</section>"
    );
  }
  const cards =
    kpi("total", "Всего заявок", overview.kpi.total) +
    kpi("attention", "Требуют внимания", overview.kpi.attention) +
    kpi("paused", "На паузе", overview.kpi.paused) +
    kpi("overdue", "Просрочено", overview.kpi.overdue);

  const attention =
    overview.attention.length === 0
      ? '<p class="hint">Нет заявок, требующих внимания.</p>'
      : '<ul class="attention-list">' +
        overview.attention
          .map(
            (item) =>
              "<li><a href=\"" + hrefIncident(item.id, input.day) + "\"><b>" + item.id + "</b> " + item.title +
              '</a><span class="hint">' + item.nodeId + " " + item.nodeTitle + " · " + SLA_LEGEND_TITLES[item.phase] +
              " · " + item.reason + "</span></li>",
          )
          .join("") +
        "</ul>";

  const events =
    overview.events.length === 0
      ? ""
      : '<section class="panel" data-events><h2>Последние события</h2><ul class="event-list">' +
        overview.events
          .map((event) => "<li><b>" + event.id + "</b> → " + event.nodeId + " " + event.nodeTitle + ' <span class="hint">' + event.at.slice(11, 16) + "</span></li>")
          .join("") +
        "</ul></section>";

  return (
    '<section class="dashboard" data-dashboard>' +
    '<div class="dashboard-head">' + daySelect(input.days, input.day) +
    '<a href="' + hrefIncidents(input.day) + '">Все обращения →</a>' +
    '<a href="' + hrefTimeline(input.day, "git") + '">Хронология на эту дату →</a></div>' +
    '<div class="kpi-grid">' + cards + "</div>" +
    '<section class="panel" data-attention><h2>Требуют внимания</h2>' + attention + "</section>" +
    events +
    "</section>"
  );
};
