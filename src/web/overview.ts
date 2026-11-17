import { isFinished, priorityRank } from "../core/incident.ts";
import { slaPhaseOnDay, type SlaPhase } from "../core/sla-at.ts";
import { incidentAt, visibleAt } from "../core/timeline.ts";
import { situationById } from "../data/situations.ts";
import type { Graph, Incident, Priority } from "../types.ts";

export interface OverviewKpi {
  readonly total: number;
  readonly attention: number;
  readonly paused: number;
  readonly overdue: number;
  readonly ok: number;
  readonly none: number;
  readonly urgent: number;
}

export interface AttentionItem {
  readonly id: string;
  readonly title: string;
  readonly situation: string;
  readonly priority: Priority;
  readonly nodeId: string;
  readonly nodeTitle: string;
  readonly phase: SlaPhase;
  readonly reason: string;
}

export interface OverviewEvent {
  readonly id: string;
  readonly at: string;
  readonly nodeId: string;
  readonly nodeTitle: string;
}

export interface Overview {
  readonly day: string;
  readonly kpi: OverviewKpi;
  readonly attention: readonly AttentionItem[];
  readonly events: readonly OverviewEvent[];
}

/**
 * Формула «требуют внимания»: просрочен SLA **или** срочная заявка, ещё не завершённая.
 * Правило намеренно простое и проверяемое — покрыто тестом.
 */
export const needsAttention = (graph: Graph, incident: Incident, day: string): boolean => {
  if (slaPhaseOnDay(incident, day) === "overdue") return true;
  return incident.priority === "urgent" && !isFinished(incidentAt(incident, day), graph);
};

/** Сводка обзора на выбранный день: KPI, требующие внимания заявки и последние события. */
export const buildOverview = (graph: Graph, incidents: readonly Incident[], day: string): Overview => {
  const slice = visibleAt(incidents, day);
  const phases = slice.map((incident) => slaPhaseOnDay(incident, day));
  const attention = slice
    .filter((incident) => needsAttention(graph, incident, day))
    .map((incident) => {
      const asOf = incidentAt(incident, day);
      const phase = slaPhaseOnDay(incident, day);
      return {
        id: incident.id,
        title: incident.title,
        situation: situationById(incident.situationId)?.title ?? "",
        priority: incident.priority,
        nodeId: asOf.nodeId,
        nodeTitle: graph.byId[asOf.nodeId]?.title ?? "",
        phase,
        reason: phase === "overdue" ? "просрочен SLA" : "срочная",
      };
    })
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id, "ru", { numeric: true }));

  const events = slice
    .flatMap((incident) =>
      incidentAt(incident, day).history
        .filter((move) => move.at !== undefined)
        .map((move) => ({
          id: incident.id,
          at: move.at as string,
          nodeId: move.to,
          nodeTitle: graph.byId[move.to]?.title ?? "",
        })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return {
    day,
    kpi: {
      total: slice.length,
      attention: attention.length,
      paused: phases.filter((phase) => phase === "paused").length,
      overdue: phases.filter((phase) => phase === "overdue").length,
      ok: phases.filter((phase) => phase === "ok").length,
      none: phases.filter((phase) => phase === "none").length,
      urgent: slice.filter((incident) => incident.priority === "urgent").length,
    },
    attention: attention.slice(0, 8),
    events,
  };
};
