import { expect, test } from "bun:test";
import { buildGantt } from "../src/core/gantt.ts";
import { buildGitGraph } from "../src/core/gitgraph.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import {
  renderCanvas,
  renderLegends,
  renderTimeRuler,
  renderTimelineFooter,
  renderTimelineHeader,
  type TimelinePageInput,
} from "../src/web/timeline-html.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = ["2025-12-31", "2026-01-01", "2026-01-02"];
const input: TimelinePageInput = {
  day: "2026-01-02",
  days,
  dayIndex: 2,
  view: "git",
  filter: "",
  git: buildGitGraph(graph, story.incidents, "2026-01-02"),
  gantt: buildGantt(graph, story.incidents, "2026-01-02"),
  chat: "",
};

test("горизонтальная шкала времени: тики по суткам и часы выбранного дня", () => {
  const html = renderTimeRuler(input);
  expect(html).toContain("data-ruler");
  expect((html.match(/data-ruler-day=/g) ?? []).length).toBe(days.length);
  expect(html).toContain('data-ruler-day="2026-01-02"');
  expect((html.match(/data-ruler-hour=/g) ?? []).length).toBe(24);
  expect(html).toContain("2 января 2026");
  expect(html).toContain("data-ruler-marker");
});

test("дни шкалы называют дату для скринридера и отмечают текущий", () => {
  const html = renderTimeRuler(input);
  expect(html).toContain('aria-label="02 · 2 января 2026"');
  expect(html).toContain('aria-current="date"');
});

test("канвас, ползунок и футер доступны и объясняют управление", () => {
  const canvas = renderCanvas(input);
  expect(canvas).toContain("data-canvas");
  expect(canvas).toContain('tabindex="0"');
  expect(canvas).toContain('role="region"');
  expect(canvas).toContain("aria-label=");
  const header = renderTimelineHeader(input);
  expect(header).toContain('aria-valuetext="2 января 2026"');
  expect(header).toContain("data-controls");
  const footer = renderTimelineFooter();
  expect(footer).toContain("карточк");
  expect(footer).not.toContain("открывает мобильный чат");
});

test("легенды объясняют цвета SLA и значки развилок и слияний", () => {
  const html = renderLegends(input);
  ["в срок", "вне SLA", "на паузе", "развилка", "слияние"].forEach((label) => expect(html).toContain(label));
  expect(html).toContain("data-legend-sla");
  expect(html).toContain("data-legend-graph");
});
