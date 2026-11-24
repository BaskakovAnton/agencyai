import {
  activeOf,
  assignmentEvent,
  checkAssignmentBase,
  newAssignment,
  type AssignmentInput,
  type AssignmentResult,
  type AssignOptions,
} from "./assignment-types.ts";
import { checkEmployeeAssignable, departmentById, failed } from "./directory.ts";
import { nextAssignmentId } from "./events.ts";
import type { AssignmentType, DomainEventType } from "./types.ts";

/** Создание назначения: одно назначение — одно событие. */
const create = (
  input: AssignmentInput,
  type: AssignmentType,
  options: AssignOptions,
  eventType: DomainEventType,
  payload: Readonly<Record<string, string | number | null>>,
): AssignmentResult => {
  const check = checkAssignmentBase(input, options);
  if (!check.ok) return check;
  const id = nextAssignmentId(input.assignments);
  const assignment = newAssignment(input, id, type, options);
  return {
    ok: true,
    assignments: [...input.assignments, assignment],
    events: [
      ...input.events,
      assignmentEvent(input, input.incident.id, eventType, assignment.assignedAt, assignment.assignedByUserId, {
        assignmentId: id,
        ...payload,
      }),
    ],
    assignmentId: id,
  };
};

/** Назначить основное ответственное подразделение. Второе активное ответственное запрещено. */
export const assignDepartment = (input: AssignmentInput, options: AssignOptions): AssignmentResult => {
  if (activeOf(input.assignments, input.incident.id, "accountable").length > 0) {
    return failed("у обращения уже есть активное ответственное подразделение: используйте переназначение");
  }
  return create(input, "accountable", options, "DepartmentAssigned", {
    departmentId: options.departmentId,
    departmentName: departmentById(input.directory, options.departmentId)?.name ?? null,
  });
};

/** Добавить подразделение-участника: активных участников может быть несколько. */
export const addParticipantDepartment = (input: AssignmentInput, options: AssignOptions): AssignmentResult => {
  const duplicate = activeOf(input.assignments, input.incident.id, "participant").some(
    (assignment) => assignment.departmentId === options.departmentId,
  );
  if (duplicate) return failed("подразделение уже участвует в обращении: " + options.departmentId);
  return create(input, "participant", options, "ParticipantDepartmentAdded", { departmentId: options.departmentId });
};

export interface AssignEmployeeOptions {
  readonly assignmentId: string;
  readonly employeeId: string;
  readonly at: string;
  readonly actorUserId?: string | null;
  readonly reason?: string | null;
}

/** Назначить сотрудника внутри существующего назначения: сотрудник подчиняется подразделению. */
export const assignEmployee = (input: AssignmentInput, options: AssignEmployeeOptions): AssignmentResult => {
  const assignment = input.assignments.find((item) => item.id === options.assignmentId);
  if (!assignment) return failed("назначение не найдено: " + options.assignmentId);
  if (assignment.status !== "active") return failed("назначение не активно: " + options.assignmentId);
  if (assignment.incidentId !== input.incident.id) return failed("назначение относится к другому обращению");
  const check = checkEmployeeAssignable(
    input.directory,
    options.employeeId,
    input.incident.organizationId,
    assignment.departmentId,
  );
  if (!check.ok) return check;
  const assignments = input.assignments.map((item) =>
    item.id === assignment.id ? { ...item, employeeId: options.employeeId } : item,
  );
  return {
    ok: true,
    assignments,
    events: [
      ...input.events,
      assignmentEvent(input, input.incident.id, "EmployeeAssigned", options.at, options.actorUserId ?? null, {
        assignmentId: assignment.id,
        departmentId: assignment.departmentId,
        employeeId: options.employeeId,
        reason: options.reason ?? null,
      }),
    ],
    assignmentId: assignment.id,
  };
};
