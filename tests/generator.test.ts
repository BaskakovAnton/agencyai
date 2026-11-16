import { expect, test } from "bun:test";
import { buildGraph } from "../src/core/graph.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { NODES } from "../src/data/nodes.ts";
import { mulberry32 } from "../src/random.ts";

const graph = buildGraph(NODES);

test("заявок ровно столько, сколько узлов процесса", () => {
  const incidents = generateIncidents(graph, mulberry32(7));
  expect(incidents.length).toBe(graph.order.length);
});

test("каждая заявка выставлена на свой узел, покрытие — весь процесс", () => {
  const incidents = generateIncidents(graph, mulberry32(1));
  const nodes = incidents.map((i) => i.nodeId);
  expect(new Set(nodes).size).toBe(graph.order.length);
  nodes.forEach((id) => expect(graph.byId[id]).toBeDefined());
});

test("генерация детерминирована по seed", () => {
  const a = generateIncidents(graph, mulberry32(99));
  const b = generateIncidents(graph, mulberry32(99));
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
});

test("заявка — инцидент городской инфраструктуры от пользователя", () => {
  const incidents = generateIncidents(graph, mulberry32(3));
  incidents.forEach((i) => {
    expect(i.id.startsWith("З-")).toBe(true);
    expect(i.title.length).toBeGreaterThan(5);
    expect(i.address).toMatch(/(ул\.|пр\.) /);
    expect(i.address).toContain(", д. ");
    expect(["urgent", "normal", "routine", "none"]).toContain(i.priority);
  });
});
