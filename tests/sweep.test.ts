import { expect, test } from "bun:test";
import { sweep } from "../src/core/navigation.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { mulberry32 } from "../src/random.ts";

const graph = buildProcessGraph();

test("sweep двигает всех, кому есть куда идти", () => {
  const incidents = generateIncidents(graph, mulberry32(6));
  const result = sweep(graph, incidents, mulberry32(7), 1);
  // одна из 30 заявок стоит на U30 (конец процесса) — она остаётся на месте
  expect(result.moved).toBe(29);
  expect(result.incidents.map((i) => i.nodeId)).not.toEqual(incidents.map((i) => i.nodeId));
  expect(result.incidents.filter((incident) => incident.history.length === 1).length).toBe(29);
  expect(result.incidents.find((incident) => incident.nodeId === "U30")!.history.length).toBeLessThan(2);
});

test("sweep не трогает заявки в конце процесса", () => {
  const incidents = generateIncidents(graph, mulberry32(8)).map((incident, index) =>
    index === 0 ? { ...incident, nodeId: "U30" } : incident,
  );
  const terminal = incidents[0]!;
  const result = sweep(graph, incidents, mulberry32(9), 2);
  // на U30 теперь две заявки: исходная З-030 и та, что мы перенесли вручную
  expect(result.moved).toBe(28);
  expect(result.incidents[0]).toEqual(terminal);
  expect(result.incidents[0]!.history.length).toBe(0);
});
