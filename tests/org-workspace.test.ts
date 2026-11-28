import { expect, test } from "bun:test";
import {
  accountableAssignment,
  activeAssignments,
  applyAssignmentResult,
  applyCompletionResult,
  assignmentInput,
  completionInput,
  withLifecycle,
  workspaceOf,
} from "../src/core/org/workspace.ts";
import type { OrgDirectory } from "../src/core/org/types.ts";
import { HERO_ROUTE, heroMoves } from "../src/data/hero.ts";

const directory = { organizationId: "ORG", departments: [], employees: [] } as unknown as OrgDirectory;

test("heroMoves строит маршрут героя цепочкой «откуда → куда»", () => {
  const moves = heroMoves();
  expect(moves.map((move) => move.to)).toEqual([...HERO_ROUTE]);
  expect(moves[0]!.from).toBe("U1");
  expect(moves[1]!.from).toBe("U6");
  expect(moves.every((move) => move.actor === "auto" && move.note === "сценарий демонстрации")).toBe(true);
  expect(moves.map((move) => move.step)).toEqual([1, 2, 3]);
});

test("workspaceOf собирает неизменяемый снимок и выходы операций", () => {
  const workspace = workspaceOf(directory);
  expect(workspace.assignments).toEqual([]);
  expect(workspace.events).toEqual([]);
  expect(workspace.lifecycles).toEqual({});
  expect(completionInput(workspace, "З-1")).toBeUndefined();
  const incident = { id: "З-1", organizationId: "ORG" } as never;
  expect(assignmentInput(workspace, incident).incident).toBe(incident);
});

test("результаты операций: неуспех не меняет снимок, успех заменяет его", () => {
  const workspace = workspaceOf(directory);
  expect(applyAssignmentResult(workspace, { ok: false } as never)).toBe(workspace);
  const next = applyAssignmentResult(workspace, { ok: true, assignments: [], events: [] } as never);
  expect(next).not.toBe(workspace);
  expect(applyCompletionResult(workspace, { ok: false } as never)).toBe(workspace);
});

test("withLifecycle, activeAssignments и accountableAssignment читают снимок", () => {
  const workspace = workspaceOf(directory);
  const lifecycle = { incidentId: "З-1", organizationId: "ORG", status: "active" as const, records: [] };
  const next = withLifecycle(workspace, lifecycle);
  expect(next.lifecycles["З-1"]).toBe(lifecycle);
  expect(completionInput(next, "З-1")?.lifecycle).toBe(lifecycle);
  expect(activeAssignments(next, "З-1")).toEqual([]);
  expect(accountableAssignment(next, "З-1")).toBeUndefined();
});
