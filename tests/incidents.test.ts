import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { buildRows, defaultFilters, filtersHash, parseFilters, type IncidentFilters } from "../src/web/incidents.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const day = story.days.at(-1) as string;
const all = buildRows(graph, story.incidents, day, defaultFilters());

test("фильтры читаются из адреса и возвращаются в адрес", () => {
  const parsed = parseFilters("#incidents?q=З-015&priority=urgent&sla=ok&node=U6&sort=priority&at=2026-01-02");
  expect(parsed.q).toBe("З-015");
  expect(parsed.priority).toBe("urgent");
  expect(parsed.sla).toBe("ok");
  expect(parsed.node).toBe("U6");
  expect(parsed.sort).toBe("priority");
  expect(parseFilters("#incidents").sort).toBe("id");
  expect(filtersHash(defaultFilters(), "2026-01-02")).toBe("#incidents?at=2026-01-02");
  expect(decodeURIComponent(filtersHash(parsed, "2026-01-02"))).toContain("q=З-015");
});

test("список содержит все заявки и реальные поля модели", () => {
  expect(all.length).toBe(30);
  const row = all.find((r) => r.id === "З-015")!;
  expect(row.title.length).toBeGreaterThan(0);
  expect(row.nodeId).toMatch(/^U\d+$/);
  expect(["ok", "paused", "overdue", "none"]).toContain(row.phase);
  expect(row.lastEvent.length).toBeGreaterThan(0);
});

test("поиск, фильтры и сортировка работают по модели", () => {
  const search = buildRows(graph, story.incidents, day, { ...defaultFilters(), q: "З-015" });
  expect(search.map((r) => r.id)).toEqual(["З-015"]);
  const urgent = buildRows(graph, story.incidents, day, { ...defaultFilters(), priority: "urgent" });
  expect(urgent.length).toBeGreaterThan(0);
  expect(urgent.every((r) => r.priority === "urgent")).toBe(true);
  const paused = buildRows(graph, story.incidents, day, { ...defaultFilters(), sla: "paused" });
  expect(paused.every((r) => r.phase === "paused")).toBe(true);
  const byPriority = buildRows(graph, story.incidents, day, { ...defaultFilters(), sort: "priority" });
  const rank = { urgent: 0, normal: 1, routine: 2, none: 3 } as const;
  const ranks = byPriority.map((r) => rank[r.priority]);
  expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
});

test("пустой результат — это ноль строк, а не ошибка", () => {
  const none = buildRows(graph, story.incidents, day, { ...defaultFilters(), q: "нет-такой-заявки" });
  expect(none).toHaveLength(0);
});
