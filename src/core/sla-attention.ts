/**
 * Внимание и риск SLA — доменные правила (перенесено из представления в ядро, UX-3).
 * Формулы зафиксированы тестами.
 */
import { isFinished } from "./incident.ts";
import { SLA_PROFILES } from "../data/sla.ts";
import { incidentAt } from "./timeline.ts";
import { hoursSince, slaPhaseOnDay, slaStateAt } from "./sla-at.ts";
import type { Graph, Incident } from "../types.ts";

/**
 * Остаток норматива в часах на конец дня (может быть отрицательным — срок нарушен).
 * Дедлайн в модели отсчитывается от создания заявки, поэтому и часы берём оттуда же:
 * раньше здесь вычитались часы от начала демонстрации, из-за чего у заявок «в срок»
 * остаток выходил отрицательным и одинаковым для всех.
 */
export const slaHoursLeft = (incident: Incident, day: string): number =>
  Math.round(slaStateAt(incident, day).dueAt - hoursSince(incident.createdAt ?? day, day + "T23:59:59.999Z"));

/** Просрочка или в срок, но остаток не больше суток. */
export const slaIsAtRisk = (incident: Incident, day: string): boolean => {
  const phase = slaPhaseOnDay(incident, day);
  if (phase === "overdue") return true;
  if (phase !== "ok") return false;
  if (SLA_PROFILES[incident.priority].resolveHours === 0) return false;
  const left = slaHoursLeft(incident, day);
  return left > 0 && left <= 24;
};

/** Формула «требуют внимания»: просрочен SLA **или** срочная незавершённая заявка. */
export const needsAttention = (graph: Graph, incident: Incident, day: string): boolean => {
  if (slaPhaseOnDay(incident, day) === "overdue") return true;
  return incident.priority === "urgent" && !isFinished(incidentAt(incident, day), graph);
};
