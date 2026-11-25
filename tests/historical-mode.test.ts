import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { buildIncidentView } from "../src/web/incident.ts";
import { renderIncident } from "../src/web/incident-html.ts";
import { HISTORICAL_NOTICE, isHistoricalDay } from "../src/web/historical.ts";
import { lifecycleStatusOn } from "../src/core/analytics/snapshot.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;
const lastDay = days.at(-1)!;
const { repository } = createDemoOrgRepository(graph, 7);
const hero = story.incidents[0]!.id;

test("текущим считается последний день модели, остальные даты — исторические", () => {
  expect(isHistoricalDay(lastDay, days)).toBe(false);
  expect(isHistoricalDay("2026-01-02", days)).toBe(true);
  expect(isHistoricalDay("", days)).toBe(false);
  expect(isHistoricalDay("2026-01-02", [])).toBe(false);
});

test("в историческом режиме действия отключены и есть пояснение", () => {
  const view = buildIncidentView(graph, story.incidents, hero, "2026-01-02", repository, "USR-CONTROL")!;
  const historical = renderIncident(view, "2026-01-02", days, { historical: true });
  expect(historical).toContain(HISTORICAL_NOTICE);
  expect((historical.match(/data-org-action=/g) ?? []).length).toBe(4);
  expect((historical.match(/data-org-action="[a-z]+" disabled/g) ?? []).length).toBe(4);
  expect(historical).toContain("data-historical");
});

test("на текущей дате действия доступны по правилам домена", () => {
  const view = buildIncidentView(graph, story.incidents, hero, lastDay, repository, "USR-CONTROL")!;
  const current = renderIncident(view, lastDay, days, { historical: false });
  expect(current).not.toContain(HISTORICAL_NOTICE);
  expect(current).not.toContain("data-historical");
  // Хотя бы одно действие доступно: обращение не завершено и у него есть исполнитель.
  expect((current.match(/data-org-action="[a-z]+" disabled/g) ?? []).length).toBeLessThan(4);
});

test("состояние обращения в историческом срезе берётся на выбранную дату", () => {
  const lifecycle = repository.lifecycleOf(hero)!;
  const early = buildIncidentView(graph, story.incidents, hero, "2026-01-02", repository, "USR-CONTROL")!;
  const late = buildIncidentView(graph, story.incidents, hero, lastDay, repository, "USR-CONTROL")!;
  expect(early.orgSummary?.status).toBe(lifecycleStatusOn(lifecycle, "2026-01-02"));
  expect(late.orgSummary?.status).toBe(lifecycleStatusOn(lifecycle, lastDay));
  expect(renderIncident(early, "2026-01-02", days, { historical: true })).toContain("02.01");
});
