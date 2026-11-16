import { expect, test } from "bun:test";
import { findIncidentByRef, normalizeRef, resolveIncident } from "../src/core/refs.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { mulberry32 } from "../src/random.ts";
import type { Session } from "../src/types.ts";

const graph = buildProcessGraph();
const session: Session = {
  step: 0,
  role: "deputy",
  clock: 0,
  incidents: generateIncidents(graph, mulberry32(4)),
  log: [],
};

test("normalizeRef: гибкие формы ссылки на заявку", () => {
  expect(normalizeRef("5")).toBe("З-005");
  expect(normalizeRef("З-5")).toBe("З-005");
  expect(normalizeRef("з-5")).toBe("З-005");
  expect(normalizeRef("z-5")).toBe("З-005");
  expect(normalizeRef("Z-030")).toBe("З-030");
  expect(normalizeRef(" 7 ")).toBe("З-007");
  expect(normalizeRef("абракадабра")).toBe("АБРАКАДАБРА");
});

test("findIncidentByRef: по id, по латинице и по номеру", () => {
  expect(findIncidentByRef(session, "З-005")?.id).toBe("З-005");
  expect(findIncidentByRef(session, "z-5")?.id).toBe("З-005");
  expect(findIncidentByRef(session, "999")).toBeUndefined();
  expect(findIncidentByRef(session, "0")).toBeUndefined();
  expect(findIncidentByRef(session, "мусор")).toBeUndefined();
});

test("findIncidentByRef: числовой фолбэк работает для чужих форматов id", () => {
  const custom: Session = {
    ...session,
    incidents: session.incidents.slice(0, 3).map((incident, index) => ({ ...incident, id: "INC-" + (index + 1) })),
  };
  expect(findIncidentByRef(custom, "2")?.id).toBe("INC-2");
  expect(findIncidentByRef(custom, "9")).toBeUndefined();
});

test("resolveIncident: успех и дружелюбная ошибка", () => {
  const ok = resolveIncident(session, "7");
  expect(ok.ok).toBe(true);
  if (ok.ok) expect(ok.incident.id).toBe("З-007");
  const bad = resolveIncident(session, "З-999");
  expect(bad.ok).toBe(false);
  if (!bad.ok) expect(bad.error).toContain("не найдена");
});
