import { expect, test } from "bun:test";
import { BRANCHES, buildProcessGraph } from "../src/data/edges.ts";
import { NODES } from "../src/data/nodes.ts";
import { buildGraph, neighborsOf } from "../src/core/graph.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { moveForward } from "../src/core/navigation.ts";
import { mulberry32 } from "../src/random.ts";

const graph = buildProcessGraph();

test("развилки ссылаются на существующие узлы и имеют положительные веса", () => {
  Object.entries(BRANCHES).forEach(([from, branches]) => {
    expect(graph.byId[from]).toBeDefined();
    expect(branches.length).toBeGreaterThan(1);
    branches.forEach((b) => {
      expect(graph.byId[b.to]).toBeDefined();
      expect(b.weight).toBeGreaterThan(0);
      expect(b.note.length).toBeGreaterThan(3);
    });
  });
});

test("prev считается как обратная связь от next", () => {
  expect(neighborsOf(graph, "U19").prev).toContain("U12");
  expect(neighborsOf(graph, "U13").prev).toEqual(["U12"]);
  expect(neighborsOf(graph, "U6").prev).toContain("U4");
  expect(neighborsOf(graph, "U6").prev).toContain("U9");
  expect(neighborsOf(graph, "U6").prev).toContain("U13");
  expect(neighborsOf(graph, "U6").prev).toContain("U5");
  expect(neighborsOf(graph, "U1").prev).toEqual([]);
});

test("из U12 достижимы обе ветки — процесс действительно рандомный", () => {
  const incident = generateIncidents(graph, mulberry32(1)).find((i) => i.nodeId === "U12")!;
  const targets = new Set<string>();
  for (let seed = 1; seed <= 40; seed += 1) {
    const result = moveForward(graph, incident, mulberry32(seed), 1, "auto");
    if (result.ok) targets.add(result.incident.nodeId);
  }
  expect([...targets].sort()).toEqual(["U13", "U19"]);
});

test("веса влияют на выбор: U19 (60) встречается чаще U13 (40)", () => {
  const incident = generateIncidents(graph, mulberry32(2)).find((i) => i.nodeId === "U12")!;
  let toU13 = 0;
  let toU19 = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const result = moveForward(graph, incident, mulberry32(seed), 1, "auto");
    if (!result.ok) continue;
    if (result.incident.nodeId === "U13") toU13 += 1;
    if (result.incident.nodeId === "U19") toU19 += 1;
  }
  expect(toU13 + toU19).toBe(400);
  expect(toU19).toBeGreaterThan(toU13);
});

test("все 30 узлов достижимы от U1 по развилкам", () => {
  const seen = new Set<string>(["U1"]);
  const queue = ["U1"];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const next of neighborsOf(graph, id).next) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  expect(seen.size).toBe(graph.order.length);
});

test("циклы конечны: заявки доходят до конца процесса", () => {
  let incidents = generateIncidents(graph, mulberry32(11));
  const rand = mulberry32(11);
  for (let step = 1; step <= 400; step += 1) {
    incidents = incidents.map((incident) => {
      const result = moveForward(graph, incident, rand, step, "auto");
      return result.ok ? result.incident : incident;
    });
    if (incidents.every((i) => i.nodeId === "U30")) break;
  }
  expect(incidents.every((i) => i.nodeId === "U30")).toBe(true);
  expect(Math.max(...incidents.map((i) => i.history.length))).toBeLessThan(200);
});

test("без развилок граф остаётся линейным", () => {
  const linear = buildGraph(NODES);
  expect(Object.keys(linear.branches).length).toBe(0);
  expect(neighborsOf(linear, "U12").next).toEqual(["U13"]);
  expect(neighborsOf(linear, "U19").prev).toEqual(["U18"]);
});
