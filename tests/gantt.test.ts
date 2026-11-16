import { expect, test } from "bun:test";
import { buildGantt } from "../src/core/gantt.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const jan2 = "2026-01-02";
const model = buildGantt(graph, story.incidents, jan2);

test("строки Ганта — только существующие заявки", () => {
  expect(model.rows.length).toBeGreaterThan(0);
  expect(model.rows.length).toBeLessThan(30);
  expect(model.rows.some((row) => row.isHero)).toBe(true);
  for (const row of model.rows) expect(row.startDay <= jan2).toBe(true);
});

test("полосы не выходят за выбранную дату и идут по возрастанию", () => {
  for (const row of model.rows) {
    expect(row.segments.length).toBeGreaterThan(0);
    for (const segment of row.segments) {
      expect(segment.fromDay <= jan2).toBe(true);
      expect(segment.toDay <= jan2).toBe(true);
      expect(segment.fromDay <= segment.toDay).toBe(true);
      expect(segment.fromColumn).toBeLessThanOrEqual(segment.toColumn);
    }
    // последняя полоса открыта — заявка всё ещё на этом узле
    expect(row.segments.at(-1)?.open).toBe(true);
    expect(row.segments.at(-1)?.toDay).toBe(jan2);
  }
});

test("перемотка вперёд добавляет строки и дни", () => {
  const later = buildGantt(graph, story.incidents, story.days.at(-1) as string);
  expect(later.rows.length).toBe(30);
  expect(later.days.length).toBeGreaterThan(model.days.length);
  expect(later.days.at(-1)).toBe(story.days.at(-1));
});

test("полосы героя обрезаны по дате, а на конец истории проходят весь маршрут спеки", () => {
  const hero = model.rows.find((row) => row.isHero);
  expect(hero?.title).toBe("Разбита дверь подъезда");
  expect(hero?.segments.map((segment) => segment.nodeId)).toEqual(["U1", "U6"]); // на 2 января

  const later = buildGantt(graph, story.incidents, story.days.at(-1) as string);
  expect(later.rows.find((row) => row.isHero)?.segments.map((segment) => segment.nodeId)).toEqual([
    "U1",
    "U6",
    "U7",
    "U19",
  ]);
});
