import { branchesOf, neighborsOf } from "../core/graph.ts";
import { normalizeRef } from "../core/refs.ts";
import { SLA_LEGEND_TITLES, slaPhaseOnDay, slaStateAt, type SlaPhase } from "../core/sla-at.ts";
import { DEMO_ORIGIN, addHours, dayOf, historyUpTo, incidentAt, isVisible } from "../core/timeline.ts";
import { branchShares } from "../data/edges.ts";
import { NODE_MESSAGES } from "../data/messages.ts";
import { GROUP_TITLES, PRIORITY_TITLES, ROLE_NAMES } from "../data/roles.ts";
import { SLA_PROFILES } from "../data/sla.ts";
import { situationById } from "../data/situations.ts";
import type { Graph, Incident, Priority, RoleId } from "../types.ts";

export interface HistoryRow {
  readonly step: number;
  readonly from: string;
  readonly fromTitle: string;
  readonly to: string;
  readonly toTitle: string;
  readonly at: string;
  readonly roleTitle: string;
  readonly actor: string;
}

export interface NextOption {
  readonly to: string;
  readonly title: string;
  readonly percent: number;
}

export interface IncidentView {
  readonly id: string;
  readonly title: string;
  readonly address: string;
  readonly reporter: string;
  readonly category: string;
  readonly priority: Priority;
  readonly priorityTitle: string;
  readonly situationTitle: string;
  readonly situationSummary: string;
  readonly beforeCreation: boolean;
  readonly nodeId: string;
  readonly nodeTitle: string;
  readonly groupTitle: string;
  readonly nodeDesc: string;
  readonly nodeRoleTitle: string;
  readonly phase: SlaPhase;
  readonly phaseTitle: string;
  readonly normTitle: string;
  readonly normHours: number;
  readonly dueDay: string;
  readonly dueText: string;
  readonly paused: boolean;
  readonly pauseReason: string;
  readonly history: readonly HistoryRow[];
  readonly next: readonly NextOption[];
  readonly branched: boolean;
}

/**
 * Read-only представление заявки на выбранный день. SLA не пересчитывается:
 * берутся существующие функции `slaStateAt` / `slaPhaseOnDay`.
 */
export const buildIncidentView = (
  graph: Graph,
  incidents: readonly Incident[],
  ref: string,
  day: string,
): IncidentView | null => {
  const id = normalizeRef(ref);
  const incident = incidents.find((item) => item.id === id);
  if (!incident) return null;

  const beforeCreation = !isVisible(incident, day);
  const asOf = beforeCreation ? incident : incidentAt(incident, day);
  const nodeId = beforeCreation ? incident.history[0]?.to ?? graph.order[0] ?? "U1" : asOf.nodeId;
  const node = graph.byId[nodeId];
  const situation = situationById(incident.situationId);
  const state = slaStateAt(incident, day);
  const phase: SlaPhase = beforeCreation ? "none" : slaPhaseOnDay(incident, day);
  const profile = SLA_PROFILES[incident.priority];
  const dueDay = state.dueAt > 0 ? dayOf(addHours(DEMO_ORIGIN, state.dueAt)) : "";
  const role = NODE_MESSAGES[nodeId]?.role;

  const branches = branchesOf(graph, nodeId);
  const next: readonly NextOption[] =
    branches.length > 0
      ? branchShares(branches).map((share) => ({ to: share.to, title: graph.byId[share.to]?.title ?? "", percent: share.percent }))
      : neighborsOf(graph, nodeId).next.map((to) => ({ to, title: graph.byId[to]?.title ?? "", percent: 0 }));

  const history = (beforeCreation ? [] : historyUpTo(incident, day)).map((move) => {
    const moveRole = NODE_MESSAGES[move.to]?.role;
    return {
      step: move.step,
      from: move.from,
      fromTitle: graph.byId[move.from]?.title ?? "",
      to: move.to,
      toTitle: graph.byId[move.to]?.title ?? "",
      at: move.at ?? "",
      roleTitle: moveRole === undefined ? "" : ROLE_NAMES[moveRole as RoleId],
      actor: move.actor,
    };
  });

  return {
    id: incident.id,
    title: incident.title,
    address: incident.address,
    reporter: incident.reporter,
    category: incident.category,
    priority: incident.priority,
    priorityTitle: PRIORITY_TITLES[incident.priority],
    situationTitle: situation?.title ?? "",
    situationSummary: situation?.summary ?? "",
    beforeCreation,
    nodeId,
    nodeTitle: node?.title ?? "",
    groupTitle: node === undefined ? "" : GROUP_TITLES[node.group],
    nodeDesc: node?.desc ?? "",
    nodeRoleTitle: role === undefined ? "" : ROLE_NAMES[role],
    phase,
    phaseTitle: SLA_LEGEND_TITLES[phase],
    normTitle: profile.title,
    normHours: profile.resolveHours,
    dueDay,
    dueText: state.paused ? "пауза: " + state.pauseReason : state.dueAt > 0 ? "дедлайн " + dueDay : "норматив не задан",
    paused: state.paused,
    pauseReason: state.pauseReason,
    history,
    next,
    branched: branches.length > 0,
  };
};
