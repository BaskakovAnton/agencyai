import { expect, test } from "bun:test";
import { buildGitGraph } from "../src/core/gitgraph.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const jan2 = "2026-01-02";
const model = buildGitGraph(graph, story.incidents, jan2);

test("колонки графа — все 30 узлов в порядке процесса", () => {
  expect(model.columns.length).toBe(30);
  expect(model.columns[0]?.nodeId).toBe("U1");
  expect(model.columns[29]?.nodeId).toBe("U30");
  expect(model.columns.map((column) => column.index)).toEqual([...Array(30).keys()]);
});

test("на выбранную дату в графе нет будущих коммитов и заявок", () => {
  expect(model.commits.length).toBeGreaterThan(0);
  for (const commit of model.commits) expect(commit.day <= jan2).toBe(true);
  expect(model.days.every((value) => value <= jan2)).toBe(true);
  expect(model.incidents.length).toBeGreaterThan(0);
  expect(model.incidents.length).toBeLessThan(30);
  expect(model.incidents).toContain("З-015"); // герой создан 1 января
});

test("линии соединяют последовательные коммиты одной заявки", () => {
  expect(model.links.length).toBe(model.commits.length - model.incidents.length);
  for (const link of model.links) {
    const from = model.commits.find((commit) => commit.id === link.from);
    const to = model.commits.find((commit) => commit.id === link.to);
    expect(from?.incidentId).toBe(link.incidentId);
    expect(to?.incidentId).toBe(link.incidentId);
    expect((to?.day as string) >= (from?.day as string)).toBe(true);
  }
});

test("граф меняется при перемотке: на конец истории коммитов больше", () => {
  const later = buildGitGraph(graph, story.incidents, story.days.at(-1) as string);
  expect(later.commits.length).toBeGreaterThan(model.commits.length);
  expect(later.incidents.length).toBe(30);
  expect(later.commits.every((commit) => commit.nodeIndex >= 0 && commit.nodeIndex < 30)).toBe(true);
});

test("герой отмечен и у него есть своя цепочка узлов", () => {
  const heroCommits = model.commits.filter((commit) => commit.isHero);
  expect(heroCommits.length).toBeGreaterThan(0);
  expect(heroCommits[0]?.nodeId).toBe("U1");
  expect(heroCommits.every((commit) => commit.incidentId === "З-015")).toBe(true);
});
