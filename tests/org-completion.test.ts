import { expect, test } from "bun:test";
import { assignDepartment, assignEmployee } from "../src/core/org/assignments.ts";
import { approveCompletion, canComplete, canReopen, rejectCompletion, reopenIncident, submitExecution, type IncidentLifecycle } from "../src/core/org/completion.ts";
import { eventsOfType } from "../src/core/org/events.ts";
import { AT, CONTROL, CONTROL as CONTROLLER, DISPATCH, directory, GROUP_A, inputFor, WORKER } from "./org-fixture.ts";

/** Готовое обращение: ответственное подразделение + сотрудник. */
const prepared = () => {
  const created = assignDepartment(inputFor(), { departmentId: "DEP-A2", at: AT, actorUserId: DISPATCH });
  if (!created.ok) throw new Error("фикстура: " + created.error);
  const withEmployee = assignEmployee(inputFor(created.assignments, created.events), {
    assignmentId: created.assignmentId,
    employeeId: "EMP-A1",
    at: AT,
    actorUserId: DISPATCH,
  });
  if (!withEmployee.ok) throw new Error("фикстура: " + withEmployee.error);
  const lifecycle: IncidentLifecycle = { incidentId: "З-001", organizationId: GROUP_A, status: "active", records: [] };
  return { assignments: withEmployee.assignments, events: withEmployee.events, lifecycle };
};

const input = (state: ReturnType<typeof prepared>) => ({ directory, ...state });

test("исполнитель сообщает о выполнении: обращение уходит на проверку", () => {
  const state = prepared();
  const result = submitExecution(input(state), { at: "2026-01-06T10:00:00.000Z", actorUserId: WORKER, reason: "работы выполнены" });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.lifecycle.status).toBe("pending_review");
  expect(result.lifecycle.records.at(-1)?.type).toBe("submitted");
  expect(result.lifecycle.records.at(-1)?.byUserId).toBe(WORKER);
  expect(eventsOfType(result.events, "ExecutionSubmitted")).toHaveLength(1);
});

test("повторная сдача и сдача без исполнителя запрещены", () => {
  const state = prepared();
  const first = submitExecution(input(state), { at: AT, actorUserId: WORKER });
  if (!first.ok) throw new Error("фикстура: " + first.error);
  const again = submitExecution({ ...input(state), lifecycle: first.lifecycle, assignments: first.assignments, events: first.events }, { at: AT, actorUserId: WORKER });
  expect(again.ok).toBe(false);
  const noExecutor = submitExecution(
    { ...input(state), assignments: state.assignments.map((item) => ({ ...item, employeeId: null })) },
    { at: AT, actorUserId: "USR-НЕТ" },
  );
  expect(noExecutor.ok).toBe(false);
});

test("контролёр подтверждает завершение, ответственное подразделение фиксируется", () => {
  const state = prepared();
  const submitted = submitExecution(input(state), { at: AT, actorUserId: WORKER });
  if (!submitted.ok) throw new Error("фикстура: " + submitted.error);
  const approved = approveCompletion(
    { ...input(state), lifecycle: submitted.lifecycle, assignments: submitted.assignments, events: submitted.events },
    { at: "2026-01-07T10:00:00.000Z", actorUserId: CONTROLLER, result: "подтверждено" },
  );
  expect(approved.ok).toBe(true);
  if (!approved.ok) return;
  expect(approved.lifecycle.status).toBe("completed");
  const record = approved.lifecycle.records.at(-1)!;
  expect(record.type).toBe("approved");
  expect(record.accountableDepartmentId).toBe("DEP-A2");
  expect(approved.assignments.every((item) => item.status === "completed")).toBe(true);
  expect(eventsOfType(approved.events, "CompletionApproved")).toHaveLength(1);
  expect(eventsOfType(approved.events, "StatusChanged")).toHaveLength(1);
});

test("исполнитель не может подтвердить завершение", () => {
  const state = prepared();
  const submitted = submitExecution(input(state), { at: AT, actorUserId: WORKER });
  if (!submitted.ok) throw new Error("фикстура: " + submitted.error);
  const denied = approveCompletion(
    { ...input(state), lifecycle: submitted.lifecycle, assignments: submitted.assignments, events: submitted.events },
    { at: AT, actorUserId: WORKER },
  );
  expect(denied.ok).toBe(false);
  expect(canComplete(directory, WORKER, GROUP_A)).toBe(false);
  expect(canComplete(directory, CONTROL, GROUP_A)).toBe(true);
  // Самоподтверждение запрещено даже при полномочии.
  const selfSubmit = submitExecution(input(state), { at: AT, actorUserId: CONTROLLER });
  if (!selfSubmit.ok) throw new Error("фикстура: " + selfSubmit.error);
  const selfApprove = approveCompletion(
    { ...input(state), lifecycle: selfSubmit.lifecycle, assignments: selfSubmit.assignments, events: selfSubmit.events },
    { at: AT, actorUserId: CONTROLLER },
  );
  expect(selfApprove.ok).toBe(false);
});

test("отказ в подтверждении требует причины и возвращает обращение в работу", () => {
  const state = prepared();
  const submitted = submitExecution(input(state), { at: AT, actorUserId: WORKER });
  if (!submitted.ok) throw new Error("фикстура: " + submitted.error);
  const noReason = rejectCompletion(
    { ...input(state), lifecycle: submitted.lifecycle, assignments: submitted.assignments, events: submitted.events },
    { at: AT, actorUserId: CONTROLLER },
  );
  expect(noReason.ok).toBe(false);
  const rejected = rejectCompletion(
    { ...input(state), lifecycle: submitted.lifecycle, assignments: submitted.assignments, events: submitted.events },
    { at: AT, actorUserId: CONTROLLER, reason: "работы не приняты" },
  );
  expect(rejected.ok).toBe(true);
  if (!rejected.ok) return;
  expect(rejected.lifecycle.status).toBe("active");
  expect(rejected.lifecycle.records.at(-1)?.reason).toBe("работы не приняты");
  expect(eventsOfType(rejected.events, "CompletionRejected")).toHaveLength(1);
});

test("повторное открытие сохраняет предыдущее завершение", () => {
  const state = prepared();
  const submitted = submitExecution(input(state), { at: AT, actorUserId: WORKER });
  if (!submitted.ok) throw new Error("фикстура: " + submitted.error);
  const approved = approveCompletion(
    { ...input(state), lifecycle: submitted.lifecycle, assignments: submitted.assignments, events: submitted.events },
    { at: AT, actorUserId: CONTROLLER },
  );
  if (!approved.ok) throw new Error("фикстура: " + approved.error);
  const reopened = reopenIncident(
    { ...input(state), lifecycle: approved.lifecycle, assignments: approved.assignments, events: approved.events },
    { at: "2026-01-08T10:00:00.000Z", actorUserId: CONTROLLER, reason: "проблема повторилась" },
  );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  expect(reopened.lifecycle.status).toBe("reopened");
  expect(reopened.lifecycle.records.filter((record) => record.type === "approved")).toHaveLength(1);
  expect(reopened.lifecycle.records.filter((record) => record.type === "reopened")).toHaveLength(1);
  expect(eventsOfType(reopened.events, "IncidentReopened")).toHaveLength(1);
  // Переоткрыть можно только завершённое; права проверяются не в UI.
  const wrongPermission = reopenIncident(
    { ...input(state), lifecycle: approved.lifecycle, assignments: approved.assignments, events: approved.events },
    { at: AT, actorUserId: WORKER, reason: "нет права" },
  );
  expect(wrongPermission.ok).toBe(false);
  expect(canReopen(directory, CONTROLLER, GROUP_A)).toBe(true);
  expect(canReopen(directory, WORKER, GROUP_A)).toBe(false);
});
