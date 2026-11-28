import { expect, test } from "bun:test";
import { buildGraph } from "../src/core/graph.ts";
import { NODES } from "../src/data/nodes.ts";
import { buildStory } from "../src/core/story.ts";
import { hoursSince, slaPhaseOnDay, slaStateAt } from "../src/core/sla-at.ts";
import { slaHoursLeft } from "../src/core/sla-attention.ts";

/**
 * Остаток норматива обязан считаться в той же системе отсчёта, что и фаза:
 * дедлайн в модели отсчитывается от создания заявки, а не от начала демонстрации.
 */
const graph = buildGraph(NODES);
const story = buildStory(graph, 7);
const day = "2026-01-02";
const dayEnd = day + "T23:59:59.999Z";

test("остаток норматива считается от создания заявки", () => {
  for (const incident of story.incidents) {
    const expected = Math.round(slaStateAt(incident, day).dueAt - hoursSince(incident.createdAt ?? dayEnd, dayEnd));
    expect(slaHoursLeft(incident, day), incident.id).toBe(expected);
  }
});

test("фаза «в срок» не может иметь отрицательный остаток", () => {
  const contradictions = story.incidents.filter(
    (incident) => slaPhaseOnDay(incident, day) === "ok" && slaHoursLeft(incident, day) < 0,
  );
  expect(contradictions.map((incident) => incident.id)).toEqual([]);
});

test("остаток у заявок «в срок» различается, а не совпадает для всех", () => {
  const values = new Set(
    story.incidents.filter((incident) => slaPhaseOnDay(incident, day) === "ok").map((incident) => slaHoursLeft(incident, day)),
  );
  expect(values.size).toBeGreaterThan(1);
});
