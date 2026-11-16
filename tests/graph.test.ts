import { expect, test } from "bun:test";
import { buildGraph, isNeighbor, lastNodeId, neighborsOf, nodeIndex } from "../src/core/graph.ts";
import { NODES } from "../src/data/nodes.ts";

const graph = buildGraph(NODES);

test("модель содержит 30 узлов в каноническом порядке", () => {
  expect(graph.order.length).toBe(30);
  expect(graph.order[0]).toBe("U1");
  expect(graph.order[29]).toBe("U30");
  expect(lastNodeId(graph)).toBe("U30");
});

test("у каждого узла есть группа и права всех ролей", () => {
  graph.order.forEach((id) => {
    const node = graph.byId[id];
    expect(node?.title.length).toBeGreaterThan(0);
    expect(Object.keys(node?.access ?? {}).length).toBe(7);
  });
});

test("соседи соответствуют цепочке процесса", () => {
  expect(neighborsOf(graph, "U1").next).toEqual(["U2"]);
  expect(neighborsOf(graph, "U1").prev).toEqual([]);
  expect(neighborsOf(graph, "U7").prev).toEqual(["U6"]);
  expect(neighborsOf(graph, "U7").next).toEqual(["U8"]);
  expect(neighborsOf(graph, "U30").next).toEqual([]);
  expect(isNeighbor(graph, "U7", "U8")).toBe(true);
  expect(isNeighbor(graph, "U7", "U10")).toBe(false);
});

test("узлы распределены по шести группам", () => {
  const groups = new Set(graph.order.map((id) => graph.byId[id]?.group));
  expect(groups.size).toBe(6);
  expect(nodeIndex(graph, "U30")).toBe(29);
});
