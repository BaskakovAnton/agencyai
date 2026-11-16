import { expect, test } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInteractive } from "../src/cli/loop.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { mulberry32 } from "../src/random.ts";
import type { Session } from "../src/types.ts";

const graph = buildProcessGraph();
const NOW = "2026-11-16T12:00:00.000Z";
const makeSession = (): Session => ({
  step: 0,
  role: "deputy",
  clock: 0,
  incidents: generateIncidents(graph, mulberry32(9)),
  log: [],
});

test("интерактивный цикл: команды выполняются, save пишет два файла, quit завершает", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agencyai-interactive-"));
  const answers = ["show 5", "save", "quit"];
  const lines: string[] = [];
  const options = { graph, session: makeSession(), rand: mulberry32(1), now: () => NOW, outDir: dir };
  const session = await runInteractive(options, makeSession(), (line) => lines.push(line), async () => answers.shift() ?? "quit");
  const text = lines.join("\n");
  expect(text).toContain("З-005");
  expect(text).toContain("записано:");
  expect(session.step).toBe(0);
  expect((await readdir(dir)).length).toBe(2);
});

test("EOF в интерактивном цикле аккуратно завершает его", async () => {
  const lines: string[] = [];
  const options = { graph, session: makeSession(), rand: mulberry32(1), now: () => NOW };
  await runInteractive(options, makeSession(), (line) => lines.push(line), async () => {
    throw new Error("stdin closed");
  });
  expect(lines.join(" ")).toContain("EOF");
});

test("интерактивный цикл двигает заявку и обновляет шаги", async () => {
  const answers = ["forward 5", "quit"];
  const lines: string[] = [];
  const options = { graph, session: makeSession(), rand: mulberry32(2), now: () => NOW };
  const session = await runInteractive(options, makeSession(), (line) => lines.push(line), async () => answers.shift() ?? "quit");
  expect(session.step).toBe(1);
  expect(lines.join(" ")).toContain("шаг 1");
});
