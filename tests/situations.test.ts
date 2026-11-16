import { expect, test } from "bun:test";
import { SITUATIONS, SITUATION_SECTIONS, situationById, situationsForNode } from "../src/data/situations.ts";
import { NODE_SITUATIONS } from "../src/data/situation-nodes.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { ROLE_IDS } from "../src/data/roles.ts";
import { mulberry32 } from "../src/random.ts";
import { parseCommand } from "../src/cli/commands.ts";
import { applyCommand } from "../src/cli/reducer.ts";

const graph = buildProcessGraph();

test("ровно 37 ситуаций: С1…С37 и разделы 8/20/5/4", () => {
  expect(SITUATIONS.length).toBe(37);
  expect(SITUATIONS.map((s) => s.id)).toEqual(Array.from({ length: 37 }, (_, i) => "С" + (i + 1)));
  const count = (section: string) => SITUATIONS.filter((s) => s.section === section).length;
  expect(count("before")).toBe(8);
  expect(count("during")).toBe(20);
  expect(count("contractors")).toBe(5);
  expect(count("feedback")).toBe(4);
  expect(Object.keys(SITUATION_SECTIONS).length).toBe(4);
});

test("у каждой ситуации есть заголовок, SLA и шаги по ролям", () => {
  SITUATIONS.forEach((s) => {
    expect(s.title.length).toBeGreaterThan(3);
    expect(s.summary.length).toBeGreaterThan(3);
    expect(["urgent", "normal", "routine", "none"]).toContain(s.priority);
    expect(s.sla.length).toBeGreaterThan(2);
    expect(s.steps.length).toBeGreaterThanOrEqual(2);
    s.steps.forEach((step) => {
      expect(ROLE_IDS).toContain(step.lane);
      expect(step.title.length).toBeGreaterThan(1);
      expect(step.text.length).toBeGreaterThanOrEqual(1);
    });
  });
});

test("шаги-заглушки источника зафиксированы как факт (не больше трёх)", () => {
  const placeholders = SITUATIONS.flatMap((s) => s.steps.filter((step) => step.text.trim().length <= 2).map((step) => s.id + ":" + step.title));
  expect(placeholders.length).toBeLessThanOrEqual(3);
});

test("situationById находит ситуацию, неизвестная — undefined", () => {
  expect(situationById("С9")?.title).toContain("авари");
  expect(situationById("С37")?.section).toBe("feedback");
  expect(situationById("С99")).toBeUndefined();
});

test("связь «узел ↔ ситуации» перенесена из матрицы", () => {
  expect(situationsForNode("U12").map((s) => s.id)).toEqual(["С13", "С14", "С15", "С17"]);
  expect(situationsForNode("U30").map((s) => s.id)).toEqual(["С5", "С20", "С23"]);
  expect(situationsForNode("U1").map((s) => s.id)).toContain("С9");
  expect(situationsForNode("U99")).toEqual([]);
});

test("карта узлов покрывает все 30 узлов и ссылается на существующие ситуации", () => {
  expect(Object.keys(NODE_SITUATIONS).length).toBe(30);
  graph.order.forEach((nodeId) => {
    expect(NODE_SITUATIONS[nodeId]).toBeDefined();
    NODE_SITUATIONS[nodeId]!.forEach((id) => expect(situationById(id)).toBeDefined());
  });
});

test("генератор связывает заявки с ситуациями и берёт их приоритет", () => {
  const incidents = generateIncidents(graph, mulberry32(21));
  expect(incidents.length).toBe(30);
  incidents.forEach((incident) => {
    const situation = situationById(incident.situationId);
    expect(situation).toBeDefined();
    expect(incident.priority).toBe(situation!.priority);
  });
  expect(new Set(incidents.map((i) => i.situationId)).size).toBeGreaterThan(1);
});

test("детерминизм генератора сохраняется", () => {
  const a = generateIncidents(graph, mulberry32(5));
  const b = generateIncidents(graph, mulberry32(5));
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
});

test("CLI: список ситуаций и карточка ситуации", () => {
  const session = { step: 0, role: "deputy" as const, clock: 0, incidents: generateIncidents(graph, mulberry32(3)), log: [] as string[] };
  const list = applyCommand(graph, session, parseCommand("situations"), mulberry32(1), "2026-11-16T12:00:00.000Z");
  expect(list.output.join("\n").match(/С\d+/g)?.length).toBeGreaterThanOrEqual(37);
  const card = applyCommand(graph, session, parseCommand("situation С9"), mulberry32(1), "2026-11-16T12:00:00.000Z");
  const text = card.output.join("\n");
  expect(text).toContain("С9");
  expect(text).toContain("SLA");
  expect(text.length).toBeGreaterThan(120);
});
