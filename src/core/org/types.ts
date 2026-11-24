/**
 * Доменные типы организации, подразделений, сотрудников и назначений (UX-2).
 * Модуль аддитивный: не меняет src/types.ts и не ломает существующие экраны и Story Generator.
 */

/** Полномочия пользователя в рамках организации. */
export type Permission = "incident.assign" | "incident.complete" | "incident.reopen" | "incident.participate";

/** Тип участия подразделения в обращении. */
export type AssignmentType = "accountable" | "participant";

/** Жизненный цикл назначения. Исторические записи не перезаписываются. */
export type AssignmentStatus = "active" | "completed" | "cancelled";

/** Состояние обращения в части завершения (UX2-05). */
export type IncidentStatus = "active" | "pending_review" | "completed" | "reopened";

/** Сущность, к которой относится событие. */
export type EntityType = "incident" | "assignment" | "department" | "employee";

/** Типы доменных событий (UX2-04). */
export type DomainEventType =
  | "IncidentCreated"
  | "DepartmentAssigned"
  | "ParticipantDepartmentAdded"
  | "EmployeeAssigned"
  | "AccountableDepartmentChanged"
  | "DepartmentAssignmentCompleted"
  | "DepartmentAssignmentCancelled"
  | "StatusChanged"
  | "PriorityChanged"
  | "DeadlineChanged"
  | "ExecutionSubmitted"
  | "CompletionApproved"
  | "CompletionRejected"
  | "IncidentReopened";

/** Версия схемы события: растёт при несовместимом изменении payload. */
export const EVENT_SCHEMA_VERSION = 1;

export interface Organization {
  readonly id: string;
  readonly name: string;
  /** Деактивация не удаляет историю: сущность остаётся в справочнике. */
  readonly active: boolean;
  readonly createdAt: string;
}

export interface Department {
  readonly id: string;
  readonly organizationId: string;
  /** Родительское подразделение; null — корневое. */
  readonly parentId: string | null;
  readonly name: string;
  readonly active: boolean;
  readonly createdAt: string;
}

/** Сотрудник отделён от пользователя: он не входит в систему сам по себе. */
export interface Employee {
  readonly id: string;
  readonly organizationId: string;
  readonly departmentId: string;
  readonly fullName: string;
  readonly position: string;
  readonly active: boolean;
}

export interface User {
  readonly id: string;
  readonly displayName: string;
  readonly active: boolean;
}

/** Членство пользователя в организации: связывает User, организацию и (необязательно) Employee. */
export interface UserMembership {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly employeeId: string | null;
  readonly permissions: readonly Permission[];
}

/** Назначение подразделения на обращение. Основное ответственное — максимум одно активное. */
export interface IncidentAssignment {
  readonly id: string;
  readonly organizationId: string;
  readonly incidentId: string;
  readonly departmentId: string;
  readonly employeeId: string | null;
  readonly assignmentType: AssignmentType;
  readonly status: AssignmentStatus;
  readonly assignedAt: string;
  readonly assignedByUserId: string | null;
  readonly endedAt: string | null;
  readonly endedByUserId: string | null;
  readonly reason: string | null;
  readonly result: string | null;
}

/** Append-only событие домена. */
export interface DomainEvent {
  readonly id: string;
  readonly organizationId: string;
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly eventType: DomainEventType;
  readonly occurredAt: string;
  readonly actorUserId: string | null;
  readonly payload: Readonly<Record<string, string | number | null>>;
  readonly schemaVersion: number;
}

/** Справочник организации: всё, что нужно для проверки ссылок между сущностями. */
export interface OrgDirectory {
  readonly organizations: readonly Organization[];
  readonly departments: readonly Department[];
  readonly employees: readonly Employee[];
  readonly users: readonly User[];
  readonly memberships: readonly UserMembership[];
}

/** Ссылка на обращение в терминах организации (id + владелец). */
export interface IncidentRef {
  readonly id: string;
  readonly organizationId: string;
}
