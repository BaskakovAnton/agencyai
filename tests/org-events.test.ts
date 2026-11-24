import { expect, test } from "bun:test";
import { appendEvents, eventsFor, eventsOfType, makeEvent, nextAssignmentId, nextEventId } from "../src/core/org/events.ts";
import { AT, GROUP_A } from "./org-fixture.ts";

const base = { id: "EV-0001", organizationId: GROUP_A, entityId: "З-001", entityType: "incident" as const, eventType: "IncidentCreated" as const, occurredAt: AT };

test("событие получает версию схемы и значения по умолчанию", () => {
  const event = makeEvent(base);
  expect(event.schemaVersion).toBe(1);
  expect(event.actorUserId).toBeNull();
  expect(event.payload).toEqual({});
  expect(event.eventType).toBe("IncidentCreated");
});

test("история append-only: прежний массив не изменяется", () => {
  const first = makeEvent(base);
  const history = appendEvents([], [first]);
  const second = makeEvent({ ...base, id: "EV-0002", eventType: "StatusChanged" });
  const extended = appendEvents(history, [second]);
  expect(history).toHaveLength(1);
  expect(extended).toHaveLength(2);
  expect(extended[0]?.id).toBe("EV-0001");
});

test("последовательные идентификаторы событий и назначений", () => {
  expect(nextEventId([])).toBe("EV-0001");
  expect(nextEventId([makeEvent(base)])).toBe("EV-0002");
  expect(nextAssignmentId([])).toBe("AS-0001");
  expect(nextAssignmentId([{ id: "AS-0007" }, { id: "AS-0003" }])).toBe("AS-0008");
});

test("фильтры по сущности и типу события", () => {
  const a = makeEvent(base);
  const b = makeEvent({ ...base, id: "EV-0002", entityId: "З-002", eventType: "StatusChanged" });
  expect(eventsFor([a, b], "З-002")).toHaveLength(1);
  expect(eventsOfType([a, b], "IncidentCreated")).toHaveLength(1);
});
