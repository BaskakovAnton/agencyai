/** Общая фикстура тестов UX-2: две организации, чтобы проверять запрет связей между ними. */
import type { Department, DomainEvent, Employee, IncidentAssignment, OrgDirectory, UserMembership } from "../src/core/org/types.ts";

export const GROUP_A = "ORG-A";
export const GROUP_B = "ORG-B";
export const DISPATCH = "USR-A1";
export const WORKER = "USR-A2";
export const CONTROL = "USR-A3";

const department = (id: string, organizationId: string, parentId: string | null, active = true): Department => ({
  id,
  organizationId,
  parentId,
  name: "Подразделение " + id,
  active,
  createdAt: "2025-12-01T09:00:00.000Z",
});

const employee = (id: string, organizationId: string, departmentId: string, active = true): Employee => ({
  id,
  organizationId,
  departmentId,
  fullName: "Сотрудник " + id,
  position: "специалист",
  active,
});

const membership = (
  id: string,
  userId: string,
  organizationId: string,
  employeeId: string | null,
  permissions: UserMembership["permissions"],
): UserMembership => ({ id, userId, organizationId, employeeId, permissions });

export const directory: OrgDirectory = {
  organizations: [
    { id: GROUP_A, name: "Организация A (тест)", active: true, createdAt: "2025-12-01T09:00:00.000Z" },
    { id: GROUP_B, name: "Организация B (тест)", active: true, createdAt: "2025-12-01T09:00:00.000Z" },
  ],
  departments: [
    department("DEP-A1", GROUP_A, null),
    department("DEP-A2", GROUP_A, "DEP-A1"),
    department("DEP-A3", GROUP_A, null, false),
    department("DEP-B1", GROUP_B, null),
  ],
  employees: [
    employee("EMP-A1", GROUP_A, "DEP-A2"),
    employee("EMP-A2", GROUP_A, "DEP-A1"),
    employee("EMP-A3", GROUP_A, "DEP-A2", false),
    employee("EMP-B1", GROUP_B, "DEP-B1"),
  ],
  users: [
    { id: DISPATCH, displayName: "Диспетчер (тест)", active: true },
    { id: WORKER, displayName: "Исполнитель (тест)", active: true },
    { id: CONTROL, displayName: "Контролёр (тест)", active: true },
  ],
  memberships: [
    membership("MS-A1", DISPATCH, GROUP_A, "EMP-A2", ["incident.assign", "incident.participate"]),
    membership("MS-A2", WORKER, GROUP_A, "EMP-A1", ["incident.participate"]),
    membership("MS-A3", CONTROL, GROUP_A, "EMP-A1", ["incident.complete", "incident.reopen"]),
  ],
};

export const incident = { id: "З-001", organizationId: GROUP_A };
export const foreignIncident = { id: "З-002", organizationId: GROUP_B };
export const AT = "2026-01-05T10:00:00.000Z";

/** Вход доменной операции с накоплением назначений и событий. */
export const inputFor = (
  assignments: readonly IncidentAssignment[] = [],
  events: readonly DomainEvent[] = [],
  incidentRef: { readonly id: string; readonly organizationId: string } = incident,
) => ({ directory, assignments, events, incident: incidentRef });
