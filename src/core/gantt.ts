import { HERO_INCIDENT_ID } from "../data/hero.ts";
import { messageFor } from "../data/messages.ts";
import type { Graph, Incident, Priority, RoleId } from "../types.ts";
import { dayOf, visibleAt } from "./timeline.ts";

export interface GanttSegment {
  readonly nodeId: string;
  readonly title: string;
  readonly role: RoleId;
  readonly fromDay: string;
  readonly toDay: string;
  readonly fromColumn: number;
  readonly toColumn: number;
  readonly open: boolean;
}

export interface GanttRow {
  readonly incidentId: string;
  readonly title: string;
  readonly address: string;
  readonly priority: Priority;
  readonly isHero: boolean;
  readonly nodeId: string;
  readonly startDay: string;
  readonly endDay: string;
  readonly segments: readonly GanttSegment[];
}

export interface GanttModel {
  readonly rows: readonly GanttRow[];
  readonly days: readonly string[];
}

/** Диаграмма Ганта: полосы — сколько заявка стояла на узле, колонки — дни. */
export const buildGantt = (graph: Graph, incidents: readonly Incident[], day: string): GanttModel => {
  const visible = visibleAt(incidents, day);
  const days = new Set<string>();
  for (const incident of visible) {
    days.add(dayOf(incident.createdAt ?? ""));
    for (const move of incident.history) if (move.at) days.add(dayOf(move.at));
  }
  const columns = [...days].sort();
  const columnOf = new Map(columns.map((value, index) => [value, index]));
  const start = graph.order[0] ?? "U1";

  const rows: readonly GanttRow[] = visible.map((incident) => {
    const events = [
      { nodeId: start, at: incident.createdAt ?? "" },
      ...incident.history.map((move) => ({ nodeId: move.to, at: move.at ?? "" })),
    ];
    const segments: GanttSegment[] = events.map((event, index) => {
      const next = events[index + 1];
      const fromDay = dayOf(event.at);
      const toDay = next ? dayOf(next.at) : day;
      return {
        nodeId: event.nodeId,
        title: graph.byId[event.nodeId]?.title ?? "",
        role: messageFor(event.nodeId).role,
        fromDay,
        toDay,
        fromColumn: columnOf.get(fromDay) ?? 0,
        toColumn: columnOf.get(toDay) ?? 0,
        open: next === undefined,
      };
    });
    return {
      incidentId: incident.id,
      title: incident.title,
      address: incident.address,
      priority: incident.priority,
      isHero: incident.id === HERO_INCIDENT_ID,
      nodeId: incident.nodeId,
      startDay: dayOf(incident.createdAt ?? ""),
      endDay: day,
      segments,
    };
  });
  return { rows, days: columns };
};
