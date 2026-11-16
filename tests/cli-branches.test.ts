import { expect, test } from "bun:test";
import { parseCommand } from "../src/cli/commands.ts";
import { applyCommand } from "../src/cli/reducer.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { mulberry32 } from "../src/random.ts";
import type { Session } from "../src/types.ts";

const graph = buildProcessGraph();
const NOW = "2026-11-16T12:00:00.000Z";
const rand = () => mulberry32(1)();
const makeSession = (): Session => ({
  step: 0,
  role: "deputy",
  clock: 0,
  incidents: generateIncidents(graph, mulberry32(13)),
  log: [],
});

test("редьюсер: help, graph, node, situations и situation", () => {
  const session = makeSession();
  const run = (line: string) => applyCommand(graph, session, parseCommand(line), rand, NOW).output.join("\n");
  expect(run("help")).toContain("Команды оператора");
  expect(run("graph")).toContain("U30");
  expect(run("node U12")).toContain("развилка");
  expect(run("node U99")).toContain("неизвестный узел");
  expect(run("situations")).toContain("Ситуации регламента: 37");
  expect(run("situation С9")).toContain("С9");
  expect(run("situation С99")).toContain("не найдена");
});

test("редьюсер: report и save отдают эффекты на запись", () => {
  const session = makeSession();
  const report = applyCommand(graph, session, parseCommand("report"), rand, NOW);
  expect(report.effects.map((effect) => effect.kind)).toEqual(["report"]);
  expect(report.output[0]).toContain("ОТЧЁТ по модели процессов");
  const save = applyCommand(graph, session, parseCommand("save"), rand, NOW);
  expect(save.effects.map((effect) => effect.kind)).toEqual(["report", "state"]);
  expect(save.output[0]).toContain("сохранение");
});

test("редьюсер: quit и неизвестная команда", () => {
  const session = makeSession();
  expect(applyCommand(graph, session, parseCommand("quit"), rand, NOW).quit).toBe(true);
  expect(applyCommand(graph, session, parseCommand("абракадабра"), rand, NOW).output[0]).toContain("не понял команду");
});
