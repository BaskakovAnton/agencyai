import { HERO_INCIDENT_ID } from "../data/hero.ts";
import { messageFor } from "../data/messages.ts";
import { ROLE_NAMES } from "../data/roles.ts";
import type { Graph, Incident, NodeGroup, RoleId } from "../types.ts";
import { dayOf, visibleAt } from "./timeline.ts";

export interface GitNodeColumn {
  readonly nodeId: string;
  readonly index: number;
  readonly title: string;
  readonly group: NodeGroup;
}

export interface GitCommit {
  readonly id: string;
  readonly incidentId: string;
  readonly nodeId: string;
  readonly nodeIndex: number;
  readonly at: string;
  readonly day: string;
  readonly role: RoleId;
  readonly author: string;
  readonly text: string;
  readonly kind: "root" | "move";
  readonly isHero: boolean;
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
  const rowOfDay = new Map(days.map((value, index) => [value, index]));
  const columns: readonly GitNodeColumn[] = graph.order.map((nodeId, index) => ({
    nodeId,
    index,
    title: graph.byId[nodeId]?.title ?? "",
    group: (graph.byId[nodeId]?.group ?? "priem") as NodeGroup,
  }));
  const columnOf = new Map(columns.map((column) => [column.nodeId, column.index]));

  const commits: GitCommit[] = [];
  const links: GitLink[] = [];
  for (const incident of visible) {
    const events = [
      { nodeId: graph.order[0] ?? incident.nodeId, at: incident.createdAt ?? "", kind: "root" as const },
      ...incident.history.map((move) => ({ nodeId: move.to, at: move.at ?? "", kind: "move" as const })),
    ];
    let previous = "";
    events.forEach((event, index) => {
      const message = messageFor(event.nodeId);
      const id = incident.id + "#" + index;
      commits.push({
        id,
        incidentId: incident.id,
        nodeId: event.nodeId,
        nodeIndex: columnOf.get(event.nodeId) ?? 0,
        at: event.at,
        day: dayOf(event.at),
        role: message.role,
        author: ROLE_NAMES[message.role],
        text: message.text,
        kind: event.kind,
        isHero: incident.id === HERO_INCIDENT_ID,
      });
      if (previous !== "") links.push({ incidentId: incident.id, from: previous, to: id });
      previous = id;
    });
  }
  commits.sort(
    (a, b) => a.day.localeCompare(b.day) || a.incidentId.localeCompare(b.incidentId) || a.nodeIndex - b.nodeIndex,
  );
  return { commits, links, columns, days, incidents: visible.map((incident) => incident.id) };
};
