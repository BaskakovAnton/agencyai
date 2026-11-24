/**
 * Демонстрационная организация UX-2: подразделения, сотрудники, пользователи.
 * Все сущности явно тестовые (в названиях — «демо»), это не данные реальной организации.
 */
import type {
  Department,
  Employee,
  Organization,
  OrgDirectory,
  User,
  UserMembership,
} from "../core/org/types.ts";

export const DEMO_ORGANIZATION_ID = "ORG-DEMO";
const CREATED_AT = "2025-12-01T09:00:00.000Z";

const department = (id: string, name: string, parentId: string | null, active = true): Department => ({
  id,
  organizationId: DEMO_ORGANIZATION_ID,
  parentId,
  name,
  active,
  createdAt: CREATED_AT,
});

export const DEMO_ORGANIZATION: Organization = {
  id: DEMO_ORGANIZATION_ID,
  name: "Демо-организация «Приёмная» (тестовые данные)",
  active: true,
  createdAt: CREATED_AT,
};

export const DEMO_DEPARTMENTS: readonly Department[] = [
  department("DEP-DISPATCH", "Диспетчерская служба (демо)", null),
  department("DEP-HOUSING", "ЖКХ и содержание (демо)", "DEP-DISPATCH"),
  department("DEP-ROADS", "Дорожная служба (демо)", "DEP-DISPATCH"),
  department("DEP-LIGHT", "Уличное освещение (демо)", "DEP-DISPATCH"),
  department("DEP-CONTROL", "Контроль исполнения (демо)", null),
  department("DEP-ARCHIVE", "Архив (деактивирован, демо)", "DEP-DISPATCH", false),
];

const employee = (id: string, departmentId: string, fullName: string, position: string): Employee => ({
  id,
  organizationId: DEMO_ORGANIZATION_ID,
  departmentId,
  fullName,
  position,
  active: true,
});

export const DEMO_EMPLOYEES: readonly Employee[] = [
  employee("EMP-101", "DEP-HOUSING", "Демо-сотрудник А.", "Мастер участка"),
  employee("EMP-102", "DEP-HOUSING", "Демо-сотрудник Б.", "Слесарь-сантехник"),
  employee("EMP-201", "DEP-ROADS", "Демо-сотрудник В.", "Дорожный рабочий"),
  employee("EMP-301", "DEP-LIGHT", "Демо-сотрудник Г.", "Электромонтёр"),
  employee("EMP-401", "DEP-DISPATCH", "Демо-диспетчер", "Диспетчер"),
  employee("EMP-501", "DEP-CONTROL", "Демо-контролёр", "Контролёр исполнения"),
];

export const DEMO_USERS: readonly User[] = [
  { id: "USR-DISPATCHER", displayName: "Демо-диспетчер (пользователь)", active: true },
  { id: "USR-EXECUTOR", displayName: "Демо-исполнитель (пользователь)", active: true },
  { id: "USR-CONTROL", displayName: "Демо-контролёр (пользователь)", active: true },
];

export const DEMO_MEMBERSHIPS: readonly UserMembership[] = [
  { id: "MS-1", userId: "USR-DISPATCHER", organizationId: DEMO_ORGANIZATION_ID, employeeId: "EMP-401", permissions: ["incident.assign", "incident.participate"] },
  { id: "MS-2", userId: "USR-EXECUTOR", organizationId: DEMO_ORGANIZATION_ID, employeeId: "EMP-101", permissions: ["incident.participate"] },
  { id: "MS-3", userId: "USR-CONTROL", organizationId: DEMO_ORGANIZATION_ID, employeeId: "EMP-501", permissions: ["incident.complete", "incident.reopen", "incident.assign"] },
];

export const ORG_DIRECTORY: OrgDirectory = {
  organizations: [DEMO_ORGANIZATION],
  departments: DEMO_DEPARTMENTS,
  employees: DEMO_EMPLOYEES,
  users: DEMO_USERS,
  memberships: DEMO_MEMBERSHIPS,
};

/** Демо-подразделение по категории обращения: детерминированное сопоставление. */
export const departmentForCategory = (category: string): string => {
  switch (category) {
    case "road":
      return "DEP-ROADS";
    case "lighting":
    case "electricity":
      return "DEP-LIGHT";
    case "emergency":
    case "water":
    case "heat":
    case "elevator":
    case "garbage":
      return "DEP-HOUSING";
    default:
      return "DEP-DISPATCH";
  }
};

/** Подразделение-участник для демонстрации параллельной работы. */
export const participantForCategory = (category: string): string =>
  category === "road" ? "DEP-LIGHT" : category === "lighting" ? "DEP-ROADS" : "DEP-CONTROL";

/** Первый активный сотрудник подразделения (или null — назначение без сотрудника). */
export const employeeOfDepartment = (departmentId: string, index: number): string | null => {
  const staff = DEMO_EMPLOYEES.filter((item) => item.departmentId === departmentId);
  if (staff.length === 0) return null;
  return staff[index % staff.length]!.id;
};
