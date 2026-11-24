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
import type { DomainEvent, IncidentAssignment } from "./types.ts";

export interface CloseOptions {
  readonly assignmentId: string;
  readonly at: string;
  readonly actorUserId?: string | null;
  readonly result?: string | null;
  readonly reason?: string | null;
}

const close = (
  input: AssignmentInput,
  options: CloseOptions,
  status: "completed" | "cancelled",
): AssignmentResult => {
  const assignment = input.assignments.find((item) => item.id === options.assignmentId);
  if (!assignment) return failed("назначение не найдено: " + options.assignmentId);
  if (assignment.incidentId !== input.incident.id) return failed("назначение относится к другому обращению");
  if (assignment.status !== "active") return failed("назначение уже закрыто: " + options.assignmentId);
  const closed: IncidentAssignment = {
    ...assignment,
    status,
    endedAt: options.at,
    endedByUserId: options.actorUserId ?? null,
    reason: options.reason ?? assignment.reason,
    result: options.result ?? assignment.result,
  };
  return {
    ok: true,
    assignments: input.assignments.map((item) => (item.id === assignment.id ? closed : item)),
    events: [
      ...input.events,
      assignmentEvent(
        input,
        input.incident.id,
        status === "completed" ? "DepartmentAssignmentCompleted" : "DepartmentAssignmentCancelled",
        options.at,
        options.actorUserId ?? null,
        {
          assignmentId: assignment.id,
          departmentId: assignment.departmentId,
          assignmentType: assignment.assignmentType,
          result: options.result ?? null,
          reason: options.reason ?? null,
        },
      ),
    ],
    assignmentId: assignment.id,
  };
};

export interface ReassignOptions extends AssignOptions {
  /** Причина переноса ответственности — попадает в событие и в закрытое назначение. */
  readonly reason: string;
}

/**
 * Переназначение ответственного подразделения — атомарная операция:
 * прежнее назначение закрывается, новое создаётся, история не перезаписывается.
 */
export const reassignAccountableDepartment = (input: AssignmentInput, options: ReassignOptions): AssignmentResult => {
  const check = checkAssignmentBase(input, options);
  if (!check.ok) return check;
  if (options.employeeId != null) {
    const employeeCheck = checkEmployeeAssignable(
      input.directory,
      options.employeeId,
      input.incident.organizationId,
      options.departmentId,
    );
    if (!employeeCheck.ok) return employeeCheck;
  }
  const previous = activeOf(input.assignments, input.incident.id, "accountable");
  const closedPrevious: readonly IncidentAssignment[] = previous.map((assignment) => ({
    ...assignment,
    status: "completed",
    endedAt: options.at,
    endedByUserId: options.actorUserId ?? null,
    result: assignment.result ?? "Передано подразделению " + options.departmentId,
    reason: options.reason,
  }));
  const closedIds = new Set(closedPrevious.map((assignment) => assignment.id));
  const withClosed = input.assignments.map((item) => (closedIds.has(item.id) ? closedPrevious.find((c) => c.id === item.id)! : item));
  const id = nextAssignmentId(withClosed);
  const assignment = newAssignment(input, id, "accountable", options);
  const changes: readonly IncidentAssignment[] = [...withClosed, assignment];
  const added: DomainEvent[] = [];
  const withAdded = (): AssignmentInput => ({ ...input, events: [...input.events, ...added] });
  if (previous.length > 0) {
    added.push(
      assignmentEvent(withAdded(), input.incident.id, "DepartmentAssignmentCompleted", options.at, options.actorUserId ?? null, {
        assignmentId: previous[0]!.id,
        departmentId: previous[0]!.departmentId,
        reason: options.reason,
      }),
    );
  }
  added.push(
    assignmentEvent(withAdded(), input.incident.id, "AccountableDepartmentChanged", options.at, options.actorUserId ?? null, {
      assignmentId: id,
      departmentId: options.departmentId,
      departmentName: departmentById(input.directory, options.departmentId)?.name ?? null,
      previousDepartmentId: previous[0]?.departmentId ?? null,
      reason: options.reason,
    }),
  );
  const events = [...input.events, ...added];
  return { ok: true, assignments: changes, events, assignmentId: id };
};

/** Сообщить о выполнении подразделением: закрывает назначение, но не обращение. */
export const completeDepartmentAssignment = (input: AssignmentInput, options: CloseOptions): AssignmentResult =>
  close(input, options, "completed");

/** Отменить назначение с причиной. */
export const cancelDepartmentAssignment = (input: AssignmentInput, options: CloseOptions): AssignmentResult =>
  close(input, options, "cancelled");
