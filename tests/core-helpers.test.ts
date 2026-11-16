import { expect, test } from "bun:test";
import { pluralize } from "../src/core/text.ts";
import { branchesOf, firstNodeId, lastNodeId, nodeIndex } from "../src/core/graph.ts";
import { allowedNext, isArchived, moveBackward, moveToNode } from "../src/core/navigation.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { mulberry32 } from "../src/random.ts";

const graph = buildProcessGraph();
const at = (nodeId: string) => generateIncidents(graph, mulberry32(3)).find((incident) => incident.nodeId === nodeId)!;

test("graph: границы цепочки, индекс и развилки узла", () => {
  expect(firstNodeId(graph)).toBe("U1");
  expect(lastNodeId(graph)).toBe("U30");
  expect(nodeIndex(graph, "U30")).toBe(29);
  expect(branchesOf(graph, "U12").length).toBe(2);
  expect(branchesOf(graph, "U1")).toEqual([]);
});

test("navigation: доступные переходы, архив и обратный ход", () => {
  const incident = at("U1");
  expect(allowedNext(graph, "U1", "deputy")).toEqual(["U2"]);
  expect(isArchived(graph, incident, "deputy")).toBe(false);
  expect(isArchived(graph, { ...incident, nodeId: "U30" }, "deputy")).toBe(true);

  const moved = moveToNode(graph, incident, "U2", 1, "operator");
  expect(moved.ok).toBe(true);
  const back = moveBackward(graph, { ...incident, nodeId: "U2" }, mulberry32(1), 2, "operator");
  expect(back.ok).toBe(true);
  if (back.ok) expect(back.incident.nodeId).toBe("U1");
});

test("русские формы числительных для подписей интерфейса", () => {
  expect(pluralize(1, "заявка", "заявки", "заявок")).toBe("заявка");
  expect(pluralize(3, "заявка", "заявки", "заявок")).toBe("заявки");
  expect(pluralize(5, "заявка", "заявки", "заявок")).toBe("заявок");
  expect(pluralize(11, "заявка", "заявки", "заявок")).toBe("заявок");
  expect(pluralize(22, "заявка", "заявки", "заявок")).toBe("заявки");
});
