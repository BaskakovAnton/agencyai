/** UX-3.2.4.2, блок C: панель активных фильтров. */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { defaultFilters, parseFilters } from "../src/web/incidents.ts";
import { filterChips, filtersWithout, renderFilterChips } from "../src/web/incidents-chips.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const { repository } = createDemoOrgRepository(graph, 7);
const days = story.days;
const name = (id: string) => repository.directory.departments.find((item) => item.id === id)?.name ?? id;
const chips = (hash: string) => filterChips(parseFilters("#incidents?" + hash), parseFilters("#incidents?" + hash).q === "" ? days.at(-1)! : days.at(-1)!, days, name);
const chipKeys = (hash: string, day = days.at(-1)!) => filterChips(parseFilters("#incidents?" + hash), day, days, name).map((chip) => chip.key);

test("C1: пустое состояние — чипов нет, панель не рендерится", () => {
  const empty = filterChips(defaultFilters(), days.at(-1)!, days, name);
  expect(empty).toEqual([]);
  expect(renderFilterChips(empty)).toBe("");
});

test("C2: каждый активный параметр даёт ровно один чип", () => {
  expect(chipKeys("view=review")).toEqual(["view"]);
  expect(chipKeys("department=DEP-HOUSING")).toEqual(["department"]);
  expect(chipKeys("q=З-0")).toEqual(["q"]);
  expect(chipKeys("priority=urgent")).toEqual(["priority"]);
  expect(chipKeys("sla=overdue")).toEqual(["sla"]);
  expect(chipKeys("node=U6")).toEqual(["node"]);
  expect(chipKeys("view=attention&department=DEP-ROADS&q=З-0&priority=urgent&sla=overdue&node=U6")).toEqual([
    "view", "department", "q", "priority", "sla", "node",
  ]);
});

test("C3: sort чипом не показывается, дата — только при явном выборе", () => {
  expect(chipKeys("sort=date")).toEqual([]);
  expect(chipKeys("view=review", days.at(-1)!)).not.toContain("at");
  expect(chipKeys("view=review", "2025-12-22")).toContain("at");
  const chip = filterChips(parseFilters("#incidents?view=review"), "2025-12-22", days, name).find((item) => item.key === "at")!;
  expect(chip.text).toBe("22 декабря 2025");
});

test("C4: снятие чипа не трогает остальные параметры", () => {
  const filters = parseFilters("#incidents?view=attention&department=DEP-HOUSING&q=З-0&priority=urgent&sla=overdue&node=U6");
  const withoutView = filtersWithout(filters, "view");
  expect(withoutView).toEqual({ ...filters, view: "all" });
  expect(filtersWithout(filters, "department").department).toBe("");
  expect(filtersWithout(filters, "q").q).toBe("");
  expect(filtersWithout(filters, "priority").priority).toBe("");
  expect(filtersWithout(filters, "sla").sla).toBe("");
  expect(filtersWithout(filters, "node").node).toBe("");
  expect(filtersWithout(filters, "at")).toEqual(filters); // дату снимает только сам чип даты
});

test("C5: чипы используют названия из модели и доступные кнопки снятия", () => {
  const markup = renderFilterChips(filterChips(parseFilters("#incidents?department=DEP-HOUSING&view=review"), days.at(-1)!, days, name));
  expect(markup).toContain('data-filter-chips');
  const title = name("DEP-HOUSING");
  expect(title.length).toBeGreaterThan(0);
  expect(markup).toContain(title); // название подразделения из справочника
  expect(markup).not.toContain("DEP-HOUSING");
  expect(markup).toContain('data-filter-clear="view"');
  expect(markup).toContain('aria-label="Снять фильтр: Представление — ждут подтверждения"');
  expect((markup.match(/<button/g) ?? []).length).toBe(2);
});

test("C6: чип «без ответственного» вместо технического none", () => {
  const markup = renderFilterChips(filterChips(parseFilters("#incidents?department=none"), days.at(-1)!, days, name));
  expect(markup).toContain("без ответственного");
  expect(markup).not.toContain(">none<");
  expect(markup).toContain('data-filter-clear="department"');
});
