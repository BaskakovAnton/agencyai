import { expect, test } from "bun:test";
import { NAV_ITEMS, renderNav } from "../src/web/nav.ts";
import { parseRoute } from "../src/web/router.ts";
import { renderShell } from "../src/web/shell.ts";

const timeline = parseRoute("#timeline?at=2026-01-02&view=gantt");
const dashboard = parseRoute("#dashboard");

test("оболочка: сайдбар, топбар, контент и переключатель темы", () => {
  const html = renderShell({ route: timeline, title: "Хронология", subtitle: "Диаграмма Ганта", content: "<p>тело</p>" });
  expect(html).toContain("data-sidebar");
  expect(html).toContain("data-topbar");
  expect(html).toContain("data-theme-toggle");
  expect(html).toContain("data-menu");
  expect(html).toContain('id="view"');
  expect(html).toContain("Хронология");
  expect(html).toContain("Диаграмма Ганта");
  expect(html).toContain("ДЕПУТАТ 360°");
  expect(html).toContain("ПРИЁМНАЯ ДЕПУТАТА");
  expect(html).not.toContain("<b>agencyai</b>");
  expect(html).toContain("<p>тело</p>");
  expect((html.match(/data-nav=/g) ?? []).length).toBe(NAV_ITEMS.length);
});

test("навигация: шесть разделов и активный пункт", () => {
  expect(NAV_ITEMS.length).toBe(6);
  const html = renderNav(timeline);
  expect(html).toContain('href="#dashboard"');
  expect(html).toContain('href="#incidents"');
  expect(html).toContain('href="#timeline"');
  expect(html).toContain('href="#chat/');
  expect(html).toContain('href="#model"');
  expect(html).toContain('href="#appeal"');
  expect(html).toContain('data-nav="timeline"');
  expect(html).toContain('aria-current="page"');
});
