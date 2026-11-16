import { expect, test } from "bun:test";
import { chatAt, conversationFor, messagesUpTo } from "../src/core/conversation.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import type { Incident } from "../src/types.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const hero = story.incidents.find((incident) => incident.id === "З-015") as Incident;

test("переписка З-015 идёт по маршруту U1 → U6 → U7 → U19 с текстами из спеки", () => {
  const messages = conversationFor(graph, hero);
  expect(messages.map((message) => message.nodeId)).toEqual(["U1", "U6", "U7", "U19"]);
  expect(messages.map((message) => message.role)).toEqual(["resident", "deputy", "contractor", "resident"]);
  expect(messages[0]?.text).toBe("Добрый день, разбита дверь в подъезде");
  expect(messages[1]?.text).toBe("Назначаю подрядчика");
  expect(messages[2]?.text).toBe("Принято, выезжаю");
  expect(messages[3]?.text).toBe("Работы выполнены, подтвердите");
  expect(messages.map((message) => message.author)).toEqual(["Житель", "Депутат-диспетчер", "Подрядчик", "Житель"]);
  expect(hero.title).toBe("Разбита дверь подъезда");
});

test("на 2 января в чате героя видны только первые две реплики", () => {
  const messages = conversationFor(graph, hero);
  expect(messages.map((message) => message.day)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-05"]);
  const upToJan2 = messagesUpTo(messages, "2026-01-02");
  expect(upToJan2.length).toBe(2);
  expect(upToJan2.map((message) => message.nodeId)).toEqual(["U1", "U6"]);
  expect(messagesUpTo(messages, "2025-12-31").length).toBe(0);
  expect(messagesUpTo(messages, "2030-01-01").length).toBe(4);
});

test("при смене узла меняются активная роль и собеседник", () => {
  const atJan1 = chatAt(graph, hero, "2026-01-01");
  expect(atJan1.activeRole).toBe("resident");
  expect(atJan1.interlocutor).toBe("deputy");
  expect(atJan1.nodeId).toBe("U1");

  const atJan3 = chatAt(graph, hero, "2026-01-03");
  expect(atJan3.activeRole).toBe("contractor");
  expect(atJan3.interlocutor).toBe("deputy");
  expect(atJan3.nodeId).toBe("U7");
  expect(atJan3.messages.length).toBe(3);

  const atJan5 = chatAt(graph, hero, "2026-01-05");
  expect(atJan5.activeRole).toBe("resident");
  expect(atJan5.interlocutor).toBe("contractor");
  expect(atJan5.nodeId).toBe("U19");
});

test("переписка есть у каждой заявки истории", () => {
  for (const incident of story.incidents) {
    const messages = conversationFor(graph, incident);
    expect(messages.length).toBe(incident.history.length + 1);
    expect(messages[0]?.nodeId).toBe("U1");
    expect(messages[0]?.role).toBe("resident");
    for (const message of messages) expect(message.day.length).toBe(10);
  }
});
