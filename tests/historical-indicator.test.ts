import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { renderDashboard } from "../src/web/dashboard-html.ts";
import { renderIncidents } from "../src/web/incidents-html.ts";
import { buildOverview } from "../src/web/overview.ts";
import { buildRows, defaultFilters } from "../src/web/incidents.ts";
import { isHistoricalDay } from "../src/web/historical.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;
const lastDay = days.at(-1)!;
const historicalDay = "2026-01-02";
const { repository } = createDemoOrgRepository(graph, 7);

test("индикатор исторического режима на Dashboard содержит дату", () => {
  const historical = renderDashboard({
    overview: buildOverview(graph, story.incidents, historicalDay, repository, 7),
    days,
    day: historicalDay,
    historical: true,
  });
  expect(historical).toContain("data-historical-indicator");
  expect(historical).toContain("2 января 2026");
  expect(historical).toContain("Исторический срез");

  const current = renderDashboard({
    overview: buildOverview(graph, story.incidents, lastDay, repository, 7),
    days,
    day: lastDay,
    historical: false,
  });
  expect(current).not.toContain("data-historical-indicator");
});

test("индикатор исторического режима в реестре содержит дату", () => {
  const rows = buildRows(graph, story.incidents, historicalDay, defaultFilters(), repository);
  const historical = renderIncidents({ rows, days, day: historicalDay, filters: defaultFilters(), historical: true });
  expect(historical).toContain("data-historical-indicator");
  expect(historical).toContain("2 января 2026");
  expect(historical).toContain("Исторический срез");

  const current = renderIncidents({ rows, days, day: lastDay, filters: defaultFilters(), historical: false });
  expect(current).not.toContain("data-historical-indicator");
});

test("историчность определяется одним правилом для всех экранов", () => {
  expect(isHistoricalDay(historicalDay, days)).toBe(true);
  expect(isHistoricalDay(lastDay, days)).toBe(false);
});
