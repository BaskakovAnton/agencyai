import { expect, test } from "bun:test";
import { chatAt } from "../src/core/conversation.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { renderMessages, renderPhone } from "../src/web/chat-html.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const hero = story.incidents.find((i) => i.id === "З-015")!;
const day = "2026-01-02";
const snapshot = chatAt(graph, hero, day);

test("чат честно помечен как «только чтение»", () => {
  const html = renderPhone({
    incident: hero,
    snapshot,
    activeRole: snapshot.activeRole,
    interlocutor: snapshot.interlocutor,
    overridden: false,
    backHref: "#timeline",
    nextDay: "",
    prevDay: "",
    nodeTitle: graph.byId[snapshot.nodeId]?.title ?? "",
    slaPhase: "ok",
  });
  expect(html).toContain("data-readonly");
  expect(html).toContain("Только чтение");
  expect(html).not.toContain("<input");
  expect(html).not.toContain("<textarea");
});

test("у каждой реплики виден отправитель и его роль", () => {
  const html = renderMessages(snapshot, snapshot.activeRole);
  const messages = snapshot.messages.filter((m) => m.kind === "message");
  expect((html.match(/data-role-label/g) ?? []).length).toBe(messages.length);
  expect(html).toContain("Житель");
  expect(html).toContain("Депутат-диспетчер");
});
