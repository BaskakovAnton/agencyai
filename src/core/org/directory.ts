import type { Department, Employee, OrgDirectory, Permission, UserMembership } from "./types.ts";

/** Результат проверки: без исключений, в функциональном стиле проекта. */
export interface DomainFailure {
  readonly ok: false;
  readonly error: string;
}
export interface Accepted {
  readonly ok: true;
}
export type Checked = Accepted | DomainFailure;

export const accepted = (): Accepted => ({ ok: true });
export const failed = (error: string): DomainFailure => ({ ok: false, error });

export const organizationById = (directory: OrgDirectory, id: string) =>
  directory.organizations.find((org) => org.id === id);

export const departmentById = (directory: OrgDirectory, id: string): Department | undefined =>
  directory.departments.find((department) => department.id === id);

export const employeeById = (directory: OrgDirectory, id: string): Employee | undefined =>
  directory.employees.find((employee) => employee.id === id);

/** Все подразделения организации, включая деактивированные. */
export const departmentsOf = (directory: OrgDirectory, organizationId: string): readonly Department[] =>
  directory.departments.filter((department) => department.organizationId === organizationId);

/** Цепочка родителей от подразделения к корню. */
export const ancestorsOf = (directory: OrgDirectory, departmentId: string): readonly Department[] => {
  const chain: Department[] = [];
  let current = departmentById(directory, departmentId);
  while (current?.parentId) {
    const parent = departmentById(directory, current.parentId);
    if (!parent) break;
    chain.push(parent);
    current = parent;
  }
  return chain;
};

export const isDepartmentActive = (directory: OrgDirectory, departmentId: string): boolean => {
  const department = departmentById(directory, departmentId);
  if (!department || !department.active) return false;
  // Деактивация родителя закрывает ветку: назначить в неактивную ветку нельзя.
  return ancestorsOf(directory, departmentId).every((parent) => parent.active);
};

export const membershipsOf = (directory: OrgDirectory, userId: string, organizationId: string): readonly UserMembership[] =>
  directory.memberships.filter((membership) => membership.userId === userId && membership.organizationId === organizationId);

/** Полномочия пользователя — объединение по всем членствам в этой организации. */
export const permissionsOf = (directory: OrgDirectory, userId: string, organizationId: string): readonly Permission[] => {
  const seen = new Set<Permission>();
  for (const membership of membershipsOf(directory, userId, organizationId)) {
    for (const permission of membership.permissions) seen.add(permission);
  }
  return [...seen];
};

export const hasPermission = (
  directory: OrgDirectory,
  userId: string | null,
  organizationId: string,
  permission: Permission,
): boolean => userId !== null && permissionsOf(directory, userId, organizationId).includes(permission);

/** Обращение принадлежит ровно одной организации: связи между организациями запрещены. */
export const checkIncidentOrganization = (incidentOrganizationId: string, organizationId: string): Checked =>
  incidentOrganizationId === organizationId
    ? accepted()
    : failed("обращение принадлежит другой организации: " + incidentOrganizationId);

/** Подразделение существует, активно и принадлежит той же организации. */
export const checkDepartmentAssignable = (
  directory: OrgDirectory,
  departmentId: string,
  organizationId: string,
): Checked => {
  const department = departmentById(directory, departmentId);
  if (!department) return failed("подразделение не найдено: " + departmentId);
  if (department.organizationId !== organizationId) return failed("подразделение другой организации: " + departmentId);
  if (!isDepartmentActive(directory, departmentId)) return failed("подразделение деактивировано: " + departmentId);
  return accepted();
};

/** Сотрудник существует, активен, состоит в той же организации и в том же подразделении назначения. */
export const checkEmployeeAssignable = (
  directory: OrgDirectory,
  employeeId: string,
  organizationId: string,
  departmentId: string,
): Checked => {
  const employee = employeeById(directory, employeeId);
  if (!employee) return failed("сотрудник не найден: " + employeeId);
  if (employee.organizationId !== organizationId) return failed("сотрудник другой организации: " + employeeId);
  if (!employee.active) return failed("сотрудник деактивирован: " + employeeId);
  if (employee.departmentId !== departmentId) return failed("сотрудник не состоит в подразделении " + departmentId);
  return accepted();
};
