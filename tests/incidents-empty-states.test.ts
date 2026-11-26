/** UX-3.2.4.2, блок D: контекстные пустые ��остояния (DEC-UX-324-06). */
import { expect, test } from "bun:test";
import { parseFilters, defaultFilters } from "../src/web/incidents.ts";
import { emptyReasonFor, emptyStateFor, renderEmptyIncidents } from "../src/web/incidents-empty.ts";

const filters = (hash = "") => (hash === "" ? defaultFilters() : parseFilters("#incidents?" + hash));

test("D1: непустой список не даёт пустого состояния", () => {
  expect(emptyReasonFor(filters("view=review"), 6)).toBeNull();
  expect(emptyStateFor(filters("view=review"), 6)).toBeNull();
});

test("D2: различаются семь сценариев", () => {
  expect(emptyReasonFor(filters(), 0)).toBe("no-data");
  expect(emptyReasonFor(filters("q=нет-такого"), 0)).toBe("search");
  expect(emptyReasonFor(filters("view=paused"), 0)).toBe("view");
  expect(emptyReasonFor(filters("department=DEP-ARCHIVE"), 0)).toBe("department");
  expect(emptyReasonFor(filters("department=none"), 0)).toBe("unassigned");
  expect(emptyReasonFor(filters("view=attention&department=DEP-ROADS"), 0)).toBe("combination");
  expect(emptyReasonFor(filters("view=attention&q=З-0&department=DEP-ROADS"), 0)).toBe("combination");
});

test("D3: приоритет причин — комбинация выше отдельного фильтра", () => {
  expect(emptyReasonFor(filters("q=нет-такого&view=paused&department=none"), 0)).toBe("combination");
  expect(emptyReasonFor(filters("view=paused&department=none"), 0)).toBe("combination");
});

test("D4: каждый сценарий имеет свой заголовок и пояснение", () => {
  const titles = new Set<string>();
  for (const hash of ["", "q=нет", "view=paused", "department=DEP-ARCHIVE", "department=none", "view=attention&department=DEP-ROADS"]) {
    const state = emptyStateFor(filters(hash), 0)!;
    expect(state.title.length).toBeGreaterThan(0);
    expect(state.note.length).toBeGreaterThan(0);
    titles.add(state.title);
  }
  expect(titles.size).toBe(6);
});

test("D5: действие снимает один конкретный фильтр, а не всё подряд", () => {
  const search = emptyStateFor(filters("q=нет-такого"), 0)!;
  expect(search.action).toEqual({ label: "Очистить поиск", clear: "q" });
  const department = emptyStateFor(filters("department=DEP-ARCHIVE"), 0)!;
  expect(department.action).toEqual({ label: "Снять фильтр подразделения", clear: "department" });
  const view = emptyStateFor(filters("view=paused"), 0)!;
  expect(view.action?.clear).toBe("view");
  const combination = emptyStateFor(filters("view=paused&q=нет"), 0)!;
  expect(combination.action).toEqual({ label: "Сбросить фильтры" });
});

test("D6: разметка содержит причину и доступное действие", () => {
  const markup = renderEmptyIncidents(emptyStateFor(filters("q=нет-такого"), 0)!);
  expect(markup).toContain('data-incidents-empty="search"');
  expect(markup).toContain("По запросу ничего не найдено");
  expect(markup).toContain('data-filter-clear="q"');
  const noData = renderEmptyIncidents(emptyStateFor(filters(), 0)!);
  expect(noData).toContain('data-incidents-empty="no-data"');
  expect(noData).not.toContain("<button");
  const combo = renderEmptyIncidents(emptyStateFor(filters("view=paused&q=нет"), 0)!);
  expect(combo).toContain("data-reset");
  expect(combo).not.toContain("data-filter-clear");
});
