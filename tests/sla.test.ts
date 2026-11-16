import { expect, test } from "bun:test";
import { PAUSE_REASONS, SLA_PROFILES, hoursFor } from "../src/data/sla.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { moveForward } from "../src/core/navigation.ts";
import { afterMove, slaStatus, startSla, withClock } from "../src/core/sla.ts";
import { buildSummary } from "../src/core/report.ts";
import { mulberry32 } from "../src/random.ts";
import { parseCommand } from "../src/cli/commands.ts";
import { applyCommand } from "../src/cli/reducer.ts";
import type { Incident, Session } from "../src/types.ts";

const graph = buildProcessGraph();
const NOW = "2026-11-16T12:00:00.000Z";
const at = (nodeId: string, seed = 4) =>
  generateIncidents(graph, mulberry32(seed)).find((i) => i.nodeId === nodeId)!;

test("профили SLA и длительность узлов", () => {
  expect(SLA_PROFILES.urgent.resolveHours).toBe(24);
  expect(SLA_PROFILES.urgent.reactHours).toBe(1);
  expect(SLA_PROFILES.normal.resolveHours).toBe(72);
  expect(SLA_PROFILES.routine.resolveHours).toBe(720);
  expect(hoursFor("U2")).toBe(24);
  expect(hoursFor("U14")).toBe(0);
  expect(hoursFor("U7")).toBe(4);
});

test("старт: аварийная заявка получает дедлайн 24 часа", () => {
  const incident = at("U1");
  const sla = startSla("urgent", 0);
  expect(sla.dueAt).toBe(24);
  expect(sla.paused).toBe(false);
  const withSla: Incident = { ...incident, sla };
  expect(slaStatus(withSla, 10).phase).toBe("ok");
  expect(slaStatus(withSla, 25).phase).toBe("overdue");
});

test("просрочка фиксируется и эскалируется однократно", () => {
  const incident: Incident = { ...at("U9"), sla: startSla("urgent", 0) };
  const late = withClock(incident, 30);
  expect(late.sla.breached).toBe(true);
  expect(late.sla.escalated).toBe(true);
  const again = withClock(late, 40);
  expect(again.sla.escalated).toBe(true);
  expect(again.sla).toEqual(late.sla);
});

test("пауза на U14 не съедает норматив, возобновление на U15 сдвигает дедлайн", () => {
  const base: Incident = { ...at("U13"), sla: startSla("normal", 0) };
  const paused = afterMove(base, "U14", 10, mulberry32(1));
  expect(paused.sla.paused).toBe(true);
  expect(PAUSE_REASONS).toContain(paused.sla.pauseReason);
  const muchLater = withClock(paused, 200);
  expect(muchLater.sla.breached).toBe(false);
  expect(slaStatus(muchLater, 200).phase).toBe("paused");
  const resumed = afterMove(muchLater, "U15", 210, mulberry32(1));
  expect(resumed.sla.paused).toBe(false);
  expect(resumed.sla.dueAt).toBe(base.sla.dueAt + 200);
  expect(slaStatus(resumed, 211).phase).toBe("ok");
});

test("уточнение на U2 пересчитывает SLA", () => {
  const base: Incident = { ...at("U1"), sla: startSla("normal", 0) };
  const recalculated = afterMove(base, "U2", 30, mulberry32(1));
  expect(recalculated.sla.dueAt).toBe(30 + 24);
});

test("вне SLA: норматив отсутствует, эскалации нет", () => {
  const incident: Incident = { ...at("U23"), priority: "none", sla: startSla("none", 0) };
  const late = withClock(incident, 1000);
  expect(slaStatus(late, 1000).phase).toBe("none");
  expect(late.sla.escalated).toBe(false);
  expect(late.sla.breached).toBe(false);
});

test("CLI: wait двигает время и помечает просрочки, пауза неприкосновенна", () => {
  const incidents = generateIncidents(graph, mulberry32(11)).map((i) => ({ ...i, sla: startSla(i.priority, 0) }));
  const session: Session = { step: 0, role: "deputy", clock: 0, incidents, log: [] };
  const paused = { ...session.incidents.find((i) => i.nodeId === "U14")!, sla: { ...startSla("urgent", 0), paused: true, pauseReason: "погода" } };
  const withPaused: Session = { ...session, incidents: session.incidents.map((i) => (i.id === paused.id ? paused : i)) };

  const waited = applyCommand(graph, withPaused, parseCommand("wait 30"), mulberry32(1), NOW);
  expect(waited.session.clock).toBe(30);
  const overdue = waited.session.incidents.filter((i) => slaStatus(i, waited.session.clock).phase === "overdue");
  expect(overdue.length).toBeGreaterThan(0);
  expect(slaStatus(waited.session.incidents.find((i) => i.id === paused.id)!, 30).phase).toBe("paused");
  expect(waited.output.join(" ")).toContain("просроч");
});

test("отчёт считает SLA: в срок, просрочено, на паузе", () => {
  const incidents = generateIncidents(graph, mulberry32(13)).map((i) => ({ ...i, sla: startSla(i.priority, 0) }));
  const session: Session = { step: 0, role: "deputy", clock: 40, incidents: incidents.map((i) => withClock(i, 40)), log: [] };
  const summary = buildSummary(graph, session, NOW);
  expect(summary.slaOverdue + summary.slaOnTrack + summary.slaPaused).toBe(summary.total);
  expect(summary.slaOverdue).toBeGreaterThan(0);
  expect(summary.slaEscalated).toBe(summary.slaOverdue);
});

test("шаг двигает время по узлу назначения и применяет его эффекты", () => {
  // шаг на U2 занимает 24 ч (hoursFor) и пересчитывает норматив: 10 + 24 + 24
  const incident: Incident = { ...at("U1"), sla: startSla("normal", 0) };
  const first = moveForward(graph, incident, mulberry32(2), 1, "auto", 10);
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(first.incident.nodeId).toBe("U2");
  expect(first.incident.sla.dueAt).toBe(10 + 24 + 24);
  const second = moveForward(graph, first.incident, mulberry32(2), 2, "auto", 34);
  expect(second.ok).toBe(true);
  if (second.ok) {
    expect(second.incident.nodeId).toBe("U3");
    expect(second.incident.sla.dueAt).toBe(first.incident.sla.dueAt);
    expect(second.incident.sla.breached).toBe(false);
  }
});


