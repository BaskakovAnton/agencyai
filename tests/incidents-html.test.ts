import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { buildRows, defaultFilters } from "../src/web/incidents.ts";
import { renderIncidents } from "../src/web/incidents-html.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;
const day = story.days.at(-1) as string;
const rows = buildRows(graph, story.incidents, day, defaultFilters());
const html = renderIncidents({ rows, days, day, filters: defaultFilters() });

test("таблица обращений содержит реальные колонки и строки", () => {
  expect(html).toContain("data-incidents-table");
  expect(html).toContain("Номер");
  expect(html).toContain("Приоритет");
  expect(html).toContain("Узел");
  expect(html).toContain("SLA");
  expect(html).toContain("Последнее событие");
  expect((html.match(/data-incident-row=/g) ?? []).length).toBe(rows.length);
  expect(html).toContain('href="#incident/' + encodeURIComponent("З-015"));
});

test("панель фильтров: поиск, приоритет, SLA, узел, сортировка, сброс", () => {
  expect(html).toContain("data-search");
  expect(html).toContain("data-filter-priority");
  expect(html).toContain("data-filter-sla");
  expect(html).toContain("data-filter-node");
  expect(html).toContain("data-sort");
  expect(html).toContain("data-reset");
});

test("пустой результат показывает понятное сообщение", () => {
  const empty = renderIncidents({ rows: [], days, day, filters: defaultFilters() });
  expect(empty).toContain("Ничего не найдено");
});
