/** UX-3.1: согласованность Dashboard, реестра и карточки по статусам обращения. */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { lifecycleStatusOn, snapshotOn } from "../src/core/analytics/snapshot.ts";
import { buildOverview } from "../src/web/overview.ts";
import { buildRows, defaultFilters } from "../src/web/incidents.ts";
import { buildIncidentView } from "../src/web/incident.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const { repository } = createDemoOrgRepository(graph, 7);
const days = ["2026-01-02", "2026-01-03", "2026-01-05"];

test("обзор и доменный Snapshot показывают одно и то же", () => {
  for (const day of days) {
    const overview = buildOverview(graph, story.incidents, day, repository, 7);
    const state = snapshotOn(graph, story.incidents, day, repository.allLifecycles!());
    expect({ day, ...overview.kpi }).toEqual({
      day,
      active: state.active,
      attention: state.attention,
      paused: state.paused,
      completed: state.finished,
      total: state.total,
    });
  }
});

test("карточка показывает статус на выбранную дату, а не текущий", () => {
  for (const day of days) {
    for (const incident of story.incidents) {
      const lifecycle = repository.lifecycleOf(incident.id);
      if (!lifecycle) continue;
      const view = buildIncidentView(graph, story.incidents, incident.id, day, repository, "USR-CONTROL");
      expect(view).not.toBeNull();
      const expected = lifecycleStatusOn(lifecycle, day);
      expect({ day, id: incident.id, status: view!.orgSummary?.status }).toEqual({ day, id: incident.id, status: expected });
    }
  }
});

test("реестр не противоречит Snapshot по числу активных и завершённых", () => {
  const day = "2026-01-03";
  const rows = buildRows(graph, story.incidents, day, defaultFilters(), repository);
  const state = snapshotOn(graph, story.incidents, day, repository.allLifecycles!());
  // Завершённым считается обращение, у которого последняя применимая запись — подтверждение.
  const completed = story.incidents.filter((incident) => {
    const records = (repository.lifecycleOf(incident.id)?.records ?? [])
      .filter((record) => record.at.slice(0, 10) <= day)
      .sort((a, b) => a.at.localeCompare(b.at));
    return records.at(-1)?.type === "approved";
  }).length;
  expect(rows.length).toBeGreaterThan(0);
  expect(state.finished).toBe(completed);
  expect(state.active).toBe(state.total - state.finished);
  expect(state.pendingReview).toBeLessThanOrEqual(state.active);
});
