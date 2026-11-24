import { expect, test } from "bun:test";
import { addParticipantDepartment, assignDepartment, assignEmployee } from "../src/core/org/assignments.ts";
import { cancelDepartmentAssignment, completeDepartmentAssignment, reassignAccountableDepartment } from "../src/core/org/assignment-changes.ts";
import { eventsOfType } from "../src/core/org/events.ts";
import { AT, DISPATCH, inputFor, GROUP_A, incident } from "./org-fixture.ts";

test("назначение ответственного подразделения и необязательность сотрудника", () => {
  const result = assignDepartment(inputFor(), { departmentId: "DEP-A2", at: AT, actorUserId: DISPATCH });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const assignment = result.assignments[0];
  expect(assignment?.employeeId).toBeNull();
  expect(assignment?.status).toBe("active");
  expect(assignment?.assignmentType).toBe("accountable");
  expect(eventsOfType(result.events, "DepartmentAssigned")).toHaveLength(1);
  expect(result.events[0]?.schemaVersion).toBe(1);
});

test("два активных ответственных назначения запрещены, переназначение — разрешено", () => {
  const first = assignDepartment(inputFor(), { departmentId: "DEP-A2", at: AT, actorUserId: DISPATCH });
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  const second = assignDepartment(inputFor(first.assignments, first.events), { departmentId: "DEP-A1", at: AT, actorUserId: DISPATCH });
  expect(second.ok).toBe(false);
  if (second.ok) return;
  expect(second.error).toContain("переназначение");

  const moved = reassignAccountableDepartment(inputFor(first.assignments, first.events), {
    departmentId: "DEP-A1",
    at: "2026-01-06T10:00:00.000Z",
    actorUserId: DISPATCH,
    reason: "передача ответственности",
  });
  expect(moved.ok).toBe(true);
  if (!moved.ok) return;
  const active = moved.assignments.filter((item) => item.assignmentType === "accountable" && item.status === "active");
  const closed = moved.assignments.filter((item) => item.assignmentType === "accountable" && item.status === "completed");
  expect(active).toHaveLength(1);
  expect(active[0]?.departmentId).toBe("DEP-A1");
  // История не перезаписана: прежнее назначение сохранилось и получило дату окончания.
  expect(closed).toHaveLength(1);
  expect(closed[0]?.departmentId).toBe("DEP-A2");
  expect(closed[0]?.endedAt).toBe("2026-01-06T10:00:00.000Z");
  expect(closed[0]?.endedByUserId).toBe(DISPATCH);
  expect(eventsOfType(moved.events, "AccountableDepartmentChanged")).toHaveLength(1);
});

test("параллельные подразделения-участники допустимы, дубликат запрещён", () => {
  const accountable = assignDepartment(inputFor(), { departmentId: "DEP-A2", at: AT, actorUserId: DISPATCH });
  if (!accountable.ok) throw new Error("фикстура: " + accountable.error);
  const one = addParticipantDepartment(inputFor(accountable.assignments, accountable.events), { departmentId: "DEP-A1", at: AT, actorUserId: DISPATCH });
  expect(one.ok).toBe(true);
  if (!one.ok) return;
  const two = addParticipantDepartment(inputFor(one.assignments, one.events), { departmentId: "DEP-A2", at: AT, actorUserId: DISPATCH });
  // DEP-A2 занято ответственным назначением, но как участник это другое назначение — допустимо.
  expect(two.ok).toBe(true);
  if (!two.ok) return;
  const participants = two.assignments.filter((item) => item.assignmentType === "participant" && item.status === "active");
  expect(participants).toHaveLength(2);
  const duplicate = addParticipantDepartment(inputFor(two.assignments, two.events), { departmentId: "DEP-A1", at: AT, actorUserId: DISPATCH });
  expect(duplicate.ok).toBe(false);
});

test("сотрудник назначается позднее, внутри назначения подразделения", () => {
  const created = assignDepartment(inputFor(), { departmentId: "DEP-A2", at: AT, actorUserId: DISPATCH });
  if (!created.ok) throw new Error("фикстура: " + created.error);
  const assigned = assignEmployee(inputFor(created.assignments, created.events), {
    assignmentId: created.assignmentId,
    employeeId: "EMP-A1",
    at: "2026-01-05T12:00:00.000Z",
    actorUserId: DISPATCH,
  });
  expect(assigned.ok).toBe(true);
  if (!assigned.ok) return;
  expect(assigned.assignments[0]?.employeeId).toBe("EMP-A1");
  expect(eventsOfType(assigned.events, "EmployeeAssigned")).toHaveLength(1);
  // Сотрудник другого подразделения и деактивированный — отказ.
  const wrong = assignEmployee(inputFor(created.assignments, created.events), { assignmentId: created.assignmentId, employeeId: "EMP-A2", at: AT, actorUserId: DISPATCH });
  expect(wrong.ok).toBe(false);
  const inactive = assignEmployee(inputFor(created.assignments, created.events), { assignmentId: created.assignmentId, employeeId: "EMP-A3", at: AT, actorUserId: DISPATCH });
  expect(inactive.ok).toBe(false);
});

test("нельзя назначить деактивированное или чужое подразделение", () => {
  expect(assignDepartment(inputFor(), { departmentId: "DEP-A3", at: AT, actorUserId: DISPATCH }).ok).toBe(false);
  expect(assignDepartment(inputFor(), { departmentId: "DEP-B1", at: AT, actorUserId: DISPATCH }).ok).toBe(false);
  const foreign = inputFor([], [], { id: "З-002", organizationId: "ORG-B" });
  expect(assignDepartment(foreign, { departmentId: "DEP-B1", at: AT, actorUserId: DISPATCH }).ok).toBe(true);
  expect(assignDepartment(foreign, { departmentId: "DEP-A2", at: AT, actorUserId: DISPATCH }).ok).toBe(false);
});

test("завершение и отмена назначения закрывают его один раз", () => {
  const created = assignDepartment(inputFor(), { departmentId: "DEP-A2", at: AT, actorUserId: DISPATCH });
  if (!created.ok) throw new Error("фикстура: " + created.error);
  const done = completeDepartmentAssignment(inputFor(created.assignments, created.events), {
    assignmentId: created.assignmentId,
    at: "2026-01-07T10:00:00.000Z",
    actorUserId: DISPATCH,
    result: "работы выполнены",
  });
  expect(done.ok).toBe(true);
  if (!done.ok) return;
  expect(done.assignments[0]?.status).toBe("completed");
  expect(done.assignments[0]?.result).toBe("работы выполнены");
  expect(eventsOfType(done.events, "DepartmentAssignmentCompleted")).toHaveLength(1);
  const again = completeDepartmentAssignment(inputFor(done.assignments, done.events), { assignmentId: created.assignmentId, at: AT, actorUserId: DISPATCH });
  expect(again.ok).toBe(false);
  const cancel = cancelDepartmentAssignment(inputFor(created.assignments, created.events), {
    assignmentId: created.assignmentId,
    at: AT,
    actorUserId: DISPATCH,
    reason: "отказ жителя",
  });
  expect(cancel.ok).toBe(true);
  if (!cancel.ok) return;
  expect(cancel.assignments[0]?.status).toBe("cancelled");
  expect(cancel.assignments[0]?.reason).toBe("отказ жителя");
  expect(eventsOfType(cancel.events, "DepartmentAssignmentCancelled")).toHaveLength(1);
  expect(incident.organizationId).toBe(GROUP_A);
});

test("события назначений только добавляются и нумеруются последовательно", () => {
  const first = assignDepartment(inputFor(), { departmentId: "DEP-A2", at: AT, actorUserId: DISPATCH });
  if (!first.ok) throw new Error("фикстура: " + first.error);
  const second = addParticipantDepartment(inputFor(first.assignments, first.events), { departmentId: "DEP-A1", at: AT, actorUserId: DISPATCH });
  if (!second.ok) throw new Error("фикстура: " + second.error);
  expect(second.events).toHaveLength(2);
  expect(second.events[0]?.eventType).toBe("DepartmentAssigned");
  expect(second.events[1]?.eventType).toBe("ParticipantDepartmentAdded");
  expect(second.events.map((event) => event.id)).toEqual(["EV-0001", "EV-0002"]);
  expect(second.events.every((event) => event.organizationId === GROUP_A)).toBe(true);
});
