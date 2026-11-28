import { formatDay } from "../core/timeline.ts";
import { SLA_PHASE_TITLES } from "../core/sla-at.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import type { TimelinePageInput } from "./timeline-html.ts";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

/** Последовательный список событий выбранного дня (WP-3): мобильный режим по умолчанию. */
export const renderEventList = (input: TimelinePageInput): string => {
  const commits = (input.filter === "" ? input.git.commits : input.git.commits.filter((item) => item.incidentId === input.filter))
    .filter((item) => item.day === input.day)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
  const rows = commits
    .map(
      (commit) =>
        '<li class="event-row" data-event-item="' + commit.id + '"><time datetime="' + commit.at + '">' + commit.at.slice(11, 16) +
        '</time><span class="event-main"><b>' + commit.incidentId + "</b> · " + commit.nodeId + " " + escapeHtml(commit.nodeTitle) +
        '</span><span class="event-meta">' + ROLE_NAMES[commit.role] + " · SLA: " + SLA_PHASE_TITLES[commit.slaPhase] + "</span></li>",
    )
    .join("");
  return (
    '<section class="event-list" data-event-list aria-label="События дня">' +
    '<h2 class="event-list-title">События ' + formatDay(input.day) + "</h2>" +
    (commits.length === 0 ? '<p class="muted">На выбранный день событий нет.</p>' : '<ol class="events">' + rows + "</ol>") +
    "</section>"
  );
};

