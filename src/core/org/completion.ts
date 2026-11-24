/**
 * Операции сценария завершения (UX2-05): сообщение о выполнении,
 * подтверждение контролёром, отказ и повторное открытие. Права проверяются здесь, не в UI.
 */
import { failed } from "./directory.ts";
import { activeAssignmentsOf, accountableOf, guardOrganization, lastSubmitter, requirePermission, withRecord, type ActorOptions, type CompletionInput, type CompletionResult, type ReviewRecord } from "./completion-types.ts";
import { makeEvent, nextEventId } from "./events.ts";
import type { DomainEvent, DomainEventType, EntityType, IncidentAssignment } from "./types.ts";

export {
  accountableOf,
  activeAssignmentsOf,
  canComplete,
  canReopen,
  lastSubmitter,
} from "./completion-types.ts";
export type {
  ActorOptions,
  CompletionInput,
  CompletionOutcome,
  CompletionResult,
  IncidentLifecycle,
  ReviewRecord,
} from "./completion-types.ts";

/** Накопитель событий операции: id последовательные, порядок сохраняется. */
const emitterFor = (input: CompletionInput) => {
  const added: DomainEvent[] = [];
  const add = (
    eventType: DomainEventType,
    at: string,
    actorUserId: string | null,
    payload: Readonly<Record<string, string | number | null>>,
    entityId: string = input.lifecycle.incidentId,
    entityType: EntityType = "incident",
  ): void => {
    added.push(
      makeEvent({
        id: nextEventId([...input.events, ...added]),
        organizationId: input.lifecycle.organizationId,
        entityId,
        entityType,
        eventType,
        occurredAt: at,
        actorUserId,
        payload,
      }),
    );
  };
  return { add, added };
};

const finish = (
  input: CompletionInput,
  status: "pending_review" | "completed" | "active" | "reopened",
  record: ReviewRecord,
  emitter: { readonly added: readonly DomainEvent[] },
  assignments?: readonly IncidentAssignment[],
): CompletionResult => ({
  ok: true,
  ...withRecord(input, status, record, assignments),
  events: [...input.events, ...emitter.added],
  added: emitter.added,
});

/** Исполнитель сообщает о выполнении: обращение уходит на проверку, но ещё не завершено. */
export const submitExecution = (input: CompletionInput, options: ActorOptions): CompletionResult => {
  const orgError = guardOrganization(input);
  if (orgError) return orgError;
  const { status } = input.lifecycle;
  if (status !== "active" && status !== "reopened") return failed("нельзя сообщить о выполнении в состоянии " + status);
  const hasExecutor = activeAssignmentsOf(input.assignments, input.lifecycle.incidentId).some(
    (assignment) => assignment.employeeId !== null,
  );
  const mayParticipate = requirePermission(input, options.actorUserId, "incident.participate") === null;
  if (!hasExecutor && !mayParticipate) return failed("сообщить о выполнении может исполнитель обращения");
  const accountableDepartmentId = accountableOf(input.assignments, input.lifecycle.incidentId)?.departmentId ?? null;
  const emitter = emitterFor(input);
  emitter.add("ExecutionSubmitted", options.at, options.actorUserId, { reason: options.reason ?? null, accountableDepartmentId });
  return finish(
    input,
    "pending_review",
    { type: "submitted", at: options.at, byUserId: options.actorUserId, reason: options.reason ?? null, accountableDepartmentId },
    emitter,
  );
};

/** Подтверждение завершения: право incident.complete и запрет подтверждать свою же работу. */
export const approveCompletion = (input: CompletionInput, options: ActorOptions): CompletionResult => {
  const orgError = guardOrganization(input);
  if (orgError) return orgError;
  if (input.lifecycle.status !== "pending_review") {
    return failed("подтвердить можно только обращение на проверке, текущее состояние: " + input.lifecycle.status);
  }
  const permissionError = requirePermission(input, options.actorUserId, "incident.complete");
  if (permissionError) return permissionError;
  if (lastSubmitter(input.lifecycle.records) === options.actorUserId) {
    return failed("исполнитель не может подтвердить завершение собственной работы");
  }
  const accountable = accountableOf(input.assignments, input.lifecycle.incidentId);
  if (!accountable) return failed("у обращения нет активного ответственного подразделения");
  const closed: readonly IncidentAssignment[] = activeAssignmentsOf(input.assignments, input.lifecycle.incidentId).map(
    (assignment) => ({
      ...assignment,
      status: "completed" as const,
      endedAt: options.at,
      endedByUserId: options.actorUserId,
      result: options.result ?? assignment.result ?? "Завершение подтверждено",
    }),
  );
  const closedIds = new Set(closed.map((assignment) => assignment.id));
  const emitter = emitterFor(input);
  emitter.add("CompletionApproved", options.at, options.actorUserId, {
    accountableDepartmentId: accountable.departmentId,
    result: options.result ?? null,
  });
  for (const assignment of closed) {
    emitter.add(
      "DepartmentAssignmentCompleted",
      options.at,
      options.actorUserId,
      { assignmentId: assignment.id, departmentId: assignment.departmentId },
      input.lifecycle.incidentId,
      "assignment",
    );
  }
  emitter.add("StatusChanged", options.at, options.actorUserId, { from: input.lifecycle.status, to: "completed" });
  const assignments = input.assignments.map((item) =>
    closedIds.has(item.id) ? closed.find((candidate) => candidate.id === item.id)! : item,
  );
  return finish(
    input,
    "completed",
    { type: "approved", at: options.at, byUserId: options.actorUserId, reason: options.reason ?? null, accountableDepartmentId: accountable.departmentId },
    emitter,
    assignments,
  );
};

/** Отказ в подтверждении: причина сохраняется, обращение возвращается в работу. */
export const rejectCompletion = (input: CompletionInput, options: ActorOptions): CompletionResult => {
  const orgError = guardOrganization(input);
  if (orgError) return orgError;
  if (input.lifecycle.status !== "pending_review") {
    return failed("отклонить можно только обращение на проверке, текущее состояние: " + input.lifecycle.status);
  }
  const permissionError = requirePermission(input, options.actorUserId, "incident.complete");
  if (permissionError) return permissionError;
  const reason = (options.reason ?? "").trim();
  if (reason === "") return failed("отказ в подтверждении требует причины");
  const emitter = emitterFor(input);
  emitter.add("CompletionRejected", options.at, options.actorUserId, { reason });
  emitter.add("StatusChanged", options.at, options.actorUserId, { from: "pending_review", to: "active" });
  const accountableDepartmentId = accountableOf(input.assignments, input.lifecycle.incidentId)?.departmentId ?? null;
  return finish(
    input,
    "active",
    { type: "rejected", at: options.at, byUserId: options.actorUserId, reason, accountableDepartmentId },
    emitter,
  );
};

/** Повторное открытие: прежнее подтверждение сохраняется в журнале. */
export const reopenIncident = (input: CompletionInput, options: ActorOptions): CompletionResult => {
  const orgError = guardOrganization(input);
  if (orgError) return orgError;
  if (input.lifecycle.status !== "completed") {
    return failed("переоткрыть можно только завершённое обращение, текущее состояние: " + input.lifecycle.status);
  }
  const permissionError = requirePermission(input, options.actorUserId, "incident.reopen");
  if (permissionError) return permissionError;
  const reason = (options.reason ?? "").trim();
  if (reason === "") return failed("переоткрытие требует причины");
  const emitter = emitterFor(input);
  emitter.add("IncidentReopened", options.at, options.actorUserId, { reason });
  emitter.add("StatusChanged", options.at, options.actorUserId, { from: "completed", to: "reopened" });
  const accountableDepartmentId = accountableOf(input.assignments, input.lifecycle.incidentId)?.departmentId ?? null;
  return finish(
    input,
    "reopened",
    { type: "reopened", at: options.at, byUserId: options.actorUserId, reason, accountableDepartmentId },
    emitter,
  );
};
