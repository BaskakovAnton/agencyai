import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { slaPhaseOnDay } from "../src/core/sla-at.ts";
import { startSla } from "../src/core/sla.ts";
import { visibleAt } from "../src/core/timeline.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import type { Incident } from "../src/types.ts";
import { buildOverview, needsAttention } from "../src/web/overview.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const day = "2026-01-02";
const later = story.days.at(-1) as string;

const fake = (priority: Incident["priority"], createdAt: string): Incident => ({
  id: "З-999",
  category: "тест",
  title: "проверка",
  address: "адрес",
  reporter: "житель",
  priority,
  nodeId: "U1",
  situationId: "С1",
  sla: startSla(priority, 0),
  history: [],
  createdAt,
});

test("правило «требуют внимания»: просрочка или срочная незавершённая", () => {
  expect(needsAttention(graph, fake("urgent", day + "T00:00:00.000Z"), day)).toBe(true);
  expect(needsAttention(graph, fake("normal", "2020-01-01T00:00:00.000Z"), day)).toBe(true);
  expect(needsAttention(graph, fake("routine", day + "T00:00:00.000Z"), day)).toBe(false);
});

test("KPI обзора считаются из модели, а не вбиты руками", () => {
  const overview = buildOverview(graph, story.incidents, day);
  const slice = visibleAt(story.incidents, day);
  expect(overview.kpi.total).toBe(slice.length);
  expect(overview.kpi.paused).toBe(slice.filter((i) => slaPhaseOnDay(i, day) === "paused").length);
  expect(overview.kpi.overdue).toBe(slice.filter((i) => slaPhaseOnDay(i, day) === "overdue").length);
  expect(overview.kpi.ok + overview.kpi.paused + overview.kpi.overdue + overview.kpi.none).toBe(overview.kpi.total);
  const attentionCount = slice.filter((i) => needsAttention(graph, i, day)).length;
  expect(overview.kpi.attention).toBe(attentionCount);
  expect(overview.attention.length).toBe(Math.min(attentionCount, 8));
  for (const item of overview.attention) expect(needsAttention(graph, story.incidents.find((i) => i.id === item.id)!, day)).toBe(true);
});

test("нулевой срез: пустой день не даёт NaN и ложных значений", () => {
  const overview = buildOverview(graph, story.incidents, "2020-01-01");
  expect(overview.kpi.total).toBe(0);
  expect(overview.kpi.attention).toBe(0);
  expect(overview.attention).toHaveLength(0);
  expect(overview.events).toHaveLength(0);
});

test("обзор собирает блоки в стиле эталона из модели", () => {
  const overview = buildOverview(graph, story.incidents, later);
  expect(overview.days).toHaveLength(6);
  expect(overview.days.at(-1)!.day).toBe(later);
  expect(overview.groups).toHaveLength(6);
  expect(overview.daily).toHaveLength(6);
  expect(overview.matrix).toHaveLength(4);
  for (const row of overview.matrix) {
    expect(row.values).toHaveLength(6);
    expect(row.values.every((v) => v >= 0 && v <= 100)).toBe(true);
  }
  expect(overview.summary.length).toBeGreaterThan(0);
  expect(overview.workflow.length).toBeGreaterThan(0);
  const nodesInGroups = overview.groups.reduce((sum, g) => sum + g.nodes, 0);
  expect(nodesInGroups).toBe(graph.order.length);
});

test("последние события идут от свежих к старым", () => {
  const overview = buildOverview(graph, story.incidents, later);
  expect(overview.events.length).toBeGreaterThan(0);
  const times = overview.events.map((e) => e.at);
  expect([...times].sort().reverse()).toEqual(times);
});
