import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { slaPhaseOnDay } from "../src/core/sla-at.ts";
import { startSla } from "../src/core/sla.ts";
import { incidentAt, visibleAt } from "../src/core/timeline.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import type { Incident } from "../src/types.ts";
import { buildOverview, needsAttention, slaHoursLeft, slaIsAtRisk } from "../src/web/overview.ts";
import { isFinished } from "../src/core/incident.ts";

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

test("контроль сроков: риск ≤ 24 ч, нарушение — вне SLA", () => {
  const longAgo = fake("normal", "2020-01-01T00:00:00.000Z");
  expect(slaHoursLeft(longAgo, day)).toBeLessThan(0);
  expect(slaIsAtRisk(longAgo, day)).toBe(true);
  const fresh = fake("routine", day + "T00:00:00.000Z");
  expect(slaIsAtRisk(fresh, day)).toBe(false);
});

test("KPI обзора считаются из модели, а не вбиты руками", () => {
  const overview = buildOverview(graph, story.incidents, day);
  const slice = visibleAt(story.incidents, day);
  const finished = slice.filter((incident) => isFinished(incidentAt(incident, day), graph)).length;
  const attention = slice.filter((incident) => needsAttention(graph, incident, day)).length;
  expect(overview.kpi.total).toBe(slice.length);
  expect(overview.kpi.active).toBe(slice.length - finished);
  expect(overview.kpi.completed).toBe(finished);
  expect(overview.kpi.attention).toBe(attention);
  expect(overview.kpi.paused).toBe(slice.filter((incident) => slaPhaseOnDay(incident, day) === "paused").length);
  expect(overview.attention.length).toBe(Math.min(attention, 8));
  for (const item of overview.attention) {
    expect(needsAttention(graph, story.incidents.find((incident) => incident.id === item.id)!, day)).toBe(true);
    expect(item.priorityTitle.length).toBeGreaterThan(0);
    expect(item.slaText.length).toBeGreaterThan(0);
  }
});

test("распределение и контроль сроков согласованы со срезом", () => {
  const overview = buildOverview(graph, story.incidents, later);
  expect(overview.distribution).toHaveLength(4);
  expect(overview.distribution.reduce((sum, row) => sum + row.count, 0)).toBe(overview.kpi.total);
  expect(overview.sla).toHaveLength(4);
  expect(overview.sla.reduce((sum, row) => sum + row.count, 0)).toBe(overview.kpi.total);
  expect(overview.inTimeShare).toBeGreaterThanOrEqual(0);
  expect(overview.inTimeShare).toBeLessThanOrEqual(100);
});

test("нулевой срез не даёт NaN и ложных значений", () => {
  const overview = buildOverview(graph, story.incidents, "2020-01-01");
  expect(overview.kpi.total).toBe(0);
  expect(overview.attention).toHaveLength(0);
  expect(overview.events).toHaveLength(0);
  expect(overview.inTimeShare).toBe(0);
});

test("события идут от свежих к старым", () => {
  const overview = buildOverview(graph, story.incidents, later);
  expect(overview.events.length).toBeGreaterThan(0);
  for (const row of overview.events) {
    expect(row.id.length).toBeGreaterThan(0);
    expect(row.text.length).toBeGreaterThan(0);
    expect(row.time.length).toBeGreaterThan(0);
  }
});
