import type { Incident, Priority, SlaState } from "../types.ts";
import { PAUSE_NODE, PAUSE_REASONS, RECALC_HOURS, RESUME_NODE, SLA_PROFILES } from "../data/sla.ts";
import { pick } from "../random.ts";

/** Статус SLA на текущий момент. */
export interface SlaStatus {
  readonly phase: "ok" | "paused" | "overdue" | "none";
  readonly hoursLeft: number;
  readonly breached: boolean;
  readonly escalated: boolean;
  readonly note: string;
}

/** Новый норматив: дедлайн считается от текущего времени. */
export const startSla = (priority: Priority, clock: number): SlaState => ({
  dueAt: clock + SLA_PROFILES[priority].resolveHours,
  paused: false,
  pauseReason: "",
  pausedAt: 0,
  breached: false,
  escalated: false,
});

/** Просрочка фиксируется один раз и однократно поднимает эскалацию. */
export const withClock = (incident: Incident, clock: number): Incident => {
  const sla = incident.sla;
  if (sla.paused || SLA_PROFILES[incident.priority].resolveHours === 0) return incident;
  if (sla.breached || clock <= sla.dueAt) return incident;
  return { ...incident, sla: { ...sla, breached: true, escalated: true } };
};

export const slaStatus = (incident: Incident, clock: number): SlaStatus => {
  const sla = incident.sla;
  if (SLA_PROFILES[incident.priority].resolveHours === 0) {
    return { phase: "none", hoursLeft: 0, breached: false, escalated: false, note: "вне SLA" };
  }
  const hoursLeft = sla.dueAt - clock;
  if (sla.paused) {
    return { phase: "paused", hoursLeft, breached: false, escalated: false, note: "пауза: " + sla.pauseReason };
  }
  if (hoursLeft < 0 || sla.breached) {
    return { phase: "overdue", hoursLeft, breached: true, escalated: sla.escalated, note: "просрочено на " + Math.abs(Math.round(hoursLeft)) + " ч" };
  }
  return { phase: "ok", hoursLeft, breached: false, escalated: sla.escalated, note: "в срок, осталось " + Math.round(hoursLeft) + " ч" };
};

/** Приостановка SLA: время паузы не съедает норматив. */
export const pauseSlaAt = (incident: Incident, clock: number, reason: string): Incident => {
  if (incident.sla.paused) return incident;
  return { ...incident, sla: { ...incident.sla, paused: true, pausedAt: clock, pauseReason: reason } };
};

/** Возобновление: дедлайн сдвигается ровно на время паузы. */
export const resumeSlaAt = (incident: Incident, clock: number): Incident => {
  const sla = incident.sla;
  if (!sla.paused) return incident;
  const pausedHours = Math.max(0, clock - sla.pausedAt);
  return { ...incident, sla: { ...sla, paused: false, pausedAt: 0, pauseReason: "", dueAt: sla.dueAt + pausedHours } };
};

/** Эффекты узла назначения: пауза, возобновление, пересчёт норматива, просрочка. */
export const afterMove = (incident: Incident, targetNodeId: string, clock: number, rand: () => number = () => 0): Incident => {
  let next = incident;
  if (targetNodeId === PAUSE_NODE) next = pauseSlaAt(next, clock, pick(PAUSE_REASONS, rand));
  else if (targetNodeId === RESUME_NODE) next = resumeSlaAt(next, clock);
  const recalc = RECALC_HOURS[targetNodeId];
  if (recalc !== undefined && !next.sla.paused) next = { ...next, sla: { ...next.sla, dueAt: clock + recalc } };
  return withClock(next, clock);
};
