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

test("обзор показывает KPI-карточки и срез даты", () => {
  expect(html).toContain("data-kpi");
  expect(html).toContain("Всего заявок");
  expect(html).toContain("Требуют внимания");
  expect(html).toContain("На паузе");
  expect(html).toContain("Просрочено");
  expect(html).toContain('data-day-select');
  expect(html).toContain("2 января 2026");
});

test("блок внимания ведёт в карточку обращения с датой", () => {
  expect(html).toContain("data-attention");
  expect(html).toContain("#incident/");
  expect(html).toContain("at=" + day);
});

test("быстрые переходы ведут в обращения и хронологию", () => {
  expect(html).toContain('href="#incidents');
  expect(html).toContain('href="#timeline');
});

test("композиция в стиле эталона: полоса дней, группы, график, матрица, сводка, процесс", () => {
  expect(html).toContain("data-day-strip");
  expect((html.match(/data-day-chip=/g) ?? []).length).toBe(6);
  expect(html).toContain("data-group-tiles");
  expect((html.match(/data-group-tile=/g) ?? []).length).toBe(6);
  expect(html).toContain("data-daily-chart");
  expect(html).toContain("data-sla-matrix");
  expect((html.match(/data-matrix-row=/g) ?? []).length).toBe(4);
  expect(html).toContain('scope="col"');
  expect(html).toContain("data-summary");
  expect(html).toContain("data-workflow");
  expect(html).not.toContain('style="color');
});

test("нулевой срез объясняется текстом, а не пустотой", () => {
  const empty = renderDashboard({ overview: buildOverview(graph, story.incidents, "2020-01-01"), days, day: "2020-01-01" });
  expect(empty).toContain("нет заявок");
});
