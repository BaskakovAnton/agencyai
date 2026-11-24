import { expect, test } from "bun:test";
import { buildProcessGraph } from "../src/data/edges.ts";
import { DEMO_ORGANIZATION_ID, ORG_DIRECTORY } from "../src/data/org-demo.ts";
import { buildOrgStory } from "../src/core/org/demo-story.ts";

const graph = buildProcessGraph();
const first = buildOrgStory(graph, 7);
const second = buildOrgStory(graph, 7);

test("демонстрационная история детерминирована", () => {
  expect(second.assignments).toEqual(first.assignments);
  expect(second.events).toEqual(first.events);
  expect(second.lifecycles).toEqual(first.lifecycles);
  expect(first.assignments.length).toBeGreaterThan(30);
  expect(first.events.length).toBeGreaterThan(30);
});

test("сценарий содержит параллельные подразделения, без сотрудника, переназначения и все состояния", () => {
  const parallel = first.story.incidents.some((incident) => {
    const active = first.assignments.filter((item) => item.incidentId === incident.id && item.status === "active");
    return active.filter((item) => item.assignmentType === "participant").length >= 1 && active.some((item) => item.assignmentType === "accountable");
  });
  expect(parallel).toBe(true);
  expect(first.assignments.some((item) => item.employeeId === null)).toBe(true);
  expect(first.assignments.some((item) => item.employeeId !== null)).toBe(true);
  const reassigned = first.story.incidents.some(
    (incident) =>
      first.assignments.some((item) => item.incidentId === incident.id && item.assignmentType === "accountable" && item.status === "completed") &&
      first.assignments.some((item) => item.incidentId === incident.id && item.assignmentType === "accountable" && item.status === "active"),
  );
  expect(reassigned).toBe(true);
  const statuses = new Set(Object.values(first.lifecycles).map((lifecycle) => lifecycle.status));
  expect(statuses.has("active")).toBe(true);
  expect(statuses.has("pending_review")).toBe(true);
  expect(statuses.has("completed")).toBe(true);
  expect(statuses.has("reopened")).toBe(true);
});

test("все связи внутри одной организации и ссылки существуют", () => {
  const departmentIds = new Set(ORG_DIRECTORY.departments.map((department) => department.id));
  const employeeIds = new Set(ORG_DIRECTORY.employees.map((employee) => employee.id));
  for (const assignment of first.assignments) {
    expect(assignment.organizationId).toBe(DEMO_ORGANIZATION_ID);
    expect(departmentIds.has(assignment.departmentId)).toBe(true);
    if (assignment.employeeId !== null) expect(employeeIds.has(assignment.employeeId)).toBe(true);
  }
  expect(ORG_DIRECTORY.organizations).toHaveLength(1);
  expect(ORG_DIRECTORY.departments.some((department) => !department.active)).toBe(true);
});

test("демонстрационные данные помечены как тестовые, события валидны", () => {
  expect(ORG_DIRECTORY.organizations[0]?.name).toContain("тестовые данные");
  expect(ORG_DIRECTORY.departments.every((department) => department.name.includes("демо"))).toBe(true);
  const ids = new Set(first.events.map((event) => event.id));
  expect(ids.size).toBe(first.events.length);
  expect(first.events.every((event) => event.schemaVersion === 1)).toBe(true);
  expect(first.events.every((event) => event.organizationId === DEMO_ORGANIZATION_ID)).toBe(true);
});
