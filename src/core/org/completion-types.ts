/** Типы и проверки сценария завершения обращения (UX2-05). Операции — в completion.ts. */
import { failed, hasPermission, organizationById, type DomainFailure } from "./directory.ts";
import type { DomainEvent, IncidentAssignment, IncidentStatus, OrgDirectory, Permission } from "./types.ts";

/** Запись журнала проверки: только добавляется, прежние решения сохраняются. */
export interface ReviewRecord {
  readonly type: "submitted" | "approved" | "rejected" | "reopened";
  readonly at: string;
  readonly byUserId: string | null;
  readonly reason: string | null;
  /** Ответственное подразделение на момент решения — фиксируется отдельно от текущих назначений. */
  readonly accountableDepartmentId: string | null;
}

export interface IncidentLifecycle {
  readonly incidentId: string;
  readonly organizationId: string;
  readonly status: IncidentStatus;
  readonly records: readonly ReviewRecord[];
}

export interface CompletionInput {
  readonly directory: OrgDirectory;
  readonly assignments: readonly IncidentAssignment[];
  readonly lifecycle: IncidentLifecycle;
  /** Накопленная история событий: из неё берутся последовательные id. */
  readonly events: readonly DomainEvent[];
}

export interface CompletionOutcome {
  readonly ok: true;
  readonly lifecycle: IncidentLifecycle;
  readonly assignments: readonly IncidentAssignment[];
  readonly events: readonly DomainEvent[];
  readonly added: readonly DomainEvent[];
}
export type CompletionResult = CompletionOutcome | DomainFailure;

export interface ActorOptions {
  readonly at: string;
  readonly actorUserId: string;
  readonly reason?: string | null;
  readonly result?: string | null;
}

export const canComplete = (directory: OrgDirectory, userId: string, organizationId: string): boolean =>
  hasPermission(directory, userId, organizationId, "incident.complete");

export const canReopen = (directory: OrgDirectory, userId: string, organizationId: string): boolean =>
  hasPermission(directory, userId, organizationId, "incident.reopen");

/** Активное ответственное подразделение обращения. */
export const accountableOf = (
  assignments: readonly IncidentAssignment[],
  incidentId: string,
): IncidentAssignment | undefined =>
  assignments.find(
    (assignment) =>
      assignment.incidentId === incidentId && assignment.status === "active" && assignment.assignmentType === "accountable",
  );

export const activeAssignmentsOf = (
  assignments: readonly IncidentAssignment[],
  incidentId: string,
): readonly IncidentAssignment[] =>
  assignments.filter((item) => item.incidentId === incidentId && item.status === "active");

/** Организация должна существовать в справочнике. */
export const guardOrganization = (input: CompletionInput): DomainFailure | null =>
  organizationById(input.directory, input.lifecycle.organizationId)
    ? null
    : failed("организация не найдена: " + input.lifecycle.organizationId);

export const requirePermission = (
  input: CompletionInput,
  userId: string,
  permission: Permission,
): DomainFailure | null =>
  hasPermission(input.directory, userId, input.lifecycle.organizationId, permission)
    ? null
    : failed("нет полномочия " + permission + " в организации " + input.lifecycle.organizationId);

/** Кто последним сдавал работу: самоподтверждение запрещено. */
export const lastSubmitter = (records: readonly ReviewRecord[]): string | null => {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index]!;
    if (record.type === "submitted") return record.byUserId;
  }
  return null;
};

/** Новое состояние жизненного цикла с добавленной записью журнала. */
export const withRecord = (
  input: CompletionInput,
  status: IncidentStatus,
  record: ReviewRecord,
  assignments?: readonly IncidentAssignment[],
): { readonly lifecycle: IncidentLifecycle; readonly assignments: readonly IncidentAssignment[] } => ({
  lifecycle: { ...input.lifecycle, status, records: [...input.lifecycle.records, record] },
  assignments: assignments ?? input.assignments,
});
