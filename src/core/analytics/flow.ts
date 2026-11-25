/**
 * Flow — события внутри периода (UX-3, уточнено в UX-3.1).
 * «Завершено» = подтверждающая запись жизненного цикла `approved`;
 * достижение терминального узла считается отдельно (`reachedTerminal`).
 */
import { dayOf } from "../timeline.ts";
import type { Period } from "../periods.ts";
import type { IncidentLifecycle } from "../org/completion.ts";
import type { IncidentAssignment } from "../org/types.ts";
import type { Graph, Incident } from "../../types.ts";

export interface PeriodFlow {
  readonly created: number;
  /** Окончательно завершённые: подтверждено контролёром в периоде (совпадает с `approved`). */
  readonly finished: number;
  /** Достигли терминального узла графа в периоде — это не подтверждение завершения. */
  readonly reachedTerminal: number;
  readonly submitted: number;
  readonly approved: number;
  readonly rejected: number;
  readonly reopened: number;
  /** Назначения подразделений, созданные в периоде. */
  readonly assigned: number;
  /** Назначения, закрытые в периоде. */
  readonly assignmentsClosed: number;
}

export interface FlowInput {
  readonly graph: Graph;
  readonly incidents: readonly Incident[];
  readonly lifecycles?: Readonly<Record<string, IncidentLifecycle>>;
  readonly assignments?: readonly IncidentAssignment[];
}

/** Момент первого входа в терминальный узел графа (не подтверждение завершения). */
export const reachedTerminalAt = (graph: Graph, incident: Incident): string | null =>
  incident.history.find((move) => move.at !== undefined && (graph.next[move.to] ?? []).length === 0)?.at ?? null;

export const flowOf = (input: FlowInput, period: Period): PeriodFlow => {
  const days = new Set(period.days);
  const inPeriod = (iso: string | null | undefined): boolean => iso !== undefined && iso !== null && days.has(dayOf(iso));

  const lifecycles = Object.values(input.lifecycles ?? {});
  const records = lifecycles.flatMap((lifecycle) => lifecycle.records).filter((record) => inPeriod(record.at));
  const assignments = input.assignments ?? [];
  const approved = records.filter((record) => record.type === "approved").length;

  return {
    created: input.incidents.filter((incident) => inPeriod(incident.createdAt)).length,
    finished: approved,
    reachedTerminal: input.incidents.filter((incident) => inPeriod(reachedTerminalAt(input.graph, incident))).length,
    submitted: records.filter((record) => record.type === "submitted").length,
    approved,
    rejected: records.filter((record) => record.type === "rejected").length,
    reopened: records.filter((record) => record.type === "reopened").length,
    assigned: assignments.filter((assignment) => inPeriod(assignment.assignedAt)).length,
    assignmentsClosed: assignments.filter((assignment) => inPeriod(assignment.endedAt)).length,
  };
};
