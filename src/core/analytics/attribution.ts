/** Историческая атрибуция подразделений (UX-3.3, блок F; DEC-UX33-05/06). */
import type { IncidentAssignment } from "../org/types.ts";

export type AttributionState = "assigned" | "conflict" | "incomplete" | "no_data";

export interface Attribution {
  readonly state: AttributionState;
  readonly departmentId: string | null;
  /** Результат получен специальным правилом дня передачи (шаг 2). */
  readonly viaTransferDay: boolean;
  /** На конец дня есть покрывающий accountable-интервал. */
  readonly activeOnDayEnd: boolean;
}

const DEPARTMENT_ID = /^DEP-[A-Za-z0-9_-]+$/;
const validDepartment = (value: string | null | undefined): value is string => typeof value === "string" && DEPARTMENT_ID.test(value);
const dayStart = (day: string): string => day + "T00:00:00.000Z";
const dayEnd = (day: string): string => day + "T23:59:59.999Z";
const openEnded = (assignment: IncidentAssignment, moment: string): boolean =>
  assignment.endedAt === null || assignment.endedAt === undefined || assignment.endedAt > moment;

/**
 * Двухшаговый алгоритм раздела 7.1: сначала конец дня, затем специальное правило дня передачи.
 * Границы: assignedAt включительно, endedAt исключительно. Сценарии A-G из раздела 7.1.1.
 */
export const departmentOn = (
  assignments: readonly IncidentAssignment[],
  incidentId: string,
  day: string,
): Attribution => {
  const all = assignments.filter((item) => item.incidentId === incidentId && item.assignmentType === "accountable");
  const end = dayEnd(day);
  const start = dayStart(day);
  const covering = all.filter((item) => item.assignedAt <= end && openEnded(item, end));
  if (covering.length === 1) {
    const only = covering[0] as IncidentAssignment;
    return validDepartment(only.departmentId)
      ? { state: "assigned", departmentId: only.departmentId, viaTransferDay: false, activeOnDayEnd: true }
      : { state: "incomplete", departmentId: null, viaTransferDay: false, activeOnDayEnd: true };
  }
  if (covering.length > 1) return { state: "conflict", departmentId: null, viaTransferDay: false, activeOnDayEnd: true };
  // Шаг 2 применяется, только если конец дня не покрыт: кандидаты — интервалы, пересекающие день.
  const intersecting = all.filter((item) => item.assignedAt <= end && openEnded(item, start));
  if (intersecting.length === 0) return { state: "no_data", departmentId: null, viaTransferDay: false, activeOnDayEnd: false };
  const latest = intersecting.reduce((max, item) => (item.assignedAt > max ? item.assignedAt : max), "");
  const last = intersecting.filter((item) => item.assignedAt === latest);
  if (last.length > 1) return { state: "conflict", departmentId: null, viaTransferDay: true, activeOnDayEnd: false };
  const candidate = last[0] as IncidentAssignment;
  return validDepartment(candidate.departmentId)
    ? { state: "assigned", departmentId: candidate.departmentId, viaTransferDay: true, activeOnDayEnd: false }
    : { state: "incomplete", departmentId: null, viaTransferDay: true, activeOnDayEnd: false };
};
