import { expect, test } from "bun:test";
import {
  CREATION_STEP_HOURS,
  DEMO_ORIGIN,
  addHours,
  createdFor,
  dayOf,
  daysRange,
  formatDay,
  historyUpTo,
  incidentAt,
  isVisible,
  lastAt,
  visibleAt,
  withTimeline,
} from "../src/core/timeline.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { hoursFor } from "../src/data/sla.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { mulberry32 } from "../src/random.ts";
import type { Incident } from "../src/types.ts";

const graph = buildProcessGraph();

test("дни и часы: разбор, сложение и формат", () => {
  expect(dayOf("2026-01-02T14:20:00.000Z")).toBe("2026-01-02");
  expect(addHours("2026-01-02T00:00:00.000Z", 24)).toBe("2026-01-03T00:00:00.000Z");
  expect(createdFor(0)).toBe(DEMO_ORIGIN);
  expect(createdFor(2)).toBe(addHours(DEMO_ORIGIN, CREATION_STEP_HOURS * 2));
  expect(formatDay("2026-01-02")).toBe("2 января 2026");
  expect(formatDay("2025-12-20")).toBe("20 декабря 2025");
});

test("withTimeline проставляет даты переходов по часам узлов", () => {
  const incident = generateIncidents(graph, mulberry32(5))[0] as Incident;
  const moved: Incident = {
    ...incident,
    nodeId: "U2",
    history: [
      { step: 1, from: "U1", to: "U2", actor: "auto", note: "шаг вперёд" },
      { step: 2, from: "U2", to: "U3", actor: "auto", note: "шаг вперёд" },
    ],
  };
  const stamped = withTimeline(moved, DEMO_ORIGIN);
  expect(stamped.createdAt).toBe(DEMO_ORIGIN);
  expect(stamped.history[0]?.at).toBe(addHours(DEMO_ORIGIN, hoursFor("U2")));
  expect(stamped.history[1]?.at).toBe(addHours(addHours(DEMO_ORIGIN, hoursFor("U2")), hoursFor("U3")));
  expect(lastAt(stamped)).toBe(stamped.history[1]?.at as string);
});

test("incidentAt показывает заявку на конец дня: узел и история обрезаны", () => {
  const base = generateIncidents(graph, mulberry32(6))[0] as Incident;
  // U12 = 8 ч, U13 = 72 ч: переходы попадают в разные дни
  const story = withTimeline(
    {
      ...base,
      nodeId: "U13",
      history: [
        { step: 1, from: "U1", to: "U12", actor: "auto", note: "" },
        { step: 2, from: "U12", to: "U13", actor: "auto", note: "" },
      ],
    },
    "2025-12-20T09:00:00.000Z",
  );
  expect(story.history[0]?.at).toBe("2025-12-20T17:00:00.000Z");
  expect(story.history[1]?.at).toBe("2025-12-23T17:00:00.000Z");

  const snapshot = incidentAt(story, "2025-12-21");
  expect(snapshot.nodeId).toBe("U12");
  expect(snapshot.history.length).toBe(1);
  // 20 декабря в 17:00 заявка уже перешла на U12, а на U13 попадёт только 23-го
  expect(incidentAt(story, "2025-12-20").nodeId).toBe("U12");
  expect(incidentAt(story, "2025-12-22").nodeId).toBe("U12");
  expect(incidentAt(story, "2025-12-23").nodeId).toBe("U13");
  expect(incidentAt(story, "2030-01-01").nodeId).toBe("U13");
  expect(historyUpTo(story, "2025-12-19").length).toBe(0);
});

test("visibleAt скрывает заявки, которых ещё не было, а daysRange идёт по дням", () => {
  const incidents = generateIncidents(graph, mulberry32(7)).map((incident, index) =>
    withTimeline({ ...incident, nodeId: "U1", history: [] }, createdFor(index)),
  );
  // 20 декабря успели появиться две заявки: 09:00 и 21:00
  const first = visibleAt(incidents, dayOf(DEMO_ORIGIN));
  expect(first.length).toBe(2);
  expect(isVisible(incidents[2] as Incident, dayOf(DEMO_ORIGIN))).toBe(false);
  expect(isVisible(incidents[29] as Incident, dayOf(DEMO_ORIGIN))).toBe(false);
  expect(visibleAt(incidents, "2030-01-01").length).toBe(30);

  const days = daysRange(incidents);
  expect(days[0]).toBe(dayOf(DEMO_ORIGIN));
  expect(days.at(-1)).toBe(dayOf(createdFor(29)));
  expect(days.length).toBe(15); // 29 заявок по 12 ч = 14.5 суток
  expect([...days].sort()).toEqual([...days]);
});
