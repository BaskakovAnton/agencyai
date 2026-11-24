import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { renderDashboard } from "../src/web/dashboard-html.ts";
import { buildOverview } from "../src/web/overview.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;
const day = "2026-01-02";
const html = renderDashboard({ overview: buildOverview(graph, story.incidents, day), days, day });

test("обзор собран по композиции overview.html", () => {
  expect(html).toContain("data-dashboard");
  expect(html).toContain("kpi-grid");
  expect((html.match(/<ui-kpi/g) ?? []).length).toBe(4);
  expect((html.match(/data-kpi=/g) ?? []).length).toBe(4);
  expect(html).toContain("Активные обращения");
  expect(html).toContain("Требуют внимания");
  expect(html).toContain("На паузе");
  expect(html).toContain("Завершено");
  expect(html).toContain("data-day-select");
  expect(html).toContain("2 января 2026");
});

test("панели: внимание, события, распределение, контроль сроков", () => {
  expect(html).toContain("data-attention");
  expect((html.match(/<ui-panel/g) ?? []).length).toBeGreaterThanOrEqual(4);
  expect(html).toContain("Последние события");
  expect(html).toContain("Распределение обращений");
  expect(html).toContain("Контроль сроков");
  expect((html.match(/<ui-activity/g) ?? []).length).toBeGreaterThan(0);
});

test("таблицы и бейджи используют ui-компоненты и scope", () => {
  expect(html).toContain('scope="col"');
  expect((html.match(/<ui-badge/g) ?? []).length).toBeGreaterThan(0);
  expect((html.match(/<ui-sla/g) ?? []).length).toBeGreaterThan(0);
  expect(html).not.toContain("#incident/\"");
  expect(html).not.toContain('style="color');
});

test("нулевой срез объясняется текстом, а не пустотой", () => {
  const empty = renderDashboard({ overview: buildOverview(graph, story.incidents, "2020-01-01"), days, day: "2020-01-01" });
  expect(empty).toContain("нет заявок");
  expect(empty).toContain("data-empty-state");
});
