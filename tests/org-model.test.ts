import { expect, test } from "bun:test";
import {
  accepted,
  checkDepartmentAssignable,
  checkEmployeeAssignable,
  checkIncidentOrganization,
  departmentById,
  employeeById,
  hasPermission,
  isDepartmentActive,
  permissionsOf,
} from "../src/core/org/directory.ts";
import { CONTROL, directory, GROUP_A, GROUP_B, WORKER } from "./org-fixture.ts";

test("справочник находит подразделения и сотрудников", () => {
  expect(departmentById(directory, "DEP-A2")?.name).toBe("Подразделение DEP-A2");
  expect(employeeById(directory, "EMP-A1")?.departmentId).toBe("DEP-A2");
  expect(departmentById(directory, "НЕТ-ТАКОГО")).toBeUndefined();
});

test("активность подразделения учитывает деактивированного родителя", () => {
  expect(isDepartmentActive(directory, "DEP-A2")).toBe(true);
  expect(isDepartmentActive(directory, "DEP-A3")).toBe(false);
  expect(isDepartmentActive(directory, "НЕТ-ТАКОГО")).toBe(false);
});

test("подразделение можно назначить только из своей организации и активное", () => {
  expect(checkDepartmentAssignable(directory, "DEP-A2", GROUP_A).ok).toBe(true);
  expect(checkDepartmentAssignable(directory, "DEP-B1", GROUP_A).ok).toBe(false);
  expect(checkDepartmentAssignable(directory, "DEP-A3", GROUP_A).ok).toBe(false);
  expect(checkDepartmentAssignable(directory, "НЕТ-ТАКОГО", GROUP_A).ok).toBe(false);
});

test("сотрудник проверяется по организации, активности и подразделению", () => {
  expect(checkEmployeeAssignable(directory, "EMP-A1", GROUP_A, "DEP-A2").ok).toBe(true);
  expect(checkEmployeeAssignable(directory, "EMP-B1", GROUP_A, "DEP-B1").ok).toBe(false);
  expect(checkEmployeeAssignable(directory, "EMP-A3", GROUP_A, "DEP-A2").ok).toBe(false);
  expect(checkEmployeeAssignable(directory, "EMP-A2", GROUP_A, "DEP-A2").ok).toBe(false);
});

test("связи между разными организациями запрещены", () => {
  expect(checkIncidentOrganization(GROUP_A, GROUP_A).ok).toBe(true);
  expect(checkIncidentOrganization(GROUP_B, GROUP_A).ok).toBe(false);
  expect(accepted().ok).toBe(true);
});

test("полномочия собираются по членствам и проверяются", () => {
  expect(permissionsOf(directory, CONTROL, GROUP_A)).toEqual(["incident.complete", "incident.reopen"]);
  expect(permissionsOf(directory, WORKER, GROUP_A)).toEqual(["incident.participate"]);
  expect(hasPermission(directory, CONTROL, GROUP_A, "incident.complete")).toBe(true);
  expect(hasPermission(directory, WORKER, GROUP_A, "incident.complete")).toBe(false);
  expect(hasPermission(directory, null, GROUP_A, "incident.complete")).toBe(false);
  expect(hasPermission(directory, CONTROL, GROUP_B, "incident.complete")).toBe(false);
});
