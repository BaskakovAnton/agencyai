/** UX-3.1.2: порядок событий с одинаковым timestamp — по порядку записи. */
import { expect, test } from "bun:test";
import { createOrgRepository } from "../src/data/org-repository.ts";
import { flowOf } from "../src/core/analytics/flow.ts";
import { lifecycleStatusOn, snapshotOn } from "../src/core/analytics/snapshot.ts";
import { periodEndingAt } from "../src/core/periods.ts";
import { approveCompletion, rejectCompletion, reopenIncident, submitExecution, type IncidentLifecycle } from "../src/core/org/completion.ts";
import { workspaceOf } from "../src/core/org/workspace.ts";
import { integrationDirectory } from "./kpi-fixture.ts";
import type { Incident } from "../src/types.ts";
import { startSla } from "../src/core/sla.ts";
import { buildProcessGraph } from "../src/data/edges.ts";

const graph = buildProcessGraph();
const DAY = "2026-01-10";
const AT = DAY + "T12:00:00.000Z"; // одинаковый timestamp у всех событий дня

const incident: Incident = {
  id: "З-900",
  category: "elevator",
  title: "Порядок событий",
  address: "ул. Тестовая",
  reporter: "Житель дома",
  channel: "телефон",
  priority: "urgent",
  nodeId: graph.order[0]!,
  situationId: "С9",
  sla: startSla("urgent", 0),
  history: [],
  createdAt: "2026-01-01T00:00:00.000Z",
};

/** Справочник с правами: исполнитель сдаёт работу, контролёр подтверждает и переоткрывает. */
const directory = {
  ...integrationDirectory,
  users: [
    { id: "USR-EXECUTOR", displayName: "Исполнитель (тест)", active: true },
    { id: "USR-CONTROL", displayName: "Контролёр (тест)", active: true },
  ],
  memberships: [
    { id: "MS-1", userId: "USR-EXECUTOR", organizationId: "ORG-DEMO", employeeId: null, permissions: ["incident.participate"] as const },
    { id: "MS-2", userId: "USR-CONTROL", organizationId: "ORG-DEMO", employeeId: null, permissions: ["incident.complete", "incident.reopen"] as const },
  ],
};

const accountable = {
  id: "AS-0001",
  organizationId: "ORG-DEMO",
  incidentId: "З-900",
  departmentId: "DEP-A1",
  employeeId: null,
  assignmentType: "accountable" as const,
  status: "active" as const,
  assignedAt: "2026-01-02T10:00:00.000Z",
  assignedByUserId: "USR-CONTROL",
  endedAt: null,
  endedByUserId: null,
  reason: null,
  result: null,
};

const repositoryFor = () =>
  createOrgRepository(workspaceOf(directory, [accountable], [], { "З-900": { incidentId: "З-900", organizationId: "ORG-DEMO", status: "active", records: [] } }));

const run = (repository: ReturnType<typeof repositoryFor>, operation: (input: ReturnType<typeof approveCompletion> extends never ? never : any) => any) =>
  repository.runCompletion("З-900", operation as never);

const lifecycleOf = (repository: ReturnType<typeof repositoryFor>): IncidentLifecycle => repository.lifecycleOf("З-900")!;
const statusOn = (repository: ReturnType<typeof repositoryFor>) => lifecycleStatusOn(lifecycleOf(repository), DAY);

test("submit → approve: статус completed, завершение одно", () => {
  const repository = repositoryFor();
  run(repository, (input) => submitExecution(input, { at: AT, actorUserId: "USR-EXECUTOR" }));
  expect(statusOn(repository)).toBe("pending_review");
  run(repository, (input) => approveCompletion(input, { at: AT, actorUserId: "USR-CONTROL" }));
  expect(statusOn(repository)).toBe("completed");
  expect(snapshotOn(graph, [incident], DAY, repository.allLifecycles!()).finished).toBe(1);
});

test("submit → reject: возврат в работу с сохранением причины", () => {
  const repository = repositoryFor();
  run(repository, (input) => submitExecution(input, { at: AT, actorUserId: "USR-EXECUTOR" }));
  run(repository, (input) => rejectCompletion(input, { at: AT, actorUserId: "USR-CONTROL", reason: "не принято" }));
  expect(statusOn(repository)).toBe("active");
  expect(lifecycleOf(repository).records.at(-1)?.reason).toBe("не принято");
  const state = snapshotOn(graph, [incident], DAY, repository.allLifecycles!());
  expect(state.finished).toBe(0);
  expect(state.pendingReview).toBe(0);
});

test("submit → approve → reopen при одинаковом timestamp: побеждает последняя запись", () => {
  const repository = repositoryFor();
  run(repository, (input) => submitExecution(input, { at: AT, actorUserId: "USR-EXECUTOR" }));
  run(repository, (input) => approveCompletion(input, { at: AT, actorUserId: "USR-CONTROL" }));
  run(repository, (input) => reopenIncident(input, { at: AT, actorUserId: "USR-CONTROL", reason: "повтор" }));
  expect(statusOn(repository)).toBe("reopened");
  const state = snapshotOn(graph, [incident], DAY, repository.allLifecycles!());
  expect({ finished: state.finished, active: state.active, pending: state.pendingReview }).toEqual({ finished: 0, active: 1, pending: 0 });
  const flow = flowOf({ graph, incidents: [incident], lifecycles: repository.allLifecycles!() }, periodEndingAt(DAY, 7));
  expect({ submitted: flow.submitted, approved: flow.approved, reopened: flow.reopened }).toEqual({ submitted: 1, approved: 1, reopened: 1 });
});

test("повторная отправка после отказа и подтверждение: порядок сохраняется", () => {
  const repository = repositoryFor();
  run(repository, (input) => submitExecution(input, { at: AT, actorUserId: "USR-EXECUTOR" }));
  run(repository, (input) => rejectCompletion(input, { at: AT, actorUserId: "USR-CONTROL", reason: "доработать" }));
  run(repository, (input) => submitExecution(input, { at: AT, actorUserId: "USR-EXECUTOR" }));
  run(repository, (input) => approveCompletion(input, { at: AT, actorUserId: "USR-CONTROL" }));
  const records = lifecycleOf(repository).records.map((record) => record.type);
  expect(records).toEqual(["submitted", "rejected", "submitted", "approved"]);
  expect(statusOn(repository)).toBe("completed");
  const flow = flowOf({ graph, incidents: [incident], lifecycles: repository.allLifecycles!() }, periodEndingAt(DAY, 7));
  expect({ submitted: flow.submitted, rejected: flow.rejected, finished: flow.finished }).toEqual({ submitted: 2, rejected: 1, finished: 1 });
});

test("срез до, между и после событий восстанавливается по датам", () => {
  const lifecycles: Readonly<Record<string, IncidentLifecycle>> = {
    "З-900": {
      incidentId: "З-900",
      organizationId: "ORG-DEMO",
      status: "completed",
      records: [
        { type: "submitted", at: "2026-01-04T12:00:00.000Z", byUserId: "USR-EXECUTOR", reason: null, accountableDepartmentId: null },
        { type: "approved", at: "2026-01-05T12:00:00.000Z", byUserId: "USR-CONTROL", reason: null, accountableDepartmentId: null },
      ],
    },
  };
  const before = snapshotOn(graph, [incident], "2026-01-03", lifecycles);
  const between = snapshotOn(graph, [incident], "2026-01-04", lifecycles);
  const after = snapshotOn(graph, [incident], "2026-01-05", lifecycles);
  expect([before.finished, before.pendingReview]).toEqual([0, 0]);
  expect([between.finished, between.pendingReview]).toEqual([0, 1]);
  expect([after.finished, after.pendingReview]).toEqual([1, 0]);
});

test("повторное вычисление даёт одинаковый результат", () => {
  const repository = repositoryFor();
  run(repository, (input) => submitExecution(input, { at: AT, actorUserId: "USR-EXECUTOR" }));
  run(repository, (input) => approveCompletion(input, { at: AT, actorUserId: "USR-CONTROL" }));
  const first = snapshotOn(graph, [incident], DAY, repository.allLifecycles!());
  const second = snapshotOn(graph, [incident], DAY, repository.allLifecycles!());
  expect(first).toEqual(second);
});
