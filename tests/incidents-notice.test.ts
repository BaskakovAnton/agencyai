/** UX-3.2.4.2, блок E: пояснение ограничения F5 (DEC-UX-324-05). */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { buildRows, defaultFilters, parseFilters } from "../src/web/incidents.ts";
import { renderIncidents } from "../src/web/incidents-html.ts";
import { attributionNoticeNeeded, renderAttributionNotice } from "../src/web/incidents-notice.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const { repository } = createDemoOrgRepository(graph, 7);
const day = "2025-12-22";
const markup = (hash: string, historical: boolean) => {
  const filters = parseFilters("#incidents?" + hash);
  return renderIncidents({
    rows: buildRows(graph, story.incidents, day, filters, repository),
    days: story.days,
    day,
    filters,
    departments: repository.directory.departments,
    historical,
  });
};

test("E1: пояснение появляется при исторической дате и фильтре подразделения", () => {
  expect(attributionNoticeNeeded(true, "DEP-HOUSING")).toBe(true);
  expect(attributionNoticeNeeded(true, "none")).toBe(true);
  const html = markup("department=DEP-HOUSING", true);
  expect(html).toContain("data-f5-notice");
  expect(html).toContain("текущую атрибуцию обращения");
});

test("E2: пояснения нет без исторической даты или без фильтра подразделения", () => {
  expect(attributionNoticeNeeded(false, "DEP-HOUSING")).toBe(false);
  expect(attributionNoticeNeeded(true, "")).toBe(false);
  expect(markup("department=DEP-HOUSING", false)).not.toContain("data-f5-notice");
  expect(markup("view=review", true)).not.toContain("data-f5-notice");
  expect(markup("", true)).not.toContain("data-f5-notice");
});

test("E3: пояснение не распространяется на фильтры вне accountableOf", () => {
  for (const hash of ["view=attention", "q=З-0", "sla=overdue", "priority=urgent", "node=U6"]) {
    expect(markup(hash, true)).not.toContain("data-f5-notice");
  }
});

test("E4: пояснение информационное и не меняет разметку фильтров", () => {
  const markupHtml = renderAttributionNotice(true, "DEP-HOUSING");
  expect(markupHtml).toContain('role="note"');
  expect(markupHtml).not.toContain("<button");
  expect(markupHtml).not.toContain("<a ");
  expect(renderAttributionNotice(false, "DEP-HOUSING")).toBe("");
});
