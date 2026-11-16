import { expect, test } from "bun:test";
import { parseCommand } from "../src/cli/commands.ts";
import { applyCommand, resolveRole } from "../src/cli/reducer.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { isKnownNode } from "../src/core/graph.ts";
import { BRANCHES, branchShares, buildProcessGraph } from "../src/data/edges.ts";
import { toAccess } from "../src/data/roles.ts";
import { mulberry32 } from "../src/random.ts";
import type { Session } from "../src/types.ts";

const graph = buildProcessGraph();
const NOW = "2026-11-16T12:00:00.000Z";
const makeSession = (): Session => ({
  step: 0,
  role: "deputy",
  clock: 0,
  incidents: generateIncidents(graph, mulberry32(12)),
  log: [],
});

test("isKnownNode отличает существующий узел от выдуманного", () => {
  expect(isKnownNode(graph, "U1")).toBe(true);
  expect(isKnownNode(graph, "U99")).toBe(false);
});

test("toAccess падает на неверном числе уровней", () => {
  expect(() => toAccess("allow deny")).toThrow(/ожидалось 7/);
});

test("branchShares считает проценты и терпит нулевые веса", () => {
  const shares = branchShares(BRANCHES.U12 as never);
  expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBe(100);
  expect(shares[0]?.to).toBe("U13");
  expect(branchShares([{ to: "U1", weight: 0, note: "нет" }])).toEqual([]);
});

test("resolveRole понимает id, русское имя и префикс", () => {
  expect(resolveRole("deputy")).toBe("deputy");
  expect(resolveRole("Подрядчик")).toBe("contractor");
  expect(resolveRole("cont")).toBe("contractor");
  expect(resolveRole("кто-то")).toBeNull();
  expect(resolveRole(null)).toBeNull();
});

test("reducer: неизвестная роль и wait 0 не ломают сессию", () => {
  const base = makeSession();
  const bad = applyCommand(graph, base, parseCommand("role марсианин"), mulberry32(1), NOW);
  expect(bad.session).toEqual(base);
  expect(bad.output[0]).toContain("неизвестная роль");
  const zero = applyCommand(graph, base, parseCommand("wait 0"), mulberry32(1), NOW);
  expect(zero.session.clock).toBe(0);
  expect(zero.output[0]).toContain("просрочено");
});

test("reducer: sweep, когда двигать нечего, сообщает про архив", () => {
  const session = makeSession();
  const archived: Session = { ...session, incidents: session.incidents.map((incident) => ({ ...incident, nodeId: "U30" })) };
  const result = applyCommand(graph, archived, parseCommand("sweep"), mulberry32(1), NOW);
  expect(result.output[0]).toContain("архиве");
  expect(result.session).toEqual(archived);
});
