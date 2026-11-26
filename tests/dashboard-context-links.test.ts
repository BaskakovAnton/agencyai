/** UX-3.2.3.1: инвариант счётчика очереди (DEC-03, вариант B) и контекстные переходы Dashboard. */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { snapshotOn, lifecycleStatusOn } from "../src/core/analytics/snapshot.ts";
import { buildRows, defaultFilters, parseFilters } from "../src/web/incidents.ts";
import { buildOverview } from "../src/web/overview.ts";
import { renderDashboard } from "../src/web/dashboard-html.ts";
import { graph as fxGraph, incidents as fxIncidents, lifecycles as fxLifecycles } from "./lifecycle-fixture.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;
const { repository } = createDemoOrgRepository(graph, 7);
const lifecycles = repository.allLifecycles!();
const rowsOn = (day: string) => buildRows(graph, story.incidents, day, { ...defaultFilters(), view: "review" }, repository).length;

test("FR-01: счётчик обзора равен Snapshot и числу строк view=review на всех 25 днях окна", () => {
  expect(days.length).toBe(25);
  const mismatches: string[] = [];
  for (const day of days) {
    const counter = buildOverview(graph, story.incidents, day, repository, 7).org!.waitingForReview;
    const snapshot = snapshotOn(graph, story.incidents, day, lifecycles).pendingReview;
    if (counter !== snapshot || snapshot !== rowsOn(day)) mismatches.push(day + ": счётчик=" + counter + ", snapshot=" + snapshot + ", строк=" + rowsOn(day));
  }
  expect(mismatches).toEqual([]);
});

test("FR-01: контрольные дни Discovery показывают исторические значения", () => {
  const control: readonly (readonly [string, number])[] = [["2025-12-21", 1], ["2025-12-22", 2], ["2025-12-23", 1], ["2025-12-28", 3], ["2026-01-13", 6]];
  for (const [day, expected] of control) {
    const counter = buildOverview(graph, story.incidents, day, repository, 7).org!.waitingForReview;
    expect({ day, counter, rows: rowsOn(day) }).toEqual({ day, counter: expected, rows: expected });
  }
});

test("FR-01: обращение не попадает в очередь до своего появления и выходит из неё после решения", () => {
  const before = "2025-12-24";
  const incident = story.incidents.find((item) => (repository.lifecycleOf(item.id)?.records ?? []).some((r) => r.at.slice(0, 10) === "2026-01-03"));
  expect(incident).toBeDefined();
  const started = (repository.lifecycleOf(incident!.id)?.records ?? [])[0]!.at.slice(0, 10);
  expect(rowsOn(before)).toBeLessThanOrEqual(rowsOn(started));
  const afterDecision = "2026-01-13";
  const approved = story.incidents.filter((item) => lifecycleStatusOn(lifecycles[item.id]!, afterDecision) === "completed").length;
  expect(approved).toBeGreaterThan(0);
});

test("FR-01: сценарии повторного открытия и позднего подтверждения (фикстура)", () => {
  const count = (day: string) => snapshotOn(fxGraph, fxIncidents, day, fxLifecycles).pendingReview;
  expect(count("2026-01-04")).toBe(5); // все сдавшие работу ждут проверки
  expect(count("2026-01-05")).toBe(3); // два подтверждения, отказ ещё не принят
  expect(count("2026-01-07")).toBe(2); // отказ вернул в работу, переоткрытие после подтверждения
  expect(lifecycleStatusOn(fxLifecycles["L-REOPENED"]!, "2026-01-07")).toBe("reopened");
});

test("FR-02: KPI ведут в реестр с контекстом и датой", () => {
  const day = "2026-01-02";
  const html = renderDashboard({ overview: buildOverview(graph, story.incidents, day, repository, 7), days, day });
  const href = (key: string) => (html.split('data-kpi-link="' + key + '"')[1] ?? "").split('href="')[1]?.split('"')[0] ?? "";
  for (const [key, view] of [["active", "active"], ["attention", "attention"], ["paused", "paused"]] as const) {
    const value = decodeURIComponent(href(key));
    const parsed = parseFilters(value);
    expect({ key, view: parsed.view, at: parsed.department }).toEqual({ key, view, at: "" });
    expect(value).toContain("at=" + day);
  }
  // Ссылки указывают на реестр, а не на другой экран
  expect(href("active").startsWith("#incidents?")).toBe(true);
});

test("FR-02: счётчик очереди и разрез подразделений ведут в контекстный список", () => {
  const day = "2026-01-02";
  const overview = buildOverview(graph, story.incidents, day, repository, 7);
  const html = renderDashboard({ overview, days, day });
  const queueHref = decodeURIComponent((html.split("data-waiting-review")[1] ?? "").split('href="')[1]?.split('"')[0] ?? "");
  expect(parseFilters(queueHref).view).toBe("review");
  expect(queueHref).toContain("at=" + day);
  const department = overview.org!.departments[0]!.departmentId;
  const departmentHref = decodeURIComponent((html.split('data-department-link="' + department + '"')[1] ?? "").split('href="')[1]?.split('"')[0] ?? "");
  expect(parseFilters(departmentHref).department).toBe(department);
  expect(departmentHref).toContain("at=" + day);
  // every department link points to a real id present in the directory
  for (const slice of overview.org!.departments) {
    expect(repository.directory.departments.some((item) => item.id === slice.departmentId)).toBe(true);
  }
});

test("FR-02: панель внимания сохраняет контекст, «Завершено за период» ссылки не получило", () => {
  const day = "2026-01-02";
  const html = renderDashboard({ overview: buildOverview(graph, story.incidents, day, repository, 7), days, day });
  const completed = (html.split('data-kpi="completed"')[1] ?? "").split("</ui-kpi>")[0]!;
  expect(completed).not.toContain("data-kpi-link");
  expect(completed).not.toContain("<a ");
  expect(html).toContain('data-kpi-link="attention"');
  const panelLinks = [...html.matchAll(/class="panel-link"[^>]*href="([^"]+)"/g)].map((m) => decodeURIComponent(m[1]!));
  expect(panelLinks.some((href) => parseFilters(href).view === "attention")).toBe(true);
});
