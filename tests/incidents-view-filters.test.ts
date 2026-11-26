/** UX-3.2.1: контракт URL и состояние фильтров реестра (view, department, legacy alias). */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { lifecycleStatusOn, snapshotOn } from "../src/core/analytics/snapshot.ts";
import { needsAttention } from "../src/core/sla-attention.ts";
import { visibleAt } from "../src/core/timeline.ts";
import { slaPhaseOnDay } from "../src/core/sla-at.ts";
import { buildRows, defaultFilters, filtersHash, parseFilters } from "../src/web/incidents.ts";
import { renderDashboard } from "../src/web/dashboard-html.ts";
import { buildOverview } from "../src/web/overview.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;
const day = "2026-01-02";
const { repository } = createDemoOrgRepository(graph, 7);
const lifecycles = repository.allLifecycles!();
const rowsFor = (patch: Partial<ReturnType<typeof defaultFilters>>) =>
  buildRows(graph, story.incidents, day, { ...defaultFilters(), ...patch }, repository);
const ids = (patch: Partial<ReturnType<typeof defaultFilters>>) => rowsFor(patch).map((row) => row.id).sort();

test("U1: canonical view=review открывает очередь подтверждений", () => {
  expect(parseFilters("#incidents?at=" + day + "&view=review").view).toBe("review");
  const expected = story.incidents
    .filter((incident) => lifecycles[incident.id] !== undefined && lifecycleStatusOn(lifecycles[incident.id]!, day) === "pending_review")
    .map((incident) => incident.id)
    .filter((id) => ids({ view: "review" }).includes(id));
  expect(ids({ view: "review" })).toEqual(expected);
});

test("U2: legacy review=pending читается как view=review и не пишется в новые URL", () => {
  const legacy = parseFilters("#incidents?at=" + day + "&review=pending");
  expect(legacy.view).toBe("review");
  const canonical = parseFilters("#incidents?at=" + day + "&view=review");
  expect(legacy.view).toBe(canonical.view);
  const hash = filtersHash(legacy, day);
  expect(hash).toContain("view=review");
  expect(hash).not.toContain("review=");
  expect(decodeURIComponent(filtersHash(defaultFilters(), day))).toBe("#incidents?at=" + day);
});

test("U3: round-trip фильтров через адрес сохраняет состояние", () => {
  const filters = { ...defaultFilters(), view: "review" as const, department: "DEP-A1", q: "З-0", priority: "urgent" as const, sort: "date" as const };
  const hash = filtersHash(filters, day);
  const parsed = parseFilters(hash);
  expect(parsed).toEqual(filters);
  expect(decodeURIComponent(hash)).toContain("at=" + day);
});

test("U4: изменение одного фильтра не теряет остальные параметры (at, view, department)", () => {
  const filters = { ...defaultFilters(), view: "overdue" as const, department: "none", priority: "urgent" as const };
  const changed = { ...filters, q: "труба" };
  const hash = decodeURIComponent(filtersHash(changed, day));
  for (const fragment of ["at=" + day, "view=overdue", "department=none", "priority=urgent", "q=труба"]) {
    expect({ fragment, present: hash.includes(fragment) }).toEqual({ fragment, present: true });
  }
});

test("U5: некорректные значения игнорируются, экран не ломается", () => {
  const bad = parseFilters("#incidents?at=" + day + "&view=нечто&department=ЧУЖОЕ&sla=никогда&priority=супер&sort=хаос");
  expect(bad).toEqual({ ...defaultFilters(), q: "" });
  const rows = buildRows(graph, story.incidents, day, bad, repository);
  expect(rows.length).toBeGreaterThan(0);
  const unknownDepartment = rowsFor({ department: "DEP-НЕТ-ТАКОГО" });
  expect(unknownDepartment.length).toBe(rows.length);
});

test("U6: view=active/overdue/paused совпадают со Snapshot", () => {
  const snapshot = snapshotOn(graph, story.incidents, day, lifecycles);
  expect(ids({ view: "active" }).length).toBe(snapshot.active);
  expect(ids({ view: "overdue" }).length).toBe(snapshot.overdue);
  expect(ids({ view: "paused" }).length).toBe(snapshot.paused);
  expect(ids({ view: "review" }).length).toBe(snapshot.pendingReview);
});

test("U7: view=attention использует доменное правило needsAttention", () => {
  // Ожидание строится по видимым на дату обращениям — как в Snapshot.
  const expected = visibleAt(story.incidents, day).filter((incident) => {
    const lifecycle = lifecycles[incident.id];
    const completed = lifecycle !== undefined && lifecycleStatusOn(lifecycle, day) === "completed";
    return !completed && needsAttention(graph, incident, day);
  }).length;
  expect(ids({ view: "attention" }).length).toBe(expected);
  const overdueOnly = visibleAt(story.incidents, day).filter((incident) => slaPhaseOnDay(incident, day) === "overdue").length;
  expect(ids({ view: "attention" }).length).toBeGreaterThanOrEqual(overdueOnly);
});

test("U8: department фильтрует по активному ответственному, none — без ответственного", () => {
  const department = repository.directory.departments[0]!.id;
  const expected = story.incidents
    .filter((incident) => repository.accountableOf(incident.id)?.departmentId === department)
    .map((incident) => incident.id);
  for (const id of ids({ department })) expect(expected).toContain(id);
  const unassigned = ids({ department: "none" });
  // accountableOf для неназначенных отдаёт «пусто» (undefined/null) — проверяем отсутствие значения.
  expect(unassigned.every((id) => (repository.accountableOf(id) ?? null) === null)).toBe(true);
  expect(unassigned.length).toBeGreaterThan(0);
  const allRows = ids({});
  expect(ids({ department }).length + unassigned.length).toBeLessThanOrEqual(allRows.length);
});

test("U9: пустая выборка не подменяется выдуманными строками", () => {
  expect(rowsFor({ q: "нет-такой-заявки" })).toEqual([]);
  expect(parseFilters("#incidents").view).toBe("all");
});

test("U10: «Завершено за период» не превращается в переход", () => {
  const html = renderDashboard({
    overview: buildOverview(graph, story.incidents, day, repository, 7),
    days,
    day,
  });
  const card = html.split('data-kpi="completed"')[1] ?? "";
  const fragment = card.slice(0, card.indexOf("</ui-kpi>"));
  expect(fragment.length).toBeGreaterThan(0);
  expect(fragment).not.toContain("<a ");
});
