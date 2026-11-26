/** UX-3.2.4.2, блок B: единые селекты «Представление» и «Подразделение». */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { buildRows, defaultFilters, parseFilters } from "../src/web/incidents.ts";
import { renderIncidents } from "../src/web/incidents-html.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const { repository } = createDemoOrgRepository(graph, 7);
const day = "2026-01-02";
const html = (hash = "") => {
  const filters = hash === "" ? defaultFilters() : parseFilters("#incidents?" + hash);
  return renderIncidents({
    rows: buildRows(graph, story.incidents, day, filters, repository),
    days: story.days,
    day,
    filters,
    departments: repository.directory.departments,
    historical: false,
  });
};
const options = (markup: string, name: string): string[] =>
  [...(markup.split('data-' + name + ' aria-label')[1]?.split("</select>")[0] ?? "").matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]!);

test("B1: селект «Представление» заменил «Подтверждение»", () => {
  const markup = html();
  expect(markup).not.toContain("data-filter-review");
  expect(markup).toContain("data-filter-view");
  expect(markup).toContain("Представление");
  expect(options(markup, "filter-view")).toEqual(["all", "active", "attention", "overdue", "paused", "review"]);
});

test("B2: селект подразделения собран из справочника и не содержит чисел", () => {
  const markup = html();
  const ids = options(markup, "filter-department");
  expect(ids).toEqual(["", ...repository.directory.departments.map((item) => item.id), "none"]);
  for (const department of repository.directory.departments) expect(markup).toContain(">" + department.name + "</option>");
  const optionTexts = [...markup.matchAll(/<option value="(?:DEP-[^"]*|none)">([^<]*)</g)].map((m) => m[1]!);
  expect(optionTexts.every((text) => !/[0-9]/.test(text))).toBe(true);
});

test("B3: «Без ответственного» есть только в селекте подразделения", () => {
  const markup = html();
  const viewBlock = markup.split("data-filter-view aria-label")[1]!.split("</select>")[0]!;
  expect(viewBlock).not.toContain("ответствен");
  expect(viewBlock).not.toContain("unassigned");
  expect(options(markup, "filter-department")).toContain("none");
});

test("B4: селекты отражают состояние фильтров из адреса", () => {
  const markup = html("at=" + day + "&view=attention&department=DEP-HOUSING");
  expect(markup).toContain('<option value="attention" selected>');
  expect(markup).toContain('<option value="DEP-HOUSING" selected>');
  const legacy = html("at=" + day + "&review=pending");
  expect(legacy).toContain('<option value="review" selected>');
});

test("B5: очередь подтверждения доступна из единого селекта и не пуста", () => {
  const markup = html("at=" + day + "&view=review");
  expect(markup).toContain('<option value="review" selected>');
  const rows = buildRows(graph, story.incidents, day, { ...defaultFilters(), view: "review" }, repository);
  expect(rows.length).toBe(6);
});
