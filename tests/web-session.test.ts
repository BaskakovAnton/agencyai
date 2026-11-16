import { expect, test } from "bun:test";
import { applyAction, createState } from "../src/web/session.ts";
import { buildProcessGraph } from "../src/data/edges.ts";

const graph = buildProcessGraph();
const start = () => createState(graph, 7);
const find = (state: ReturnType<typeof start>, id: string) => state.session.incidents.find((incident) => incident.id === id)!;

test("модель: шаг вперёд двигает заявку, время и пишет SLA в сообщение", () => {
  const state = start();
  const before = find(state, "З-005").nodeId;
  const result = applyAction(state, { kind: "forward", ref: "5" });
  expect(find(result.state, "З-005").nodeId).not.toBe(before);
  expect(result.state.session.clock).toBeGreaterThan(0);
  expect(result.message).toContain("SLA");
});

test("модель: смена роли, ожидание и сброс", () => {
  const asContractor = applyAction(start(), { kind: "role", role: "contractor" }).state;
  expect(asContractor.session.role).toBe("contractor");
  const waited = applyAction(asContractor, { kind: "wait", hours: 30 });
  expect(waited.state.session.clock).toBe(30);
  expect(waited.message).toContain("просрочено");
  const reset = applyAction(waited.state, { kind: "reset" });
  expect(reset.state.session.clock).toBe(0);
  expect(reset.state.session.role).toBe("contractor");
});

test("модель: выбор заявки по латинице и отказы переходов", () => {
  const selected = applyAction(start(), { kind: "select", ref: "z-9" });
  expect(selected.state.selected).toBe("З-009");
  const notNeighbour = applyAction(selected.state, { kind: "move", ref: "З-009", nodeId: "U20" });
  expect(notNeighbour.message).toContain("не соседний");
  const asContractor = applyAction(selected.state, { kind: "role", role: "contractor" }).state;
  const denied = applyAction(asContractor, { kind: "move", ref: "З-009", nodeId: "U19" });
  expect(denied.message).toContain("не может");
  const unknown = applyAction(selected.state, { kind: "select", ref: "З-999" });
  expect(unknown.message).toContain("не найдена");
});

test("модель: массовый шаг и повторный проход", () => {
  const swept = applyAction(start(), { kind: "sweep" });
  expect(swept.message).toContain("массовый прогон");
  expect(swept.state.session.step).toBeGreaterThan(0);
});
