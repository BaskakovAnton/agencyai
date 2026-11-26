/**
 * Связка доменной модели организации (UX-2/UX-3) с экранами (UX-4).
 * Чистые производные данные для представления: без DOM и без побочных эффектов.
 */
import { hasPermission } from "../core/org/directory.ts";
import type { IncidentStatus, OrgDirectory } from "../core/org/types.ts";
import type { OrgQuery } from "../core/org/repository.ts";
import { lifecycleStatusOn } from "../core/analytics/snapshot.ts";
import { lastSubmitter } from "../core/org/completion.ts";
import type { RoleId } from "../types.ts";

/** Демонстрационные пользователи: роль оператора → пользователь домена. */
export const ACTOR_BY_ROLE: Readonly<Record<RoleId, string | null>> = {
  resident: null,
  deputy: "USR-DISPATCHER",
  assistant: "USR-DISPATCHER",
  contractor: "USR-EXECUTOR",
  system: null,
  observer: "USR-CONTROL",
  auditor: "USR-CONTROL",
};

export const ORG_STATUS_TITLES: Readonly<Record<IncidentStatus, string>> = {
  active: "В работе",
  pending_review: "На проверке",
  completed: "Завершено",
  reopened: "Переоткрыто",
};

export interface DepartmentSlice {
  readonly departmentId: string;
  readonly name: string;
  readonly count: number;
}

export interface OrgParticipant {
  readonly departmentId: string;
  readonly name: string;
  readonly type: "accountable" | "participant";
  readonly employees: readonly string[];
}

export interface IncidentOrgSummary {
  readonly status: IncidentStatus;
  readonly statusTitle: string;
  readonly accountableName: string;
  readonly participants: readonly OrgParticipant[];
}

export interface OrgFacts {
  readonly departments: readonly DepartmentSlice[];
  readonly waitingForReview: number;
}

export interface OrgActions {
  readonly submit: boolean;
  readonly approve: boolean;
  readonly reject: boolean;
  readonly reopen: boolean;
}

const departmentName = (directory: OrgDirectory, departmentId: string): string =>
  directory.departments.find((department) => department.id === departmentId)?.name ?? "";

export const employeeNames = (directory: OrgDirectory, employeeId: string | null): readonly string[] => {
  if (employeeId === null) return [];
  const employee = directory.employees.find((item) => item.id === employeeId);
  return employee ? [employee.fullName + " (" + employee.position + ")"] : [];
};

/** Распределение обращений по ответственным подразделениям: счёт по активному ответственному. */
export const departmentDistribution = (org: OrgQuery, incidentIds: readonly string[]): readonly DepartmentSlice[] => {
  const counts = new Map<string, number>();
  for (const incidentId of incidentIds) {
    const accountable = org.accountableOf(incidentId);
    if (!accountable) continue;
    counts.set(accountable.departmentId, (counts.get(accountable.departmentId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([departmentId, count]) => ({ departmentId, name: departmentName(org.directory, departmentId), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
};

/**
 * Сводка по организации для обзора. Количество ожидающих подтверждения передаётся
 * вызывающим кодом из доменного Snapshot — исторический источник истины (DEC-03),
 * чтобы счётчик обзора и список `view=review` считались одним правилом.
 */
export const orgFactsFor = (org: OrgQuery, incidentIds: readonly string[], waitingForReview: number): OrgFacts => ({
  departments: departmentDistribution(org, incidentIds),
  waitingForReview,
});

/** Ответственное подразделение обращения (для колонки и факта карточки). */
export const incidentDepartmentName = (org: OrgQuery, incidentId: string): string => {
  const accountable = org.accountableOf(incidentId);
  return accountable ? departmentName(org.directory, accountable.departmentId) : "";
};

/**
 * Состав участников обращения: ответственное подразделение и участники с сотрудниками.
 * Если передана дата, статус берётся на неё — так карточка совпадает с аналитикой Dashboard.
 */
export const incidentOrgSummary = (org: OrgQuery, incidentId: string, day?: string): IncidentOrgSummary | null => {
  const lifecycle = org.lifecycleOf(incidentId);
  if (!lifecycle) return null;
  const participants: OrgParticipant[] = org.activeAssignmentsOf(incidentId).map((assignment) => ({
    departmentId: assignment.departmentId,
    name: departmentName(org.directory, assignment.departmentId),
    type: assignment.assignmentType,
    employees: employeeNames(org.directory, assignment.employeeId),
  }));
  const status = day === undefined ? lifecycle.status : lifecycleStatusOn(lifecycle, day);
  return {
    status,
    statusTitle: ORG_STATUS_TITLES[status],
    accountableName: participants.find((participant) => participant.type === "accountable")?.name ?? "",
    participants,
  };
};

/**
 * Доступные операции подтверждения для конкретного пользователя.
 * Правила те же, что и в домене: статус + полномочие + запрет самоподтверждения.
 */
export const availableOrgActions = (org: OrgQuery, incidentId: string, actorUserId: string | null): OrgActions => {
  const lifecycle = org.lifecycleOf(incidentId);
  if (!lifecycle) return { submit: false, approve: false, reject: false, reopen: false };
  const organizationId = lifecycle.organizationId;
  const canComplete = hasPermission(org.directory, actorUserId, organizationId, "incident.complete");
  const canReopen = hasPermission(org.directory, actorUserId, organizationId, "incident.reopen");
  const isExecutor = org.activeAssignmentsOf(incidentId).some((assignment) => assignment.employeeId !== null);
  const submitter = lastSubmitter(lifecycle.records);
  return {
    submit: (lifecycle.status === "active" || lifecycle.status === "reopened") && isExecutor,
    approve: lifecycle.status === "pending_review" && canComplete && submitter !== actorUserId,
    reject: lifecycle.status === "pending_review" && canComplete,
    reopen: lifecycle.status === "completed" && canReopen,
  };
};
