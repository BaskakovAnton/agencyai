import { generateIncidents } from "../core/generator.ts";
import { buildProcessGraph } from "../data/edges.ts";
import { NODES } from "../data/nodes.ts";
import { mulberry32 } from "../random.ts";
import { mountRouter } from "./router.ts";

/** Вся модель доступна из бандла: её используют тесты паритета и оба демо-модуля. */
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
export {
  SITUATIONS,
  SITUATION_SECTIONS,
  nodesForSituation,
  normalizeSituationId,
  situationById,
  situationsForNode,
} from "../data/situations.ts";
export { COHORTS, COHORT_COLORS, COHORT_TITLES, applyFilters, cohortsByNode, defaultFilters, tooltipFor } from "../core/analytics.ts";
export {
  CHAT_INCIDENT_ID,
  CHAT_INCIDENT_TITLE,
  CHAT_SCENARIO,
  activeRole,
  chatStart,
  currentStep,
  nextStep,
  prevStep,
  setRoleOverride,
  visibleMessages,
} from "./chat.ts";
export { mountChat } from "./chat-view.ts";
export { mountDashboard } from "./dashboard.ts";
export { applyAction, createState } from "./session.ts";
export { renderPage } from "./view.ts";

/** Модель сессии для обоих демо-модулей: 30 заявок на 30 узлах процесса. */
export const demoModel = (seed = 7) => {
  const graph = buildProcessGraph(NODES);
  const incidents = generateIncidents(graph, mulberry32(seed));
  return { graph, incidents };
};

if (typeof document !== "undefined") {
  const start = (): void => {
    const { graph, incidents } = demoModel();
    mountRouter(graph, incidents);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}
