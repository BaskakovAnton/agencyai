import { expect, test } from "bun:test";
import {
  CHAT_INCIDENT_ID,
  CHAT_INCIDENT_TITLE,
  CHAT_SCENARIO,
  activeRole,
  chatStart,
  clampStep,
  nextStep,
  prevStep,
  setRoleOverride,
  stepCount,
  visibleMessages,
} from "../src/web/chat.ts";

test("сценарий: заявка З-015 идёт по маршруту U1 → U6 → U7 → U19", () => {
  expect(CHAT_INCIDENT_ID).toBe("З-015");
  expect(CHAT_INCIDENT_TITLE).toContain("дверь");
  expect(CHAT_SCENARIO.map((s) => s.nodeId)).toEqual(["U1", "U6", "U7", "U19"]);
  expect(CHAT_SCENARIO.map((s) => s.role)).toEqual(["resident", "deputy", "contractor", "resident"]);
  expect(stepCount()).toBe(4);
});

test("активная роль определяется узлом", () => {
  expect(activeRole(CHAT_SCENARIO, chatStart())).toBe("resident");
  expect(activeRole(CHAT_SCENARIO, nextStep(chatStart()))).toBe("deputy");
  expect(activeRole(CHAT_SCENARIO, nextStep(nextStep(chatStart())))).toBe("contractor");
  expect(activeRole(CHAT_SCENARIO, nextStep(nextStep(nextStep(chatStart()))))).toBe("resident");
});

test("шаги не выходят за границы сценария", () => {
  let state = chatStart();
  for (let i = 0; i < 10; i += 1) state = nextStep(state);
  expect(state.step).toBe(3);
  for (let i = 0; i < 10; i += 1) state = prevStep(state);
  expect(state.step).toBe(0);
  expect(clampStep(-5)).toBe(0);
  expect(clampStep(99)).toBe(3);
});

test("сообщения накапливаются по шагам", () => {
  expect(visibleMessages(CHAT_SCENARIO, chatStart()).length).toBe(1);
  const afterU6 = visibleMessages(CHAT_SCENARIO, nextStep(chatStart()));
  expect(afterU6.some((m) => m.text.includes("передана в работу"))).toBe(true);
  const afterU7 = visibleMessages(CHAT_SCENARIO, nextStep(nextStep(chatStart())));
  expect(afterU7.some((m) => m.text.includes("Бригада выехала"))).toBe(true);
  const afterU19 = visibleMessages(CHAT_SCENARIO, nextStep(nextStep(nextStep(chatStart()))));
  expect(afterU19.some((m) => m.text.includes("Подтвердите"))).toBe(true);
});

test("ручное переключение роли перекрывает роль узла и снимается", () => {
  const manual = setRoleOverride(chatStart(), "assistant");
  expect(activeRole(CHAT_SCENARIO, manual)).toBe("assistant");
  expect(activeRole(CHAT_SCENARIO, nextStep(manual))).toBe("assistant");
  expect(activeRole(CHAT_SCENARIO, setRoleOverride(manual, null))).toBe("resident");
});

test("у шага U7 есть SLA-карточка и подсказка о выезде", () => {
  const u7 = CHAT_SCENARIO[2]!;
  expect(u7.card).toBe("sla");
  expect(u7.icon).toBeTruthy();
  expect(u7.system ?? "").toContain("подрядчик");
});
