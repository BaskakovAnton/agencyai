import { expect, test } from "bun:test";
import { buildGraph } from "../src/core/graph.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { allowedNext, isArchived, moveForwardAs, moveToNodeAs } from "../src/core/navigation.ts";
import { allowedRoles, roleAccess } from "../src/core/roles.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { NODES } from "../src/data/nodes.ts";
import { ROLE_IDS, ROLE_NAMES } from "../src/data/roles.ts";
import { mulberry32 } from "../src/random.ts";
import { parseCommand } from "../src/cli/commands.ts";
import { applyCommand } from "../src/cli/reducer.ts";
import type { Graph, Session } from "../src/types.ts";

const graph = buildProcessGraph();
const linear = buildGraph(NODES);
const NOW = "2026-11-16T12:00:00.000Z";

const at = (g: Graph, nodeId: string, seed = 3) =>
  generateIncidents(g, mulberry32(seed)).find((i) => i.nodeId === nodeId)!;

const sessionOf = (g: Graph, role = "deputy"): Session => ({
  step: 0,
  role: role as Session["role"],
  incidents: generateIncidents(g, mulberry32(9)),
  log: [],
});

test("уровни доступа роли читаются из данных узла", () => {
  expect(roleAccess(graph, "U19", "deputy").level).toBe("allow");
  expect(roleAccess(graph, "U19", "assistant").level).toBe("conditional");
  expect(roleAccess(graph, "U19", "contractor").level).toBe("na");
  expect(roleAccess(graph, "U24", "contractor").level).toBe("deny");
  expect(roleAccess(graph, "U25", "resident").level).toBe("deny");
});

test("allowed = allow/subset/conditional, запрещены deny и na", () => {
  expect(roleAccess(graph, "U19", "assistant").allowed).toBe(true);
  expect(roleAccess(graph, "U19", "contractor").allowed).toBe(false);
  expect(roleAccess(graph, "U24", "observer").allowed).toBe(false);
  expect(roleAccess(graph, "U24", "auditor").allowed).toBe(true);
  expect(roleAccess(graph, "U25", "resident").allowed).toBe(false);
});

test("allowedRoles перечисляет роли, которым узел доступен", () => {
  expect(allowedRoles(graph, "U25")).toEqual(["system", "observer", "auditor"]);
  expect(allowedRoles(graph, "U19")).toContain("deputy");
  expect(allowedRoles(graph, "U30")).toEqual([]);
});

test("переход по роли: подрядчика на U19 не пускают, депутата пускают", () => {
  const incident = at(graph, "U18");
  const asContractor = moveToNodeAs(graph, incident, "U19", 1, "contractor");
  expect(asContractor.ok).toBe(false);
  if (!asContractor.ok) {
    expect(asContractor.error).toContain(ROLE_NAMES.contractor);
    expect(asContractor.error).toContain("U19");
  }
  const asDeputy = moveToNodeAs(graph, incident, "U19", 1, "deputy");
  expect(asDeputy.ok).toBe(true);
});

test("moveForwardAs фильтрует ветки по правам роли", () => {
  const incident = at(graph, "U9", 5);
  for (let seed = 1; seed <= 20; seed += 1) {
    const result = moveForwardAs(graph, incident, mulberry32(seed), 1, "contractor");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.incident.nodeId).toBe("U10");
  }
  // у U10 «Отметка в работе» депутат не участвует, поэтому ему доступны только U6 и U16
  expect(allowedNext(graph, "U9", "deputy")).toEqual(["U6", "U16"]);
  expect(allowedNext(graph, "U9", "contractor")).toEqual(["U10"]);
});

test("U30 «Удаление» запрещён всем ролям, процесс архивируется на U29", () => {
  ROLE_IDS.forEach((role) => {
    expect(roleAccess(graph, "U30", role).allowed).toBe(false);
    expect(allowedNext(graph, "U29", role)).toEqual([]);
  });
  const incident = at(graph, "U29", 7);
  const result = moveForwardAs(graph, incident, mulberry32(1), 1, "deputy");
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toContain("нет доступных переходов");
  expect(isArchived(graph, incident, "deputy")).toBe(true);
  expect(isArchived(graph, incident, "system")).toBe(true);
});

test("CLI: роль переключается и ограничивает переходы", () => {
  const switched = applyCommand(linear, sessionOf(linear), parseCommand("role contractor"), mulberry32(1), NOW);
  expect(switched.session.role).toBe("contractor");
  expect(switched.output.join(" ")).toContain(ROLE_NAMES.contractor);

  const shown = applyCommand(linear, switched.session, parseCommand("role"), mulberry32(1), NOW);
  expect(shown.output.join(" ")).toContain(ROLE_NAMES.contractor);

  const incident = switched.session.incidents.find((i) => i.nodeId === "U18")!;
  const denied = applyCommand(linear, switched.session, parseCommand("move " + incident.id + " U19"), mulberry32(1), NOW);
  expect(denied.output[0]).toContain("отказ");
  expect(denied.session).toBe(switched.session);

  const asDeputy = applyCommand(linear, sessionOf(linear), parseCommand("move " + incident.id + " U19"), mulberry32(1), NOW);
  expect(asDeputy.session.incidents.find((i) => i.id === incident.id)!.nodeId).toBe("U19");
});
