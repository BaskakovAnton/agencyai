import { HERO_INCIDENT_ID } from "../data/hero.ts";
import { messageFor } from "../data/messages.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import { hoursFor } from "../data/sla.ts";
import type { Graph, Incident, NodeGroup, RoleId } from "../types.ts";
import { SLA_PHASES, slaPhaseAtEvent, type SlaPhase } from "./sla-at.ts";
import { dayOf, visibleAt } from "./timeline.ts";

export interface GitNodeColumn {
  readonly nodeId: string;
  readonly index: number;
  readonly title: string;
  readonly group: NodeGroup;
  readonly isFork: boolean;
  readonly isMerge: boolean;
}

export interface GitCommit {
  readonly id: string;
  readonly incidentId: string;
  readonly nodeId: string;
  readonly nodeIndex: number;
  readonly nodeTitle: string;
  readonly group: NodeGroup;
  readonly at: string;
  readonly day: string;
  readonly role: RoleId;
  readonly author: string;
  readonly text: string;
  readonly kind: "root" | "move";
  readonly isHero: boolean;
  readonly hoursInNode: number;
  readonly slaPhase: SlaPhase;
  readonly isFork: boolean;
  readonly isMerge: boolean;
}

export interface GitLink {
  readonly incidentId: string;
  readonly from: string;
  readonly to: string;
}

export interface GitModel {
  readonly commits: readonly GitCommit[];
  readonly links: readonly GitLink[];
  readonly columns: readonly GitNodeColumn[];
  readonly days: readonly string[];
  readonly incidents: readonly string[];
  readonly forks: readonly string[];
  readonly merges: readonly string[];
  readonly sla: Readonly<Record<SlaPhase, number>>;
}

const uniqueDays = (incidents: readonly Incident[]): readonly string[] => {
  const days = new Set<string>();
  for (const incident of incidents) {
    days.add(dayOf(incident.createdAt ?? ""));
    for (const move of incident.history) if (move.at) days.add(dayOf(move.at));
  }
  return [...days].sort();
};

/**
 * Git-граф: колонки — узлы процесса, строки — дни, точки — «коммиты» (заявка на узле),
 * линии — путь заявки. Всё, что позже выбранного дня, не попадает в модель.
 */
export const buildGitGraph = (graph: Graph, incidents: readonly Incident[], day: string): GitModel => {
  const visible = visibleAt(incidents, day);
  const days = uniqueDays(visible);
  const forks = graph.order.filter((nodeId) => (graph.branches[nodeId]?.length ?? 0) > 0);
  const merges = graph.order.filter((nodeId) => (graph.prev[nodeId]?.length ?? 0) > 1);
  const columns: readonly GitNodeColumn[] = graph.order.map((nodeId, index) => ({
    nodeId,
    index,
    title: graph.byId[nodeId]?.title ?? "",
    group: (graph.byId[nodeId]?.group ?? "priem") as NodeGroup,
    isFork: forks.includes(nodeId),
    isMerge: merges.includes(nodeId),
  }));
  const columnOf = new Map(columns.map((column) => [column.nodeId, column.index]));

  const commits: GitCommit[] = [];
  const links: GitLink[] = [];
  for (const incident of visible) {
    const events = [
      { nodeId: graph.order[0] ?? incident.nodeId, at: incident.createdAt ?? "", kind: "root" as const, sla: undefined },
      ...incident.history.map((move) => ({ nodeId: move.to, at: move.at ?? "", kind: "move" as const, sla: move.sla })),
    ];
    let previous = "";
    events.forEach((event, index) => {
      const message = messageFor(event.nodeId);
      const id = incident.id + "#" + index;
      const column = columns[columnOf.get(event.nodeId) ?? 0];
      commits.push({
        id,
        incidentId: incident.id,
        nodeId: event.nodeId,
        nodeIndex: column?.index ?? 0,
        nodeTitle: column?.title ?? "",
        group: column?.group ?? "priem",
        at: event.at,
        day: dayOf(event.at),
        role: message.role,
        author: ROLE_NAMES[message.role],
        text: message.text,
        kind: event.kind,
        isHero: incident.id === HERO_INCIDENT_ID,
        hoursInNode: hoursFor(event.nodeId),
        slaPhase: slaPhaseAtEvent(incident, event.at, event.sla),
        isFork: column?.isFork ?? false,
        isMerge: column?.isMerge ?? false,
      });
      if (previous !== "") links.push({ incidentId: incident.id, from: previous, to: id });
      previous = id;
    });
  }
  commits.sort(
    (a, b) => a.day.localeCompare(b.day) || a.incidentId.localeCompare(b.incidentId) || a.nodeIndex - b.nodeIndex,
  );
  const sla: Record<SlaPhase, number> = { ok: 0, paused: 0, overdue: 0, none: 0 };
  for (const commit of commits) sla[commit.slaPhase] += 1;
  for (const phase of SLA_PHASES) sla[phase] += 0;
  return { commits, links, columns, days, incidents: visible.map((incident) => incident.id), forks, merges, sla };
};
