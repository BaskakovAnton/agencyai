import { expect, test } from "bun:test";
import { buildGitGraph } from "../src/core/gitgraph.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { renderNodeCard } from "../src/web/node-card.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const model = buildGitGraph(graph, story.incidents, "2026-01-02");
const commit = model.commits.find((item) => item.isHero && item.nodeId === "U6")!;

test("карточка узла: заявка, узел с названием, роль, часы в узле и SLA", () => {
  const html = renderNodeCard(commit, "#chat/З-015?at=2026-01-02");
  expect(html).toContain("data-node-card");
  expect(html).toContain("З-015");
  expect(html).toContain("U6");
  expect(html).toContain(commit.nodeTitle);
  expect(html).toContain("Депутат-диспетчер");
  expect(html).toContain("4 ч");
  expect(html).toContain("вне SLA");
  expect(html).toContain("data-sla");
});

test("карточка принимает фокус, чтобы клавиатура не терялась", () => {
  const html = renderNodeCard(commit, "#");
  expect(html).toContain('tabindex="-1"');
});

test("из карточки можно открыть чат этой заявки на эту дату или закрыть её", () => {
  const html = renderNodeCard(commit, "#chat/З-015?at=2026-01-02");
  expect(html).toContain('data-card-action="chat"');
  expect(html).toContain('href="#chat/З-015?at=2026-01-02"');
  expect(html).toContain('data-card-action="close"');
});

test("в карточке видны признаки развилки и слияния", () => {
  const fork = model.commits.find((item) => item.isFork)!;
  const merge = model.commits.find((item) => item.isMerge)!;
  expect(renderNodeCard(fork, "#")).toContain("развилка");
  expect(renderNodeCard(merge, "#")).toContain("слияние");
});
