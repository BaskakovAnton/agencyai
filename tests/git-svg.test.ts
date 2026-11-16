import { expect, test } from "bun:test";
import { buildGitGraph } from "../src/core/gitgraph.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { renderGitSvg } from "../src/web/git-svg.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const day = "2026-01-02";
const model = buildGitGraph(graph, story.incidents, day);

test("SVG содержит точку на каждый коммит и подписи всех узлов", () => {
  const svg = renderGitSvg(model);
  expect((svg.match(/data-commit="/g) ?? []).length).toBe(model.commits.length);
  expect(svg).toContain(">U1<");
  expect(svg).toContain(">U30<");
  expect(svg).toContain("viewBox=");
  expect(svg).toContain("data-graph");
});

test("фильтр по заявке оставляет только её коммиты и линии", () => {
  const svg = renderGitSvg(model, "З-015");
  const dots = (svg.match(/data-commit="/g) ?? []).length;
  expect(dots).toBe(2); // на 2 января у героя две реплики
  expect(svg).toContain("З-015");
  expect(svg).not.toContain('data-incident="З-001"');
});

test("герой отмечен классом hero, а в подписи дня нет будущих дат", () => {
  const svg = renderGitSvg(model);
  expect(svg).toContain('class="commit hero"');
  expect(svg).not.toContain("2026-01-03");
  expect(svg).toContain("2 января 2026");
  expect(svg).toContain('class="link');
});

test("день и узел каждого коммита попадают в data-атрибуты для клика и тултипа", () => {
  const svg = renderGitSvg(model, "З-015");
  expect(svg).toContain('data-incident="З-015"');
  expect(svg).toContain('data-node="U1"');
  expect(svg).toContain('data-day="2026-01-01"');
  expect(svg).toContain('data-role="resident"');
});
