import { expect, test } from "bun:test";
import { COHORTS, cohortsByNode, defaultFilters, emptyCohorts } from "../src/core/analytics.ts";
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

test("analytics: пустые когорты, фильтры по умолчанию и пустой дашборд", () => {
  expect(emptyCohorts()).toEqual({ urgent: 0, normal: 0, routine: 0, none: 0 });
  expect(defaultFilters()).toEqual({ cohort: "all", nodeId: "", role: "any" });
  const buckets = cohortsByNode(graph, []);
  expect(buckets.length).toBe(30);
  expect(buckets.every((bucket) => bucket.total === 0 && bucket.incidentIds.length === 0)).toBe(true);
  expect(COHORTS.length).toBe(4);
});
