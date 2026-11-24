import { chatAt, conversationFor, messagesUpTo } from "../core/conversation.ts";
import { buildGantt } from "../core/gantt.ts";
import { buildGitGraph } from "../core/gitgraph.ts";
import { buildStory } from "../core/story.ts";
import { daysRange, formatDay, formatStamp, visibleAt, withTimeline } from "../core/timeline.ts";
import { buildProcessGraph } from "../data/edges.ts";
import { NODES } from "../data/nodes.ts";
import { createDemoOrgRepository } from "../data/org-repository.ts";
import { mountChat } from "./chat-view.ts";
import { renderPhone } from "./chat-html.ts";
import { renderGanttGrid } from "./gantt-grid.ts";
import { renderGitSvg } from "./git-svg.ts";
import { hrefChat, hrefTimeline, mountRouter, parseRoute } from "./router.ts";
import { mountTimeline } from "./timeline-view.ts";

/** Вся модель доступна из бандла: её используют тесты паритета и экраны демо. */
export { NODES } from "../data/nodes.ts";
export { branchesOf, buildGraph, neighborsOf } from "../core/graph.ts";
export { BRANCHES, branchShares, buildProcessGraph } from "../data/edges.ts";
export { generateIncidents } from "../core/generator.ts";
export { moveBackward, moveForward, moveToNode } from "../core/navigation.ts";
export { allowedNext, isArchived, moveForwardAs, moveToNodeAs } from "../core/navigation.ts";
export { buildFinalState, buildSummary } from "../core/report.ts";
export { allowedRoles, roleAccess } from "../core/roles.ts";
export { mulberry32, pick, randInt, shuffle } from "../random.ts";
export { afterMove, pauseSlaAt, resumeSlaAt, slaStatus, startSla, withClock } from "../core/sla.ts";
export { PAUSE_REASONS, SLA_PROFILES, hoursFor } from "../data/sla.ts";
export { NODE_MESSAGES, messageFor } from "../data/messages.ts";
export { HERO_GAPS, HERO_INCIDENT_ID, HERO_ROUTE, HERO_START, HERO_TITLE } from "../data/hero.ts";
export { SITUATIONS, SITUATION_SECTIONS, nodesForSituation, normalizeSituationId, situationById, situationsForNode } from "../data/situations.ts";
export { chatAt, conversationFor, messagesUpTo } from "../core/conversation.ts";
export { buildGantt } from "../core/gantt.ts";
export { buildGitGraph } from "../core/gitgraph.ts";
export { buildStory, STORY_HOURS_FACTOR, STORY_SWEEPS } from "../core/story.ts";
export { dayOf, daysRange, formatDay, formatStamp, incidentAt, visibleAt, withTimeline } from "../core/timeline.ts";
export { pluralize } from "../core/text.ts";
export { renderGanttGrid } from "./gantt-grid.ts";
export { renderGitSvg } from "./git-svg.ts";
export { renderPhone, renderInlineChat, renderMessages } from "./chat-html.ts";
export { hrefChat, hrefTimeline, parseRoute } from "./router.ts";
export { mountChat } from "./chat-view.ts";
export { mountTimeline } from "./timeline-view.ts";
export { renderNodeCard } from "./node-card.ts";
export { renderTimeRuler, renderLegends } from "./timeline-html.ts";
export { SLA_PHASES, SLA_PHASE_TITLES, SLA_LEGEND_TITLES, slaPhaseAt, slaPhaseOf, slaPhaseOnDay, slaStateAt } from "../core/sla-at.ts";
export { applyAction, createState } from "./session.ts";
export { renderPage } from "./view.ts";

/** Модель демонстрации: граф процесса и 30 заявок с датами (герой — З-015). */
export const demoModel = (seed = 7) => {
  const graph = buildProcessGraph(NODES);
  const story = buildStory(graph, seed);
  return { graph, story, incidents: story.incidents };
};

if (typeof document !== "undefined") {
  const start = (): void => {
    const { graph, story } = demoModel();
    // Орг-модель (UX-2…UX-4) подключается к экранам через порты репозитория.
    mountRouter(graph, story, createDemoOrgRepository(graph).repository);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}
