import { expect, test } from "bun:test";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository, createOrgRepository } from "../src/data/org-repository.ts";
import { assignDepartment, addParticipantDepartment } from "../src/core/org/assignments.ts";
import { approveCompletion, submitExecution } from "../src/core/org/completion.ts";
import { applyAssignmentResult, workspaceOf } from "../src/core/org/workspace.ts";
import { DEMO_ORGANIZATION_ID, ORG_DIRECTORY } from "../src/data/org-demo.ts";
import { APPROVE_USER, EXECUTOR_USER } from "../src/core/org/demo-story-types.ts";

const graph = buildProcessGraph();
const { repository } = createDemoOrgRepository(graph, 7);

test("демо-репозиторий отдаёт обращения, назначения и события", () => {
  expect(repository.organizationId).toBe(DEMO_ORGANIZATION_ID);
  expect(repository.incidentIds.length).toBe(30);
  expect(repository.directory.organizations).toHaveLength(1);
  for (const incidentId of repository.incidentIds) {
    expect(repository.assignmentsOf(incidentId).length).toBeGreaterThan(0);
    const lifecycle = repository.lifecycleOf(incidentId);
    expect(lifecycle).toBeDefined();
    if (lifecycle?.status === "active" || lifecycle?.status === "pending_review") {
      expect(repository.accountableOf(incidentId)).toBeDefined();
    } else {
      // Завершение закрывает назначения; повторное открытие требует нового назначения.
      expect(repository.activeAssignmentsOf(incidentId)).toHaveLength(0);
      expect(repository.assignmentsOf(incidentId).some((item) => item.status === "completed")).toBe(true);
    }
  }
});

test("чтение даёт согласованные срезы по обращениям и подразделениям", () => {
  const withParticipants = repository.incidentIds.find((id) => repository.participantsOf(id).length > 0);
  expect(withParticipants).toBeDefined();
  const participantDepartment = repository.participantsOf(withParticipants!)![0]!.departmentId;
  expect(repository.incidentIdsOfDepartment(participantDepartment)).toContain(withParticipants!);
  expect(repository.incidentIdsOfDepartment("НЕТ-ТАКОГО")).toHaveLength(0);
  const accountable = repository.accountableOf(withParticipants!)!;
  expect(repository.activeAssignmentsOf(withParticipants!)).toContain(accountable);
  expect(repository.eventsOf(withParticipants!).every((event) => event.entityId === withParticipants!)).toBe(true);
});

test("неизвестное обращение не даёт данных и не бросает исключение", () => {
  expect(repository.assignmentsOf("З-999")).toHaveLength(0);
  expect(repository.accountableOf("З-999")).toBeUndefined();
  expect(repository.lifecycleOf("З-999")).toBeUndefined();
  expect(repository.eventsOf("З-999")).toHaveLength(0);
});

test("операция через порт меняет снимок только при успехе", () => {
  const before = repository.assignmentsOf("З-001").length;
  const failedRun = repository.runAssignment(
    { id: "З-001", organizationId: DEMO_ORGANIZATION_ID },
    (input) => addParticipantDepartment(input, { departmentId: "DEP-ARCHIVE", at: "2026-01-09T10:00:00.000Z", actorUserId: APPROVE_USER }),
  );
  expect(failedRun.ok).toBe(false);
  expect(repository.assignmentsOf("З-001")).toHaveLength(before);

  const succeeded = repository.runAssignment(
    { id: "З-001", organizationId: DEMO_ORGANIZATION_ID },
    (input) => addParticipantDepartment(input, { departmentId: "DEP-LIGHT", at: "2026-01-09T10:00:00.000Z", actorUserId: APPROVE_USER, reason: "проверка порта" }),
  );
  expect(succeeded.ok).toBe(true);
  expect(repository.assignmentsOf("З-001")).toHaveLength(before + 1);
  expect(repository.incidentIdsOfDepartment("DEP-LIGHT")).toContain("З-001");
});

test("завершение через порт идёт из active в completed и не принимает сдачу без исполнителя", () => {
  const active = repository.incidentIds.find((id) => repository.lifecycleOf(id)?.status === "active")!;
  const submitted = repository.runCompletion(active, (input) =>
    submitExecution(input, { at: "2026-01-09T11:00:00.000Z", actorUserId: EXECUTOR_USER, reason: "порт: работы выполнены" }),
  );
  expect(submitted.ok).toBe(true);
  expect(repository.lifecycleOf(active)?.status).toBe("pending_review");
  const denied = repository.runCompletion(active, (input) => approveCompletion(input, { at: "2026-01-09T12:00:00.000Z", actorUserId: EXECUTOR_USER }));
  expect(denied.ok).toBe(false);
  expect(repository.lifecycleOf(active)?.status).toBe("pending_review");
  const approved = repository.runCompletion(active, (input) =>
    approveCompletion(input, { at: "2026-01-09T13:00:00.000Z", actorUserId: APPROVE_USER, result: "порт: подтверждено" }),
  );
  expect(approved.ok).toBe(true);
  expect(repository.lifecycleOf(active)?.status).toBe("completed");
  expect(repository.lifecycleOf(active)?.records.at(-1)?.byUserId).toBe(APPROVE_USER);
});

test("операция завершения по незаведённому обращению возвращает ошибку", () => {
  const result = repository.runCompletion("З-999", (input) =>
    submitExecution(input, { at: "2026-01-09T10:00:00.000Z", actorUserId: EXECUTOR_USER }),
  );
  expect(result.ok).toBe(false);
});

test("снимок неизменяем: неуспех возвращает тот же объект", () => {
  const workspace = workspaceOf(ORG_DIRECTORY);
  const failedResult = assignDepartment(
    { directory: workspace.directory, assignments: workspace.assignments, events: workspace.events, incident: { id: "З-001", organizationId: DEMO_ORGANIZATION_ID } },
    { departmentId: "DEP-B1", at: "2026-01-09T10:00:00.000Z", actorUserId: APPROVE_USER },
  );
  expect(failedResult.ok).toBe(false);
  expect(applyAssignmentResult(workspace, failedResult)).toBe(workspace);
});

test("save/load заменяет снимок целиком", () => {
  const repository2 = createOrgRepository(workspaceOf(ORG_DIRECTORY));
  expect(repository2.incidentIds).toHaveLength(0);
  repository2.save(workspaceOf(ORG_DIRECTORY));
  expect(repository2.load().directory.organizations[0]?.id).toBe(DEMO_ORGANIZATION_ID);
});
