import { expect, test } from "bun:test";
import { chatAt, conversationFor, messagesUpTo } from "../src/core/conversation.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import type { Incident } from "../src/types.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const hero = story.incidents.find((incident) => incident.id === "З-015") as Incident;
const replies = (incident: Incident) => conversationFor(graph, incident).filter((message) => message.kind === "message");

test("переписка З-015 идёт по маршруту U1 → U6 → U7 → U19 с текстами из спеки", () => {
  const messages = conversationFor(graph, hero);
  expect(replies(hero).map((message) => message.nodeId)).toEqual(["U1", "U6", "U7", "U19"]);
  expect(replies(hero).map((message) => message.role)).toEqual(["resident", "deputy", "contractor", "resident"]);
  expect(replies(hero)[0]?.text).toBe("Во дворе разбита дверь подъезда");
  expect(replies(hero)[1]?.text).toBe("Назначаю подрядчика");
  expect(replies(hero)[2]?.text).toBe("Принято, выезжаю");
  expect(replies(hero)[3]?.text).toBe("Работы выполнены, подтвердите");
  expect(messages.every((message) => message.author.length > 0)).toBe(true);
});

test("смена роли сопровождается системным сообщением", () => {
  const system = conversationFor(graph, hero).filter((message) => message.kind === "system");
  expect(system.map((message) => message.text)).toEqual([
    "Заявка передана в работу диспетчеру",
    "Подрядчик назначен",
    "Возврат к жителю",
  ]);
  expect(system.every((message) => message.role === "system")).toBe(true);
  expect(system[0]?.nodeId).toBe("U6");
});

test("на 2 января в чате героя видны только реплики до этой даты", () => {
  const messages = conversationFor(graph, hero);
  expect(replies(hero).map((message) => message.day)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-05"]);
  const upToJan2 = messagesUpTo(messages, "2026-01-02");
  expect(upToJan2.filter((message) => message.kind === "message").length).toBe(2);
  expect(upToJan2.filter((message) => message.kind === "system").length).toBe(1);
  expect(messagesUpTo(messages, "2025-12-31").length).toBe(0);
  expect(messagesUpTo(messages, "2030-01-01").length).toBe(messages.length);
});

test("активная роль берётся из последней реплики, а не из системного сообщения", () => {
  expect(chatAt(graph, hero, "2026-01-01").activeRole).toBe("resident");
  expect(chatAt(graph, hero, "2026-01-01").interlocutor).toBe("deputy");

  const atJan2 = chatAt(graph, hero, "2026-01-02");
  expect(atJan2.activeRole).toBe("deputy");
  expect(atJan2.interlocutor).toBe("resident");
  expect(atJan2.nodeId).toBe("U6");
  expect(atJan2.messages.filter((message) => message.kind === "system").length).toBe(1);

  expect(chatAt(graph, hero, "2026-01-03").activeRole).toBe("contractor");
  expect(chatAt(graph, hero, "2026-01-05").activeRole).toBe("resident");
  expect(chatAt(graph, hero, "2026-01-05").nodeId).toBe("U19");
});

test("переписка есть у каждой заявки истории, первая реплика — от жителя", () => {
  for (const incident of story.incidents) {
    const messages = conversationFor(graph, incident);
    const events = messages.filter((message) => !message.id.endsWith("#system"));
    expect(events.length).toBe(incident.history.length + 1);
    expect(events[0]?.nodeId).toBe("U1");
    expect(events[0]?.role).toBe("resident");
    expect(messages.every((message) => message.day.length === 10)).toBe(true);
  }
});
