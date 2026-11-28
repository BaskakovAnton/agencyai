import { SLA_PHASE_TITLES } from "../core/sla-at.ts";
import { formatDay } from "../core/timeline.ts";
import type { TimelinePageInput } from "./timeline-html.ts";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

/** Последовательный список событий выбранного дня (WP-3): мобильный режим по умолчанию. */
export const renderEventList = (input: TimelinePageInput): string => {
  const events = input.events.filter((event) => event.day === input.day);
  const rows = events
    .map(
      (event) =>
        '<li class="event-row" data-event-item="' + event.id + '"><time datetime="' + event.at + '">' + event.at.slice(11, 16) +
        '</time><span class="event-main"><b>' + event.incidentId + "</b> · " + event.nodeId + " " + escapeHtml(event.nodeTitle) +
        '</span><span class="event-meta">' + event.roleName + " · SLA: " + SLA_PHASE_TITLES[event.slaPhase] + "</span></li>",
    )
    .join("");
  return (
    '<section class="event-list" data-event-list aria-label="События дня">' +
    '<h2 class="event-list-title">События ' + formatDay(input.day) + "</h2>" +
    (events.length === 0 ? '<p class="muted">На выбранный день событий нет.</p>' : '<ol class="events">' + rows + "</ol>") +
    "</section>"
  );
};
