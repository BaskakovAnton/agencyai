import { expect, test } from "bun:test";
import { departmentOn } from "../src/core/analytics/attribution.ts";

const assignment = (id: string, departmentId: string, assignedAt: string, endedAt: string | null) => ({
  id,
  organizationId: "ORG",
  incidentId: "З-1",
  departmentId,
  employeeId: null,
  assignmentType: "accountable" as const,
  status: endedAt === null ? ("active" as const) : ("completed" as const),
  assignedAt,
  assignedByUserId: null,
  endedAt,
  endedByUserId: null,
  reason: null,
  result: null,
});
const day = "2026-01-10";
const at = (hour: number, minute = 0) => day + "T" + String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0") + ":00.000Z";

test("A обычная передача: конец дня покрыт, шаг 1", () => {
  const r = departmentOn([assignment("a", "DEP-A", at(0), at(4)), assignment("b", "DEP-B", at(4), null)], "З-1", day);
  expect(r).toEqual({ state: "assigned", departmentId: "DEP-B", viaTransferDay: false, activeOnDayEnd: true });
});

test("B назначение закончилось до конца дня: шаг 2 берёт последнее по assignedAt", () => {
  const r = departmentOn([assignment("a", "DEP-A", at(0), at(4)), assignment("b", "DEP-B", at(4), at(20))], "З-1", day);
  expect(r.state).toBe("assigned");
  expect(r.departmentId).toBe("DEP-B");
  expect(r.viaTransferDay).toBe(true);
  expect(r.activeOnDayEnd).toBe(false);
});

test("C несколько передач в дне: максимум assignedAt", () => {
  const r = departmentOn([assignment("a", "DEP-A", at(0), at(4)), assignment("b", "DEP-B", at(4), at(12)), assignment("c", "DEP-C", at(12), at(20))], "З-1", day);
  expect(r.departmentId).toBe("DEP-C");
  expect(r.viaTransferDay).toBe(true);
});

test("D нет назначений в дне: NO_DATA", () => {
  const r = departmentOn([assignment("a", "DEP-A", "2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z")], "З-1", day);
  expect(r.state).toBe("no_data");
  expect(r.activeOnDayEnd).toBe(false);
});

test("E равные assignedAt у последних кандидатов: CONFLICT", () => {
  const r = departmentOn([assignment("a", "DEP-A", at(10), at(12)), assignment("b", "DEP-B", at(10), at(11))], "З-1", day);
  expect(r.state).toBe("conflict");
  expect(r.viaTransferDay).toBe(true);
});

test("F некорректный departmentId последнего назначения: INCOMPLETE", () => {
  const r = departmentOn([assignment("a", "DEP-A", at(0), at(4)), assignment("b", "none", at(4), at(20))], "З-1", day);
  expect(r.state).toBe("incomplete");
  expect(r.viaTransferDay).toBe(true);
});

test("G два интервала покрывают конец дня: CONFLICT шага 1", () => {
  const r = departmentOn([assignment("a", "DEP-A", at(0), null), assignment("b", "DEP-B", at(4), null)], "З-1", day);
  expect(r.state).toBe("conflict");
  expect(r.viaTransferDay).toBe(false);
  expect(r.activeOnDayEnd).toBe(true);
});

test("чужие заявки и не-accountable назначения не участвуют", () => {
  const other = { ...assignment("x", "DEP-X", at(0), null), incidentId: "З-2" };
  const executor = { ...assignment("y", "DEP-Y", at(0), null), assignmentType: "executor" as never };
  const r = departmentOn([other, executor], "З-1", day);
  expect(r.state).toBe("no_data");
});
