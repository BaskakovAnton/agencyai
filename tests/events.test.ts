import { expect, test } from "bun:test";
import { dayEvents } from "../src/core/events.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { HERO_INCIDENT_ID } from "../src/data/hero.ts";

/** События дня заменили коммиты Git-графа как источник списка событий. */
const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const day = "2026-01-02";
const events = dayEvents(graph, story.incidents, day);

test("события: создание заявки и переходы, только до выбранного дня", () => {
  expect(events.length).toBeGreaterThan(0);
  expect(events.every((event) => event.day <= day)).toBe(true);
  expect(events.every((event) => event.at !== "" && event.nodeId !== "")).toBe(true);
  expect(events.every((event) => event.hoursInNode > 0)).toBe(true);
});

test("события: идентификаторы уникальны и отсортированы по времени", () => {
  expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
  const times = events.map((event) => event.at);
  expect([...times].sort((a, b) => a.localeCompare(b))).toEqual(times);
});

test("события: фаза SLA у каждого события из четырёх допустимых", () => {
  expect(events.every((event) => ["ok", "paused", "overdue", "none"].includes(event.slaPhase))).toBe(true);
});

test("события: фильтр оставляет одну заявку, герой на 2 января — две фазы", () => {
  const filtered = dayEvents(graph, story.incidents, day, HERO_INCIDENT_ID);
  expect(filtered.length).toBeGreaterThan(0);
  expect(filtered.every((event) => event.incidentId === HERO_INCIDENT_ID)).toBe(true);
  expect(filtered.map((event) => event.slaPhase)).toEqual(["ok", "overdue"]);
});

test("события: без данных список пуст, а не выдуман", () => {
  expect(dayEvents(graph, [], day)).toEqual([]);
});
