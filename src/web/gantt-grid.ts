import type { GanttModel } from "../core/gantt.ts";
import { SLA_PHASE_TITLES } from "../core/sla-at.ts";
import { formatDay } from "../core/timeline.ts";
import { ROLE_COLORS, SLA_COLORS } from "./theme.ts";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

/** Диаграмма Ганта на CSS Grid: строки — заявки, колонки — дни, полосы — узлы процесса. */
export const renderGanttGrid = (model: GanttModel, filter = ""): string => {
  const rows = filter === "" ? model.rows : model.rows.filter((row) => row.incidentId === filter);
  const columns = "220px repeat(" + Math.max(model.days.length, 1) + ", minmax(26px, 1fr))";
  const head =
    '<div class="gantt-row head" style="grid-template-columns:' + columns + '">' +
    '<div class="gantt-cell name">заявка</div>' +
    model.days.map((day) => '<div class="gantt-cell day">' + day.slice(8) + "</div>").join("") +
    "</div>";

  const body = rows
    .map((row) => {
      const bars = row.segments
        .map((segment) => {
          const span = Math.max(segment.toColumn - segment.fromColumn + 1, 1);
          return (
            '<div class="bar" data-bar="' + row.incidentId + '" data-node="' + segment.nodeId +
            '" data-from="' + segment.fromDay + '" data-to="' + segment.toDay +
            '" data-sla="' + segment.slaPhase + '" data-hours="' + segment.hours +
            '" style="grid-column:' + (segment.fromColumn + 2) + " / span " + span +
            ";background:" + ROLE_COLORS[segment.role] + ";border-color:" + SLA_COLORS[segment.slaPhase] + '" title="' +
            escapeHtml(
              segment.nodeId + " · " + segment.title + " · " + formatDay(segment.fromDay) + " · " +
              SLA_PHASE_TITLES[segment.slaPhase] + " · " + segment.hours + " ч",
            ) + '">' +
            '<span>' + segment.nodeId + "</span></div>"
          );
        })
        .join("");
      return (
        '<div class="gantt-row' + (row.isHero ? " hero" : "") + '" data-row="' + row.incidentId +
        '" style="grid-template-columns:' + columns + '">' +
        '<div class="gantt-cell name"><b>' + row.incidentId + "</b> " + escapeHtml(row.title) +
        '<i class="prio ' + row.priority + '">' + row.priority + "</i></div>" +
        bars +
        "</div>"
      );
    })
    .join("");

  return '<div class="gantt" data-gantt>' + head + body + "</div>";
};
