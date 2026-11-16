import { expect, test } from "bun:test";
import { buildGraph } from "../src/core/graph.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { moveBackward, moveForward, moveToNode } from "../src/core/navigation.ts";
import { NODES } from "../src/data/nodes.ts";
import { mulberry32 } from "../src/random.ts";

const graph = buildGraph(NODES);
const incidents = generateIncidents(graph, mulberry32(5));
const byNode = (id: string) => incidents.find((i) => i.nodeId === id)!;

test("шаг вперёд переводит заявку на следующий узел", () => {
  const start = byNode("U5");
  const result = moveForward(graph, start, mulberry32(1), 1, "operator");
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.incident.nodeId).toBe("U6");
    expect(result.incident.history.length).toBe(1);
    expect(result.incident.history[0]?.from).toBe("U5");
  }
});

test("шаг назад возвращает на предыдущий узел", () => {
  const start = byNode("U9");
  const result = moveBackward(graph, start, mulberry32(1), 1, "operator");
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.incident.nodeId).toBe("U8");
});

test("на границах процесса шаги невозможны", () => {
  const first = moveBackward(graph, byNode("U1"), mulberry32(1), 1);
  const last = moveForward(graph, byNode("U30"), mulberry32(1), 1);
  expect(first.ok).toBe(false);
  expect(last.ok).toBe(false);
  if (!last.ok) expect(last.error).toContain("конец процесса");
});

test("оператор ходит только на соседние узлы", () => {
  const incident = byNode("U7");
  const bad = moveToNode(graph, incident, "U12", 1, "operator");
  expect(bad.ok).toBe(false);
  if (!bad.ok) expect(bad.error).toContain("не соседний");
  const good = moveToNode(graph, incident, "U8", 1, "operator");
  expect(good.ok).toBe(true);
  if (good.ok) expect(good.incident.nodeId).toBe("U8");
});

test("исходные объекты не мутируются", () => {
  const incident = byNode("U3");
  const before = JSON.stringify(incident);
  moveForward(graph, incident, mulberry32(2), 1, "auto");
  moveBackward(graph, incident, mulberry32(2), 1, "auto");
  expect(JSON.stringify(incident)).toBe(before);
});
