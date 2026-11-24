import {
  accepted,
  checkDepartmentAssignable,
  checkEmployeeAssignable,
  checkIncidentOrganization,
  failed,
  organizationById,
  type Checked,
  type DomainFailure,
} from "./directory.ts";
import { makeEvent, nextEventId } from "./events.ts";
import type {
  AssignmentType,
  DomainEvent,
  DomainEventType,
  IncidentAssignment,
  IncidentRef,
  OrgDirectory,
} from "./types.ts";

/** Общий вход доменных операций над назначениями. */
export interface AssignmentInput {
  readonly directory: OrgDirectory;
  readonly assignments: readonly IncidentAssignment[];
  readonly events: readonly DomainEvent[];
  readonly incident: IncidentRef;
}

export interface AssignOptions {
  readonly departmentId: string;
  readonly employeeId?: string | null;
  readonly at: string;
  readonly actorUserId?: string | null;
  readonly reason?: string | null;
}

export interface AssignmentOutcome {
  readonly ok: true;
  readonly assignments: readonly IncidentAssignment[];
  readonly events: readonly DomainEvent[];
  readonly assignmentId: string;
}
export type AssignmentResult = AssignmentOutcome | DomainFailure;

export const activeOf = (
  assignments: readonly IncidentAssignment[],
  incidentId: string,
  type?: AssignmentType,
): readonly IncidentAssignment[] =>
  assignments.filter(
    (assignment) =>
      assignment.incidentId === incidentId &&
      assignment.status === "active" &&
      (type === undefined || assignment.assignmentType === type),
  );

/** Обращение существует в справочнике, подразделение и сотрудник — из той же организации. */
export const checkAssignmentBase = (input: AssignmentInput, options: AssignOptions): Checked => {
  if (!organizationById(input.directory, input.incident.organizationId)) {
    return failed("организация не найдена: " + input.incident.organizationId);
  }
  const incidentCheck = checkIncidentOrganization(input.incident.organizationId, input.incident.organizationId);
  if (!incidentCheck.ok) return incidentCheck;
  const departmentCheck = checkDepartmentAssignable(input.directory, options.departmentId, input.incident.organizationId);
  if (!departmentCheck.ok) return departmentCheck;
  if (options.employeeId != null) {
    return checkEmployeeAssignable(input.directory, options.employeeId, input.incident.organizationId, options.departmentId);
  }
  return accepted();
};

export const newAssignment = (
  input: AssignmentInput,
  id: string,
  type: AssignmentType,
  options: AssignOptions,
): IncidentAssignment => ({
  id,
  organizationId: input.incident.organizationId,
  incidentId: input.incident.id,
  departmentId: options.departmentId,
  employeeId: options.employeeId ?? null,
  assignmentType: type,
  status: "active",
  assignedAt: options.at,
  assignedByUserId: options.actorUserId ?? null,
  endedAt: null,
  endedByUserId: null,
  reason: options.reason ?? null,
  result: null,
});

/** Событие на изменение набора назначений. */
export const assignmentEvent = (
  input: AssignmentInput,
  entityId: string,
  eventType: DomainEventType,
  at: string,
  actorUserId: string | null,
  payload: Readonly<Record<string, string | number | null>>,
): DomainEvent =>
  makeEvent({
    id: nextEventId(input.events),
    organizationId: input.incident.organizationId,
    entityId,
    entityType: "assignment",
    eventType,
    occurredAt: at,
    actorUserId,
    payload,
  });
