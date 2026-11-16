import { expect, test } from "bun:test";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCommand } from "../src/cli/commands.ts";
import { executeEffects, runSession } from "../src/cli/loop.ts";
import { applyCommand } from "../src/cli/reducer.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { mulberry32 } from "../src/random.ts";

const graph = buildProcessGraph();
const NOW = "2026-11-16T12:00:00.000Z";
const makeSession = () => ({
  step: 0,
  role: "deputy" as const,
  clock: 0,
  incidents: generateIncidents(graph, mulberry32(9)),
  log: [] as string[],
});

test("executeEffects пишет ровно два файла: отчёт и финальное состояние", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agencyai-effects-"));
  const result = applyCommand(graph, makeSession(), parseCommand("save"), mulberry32(1), NOW);
  const written = await executeEffects(result.effects, dir, NOW);
  expect(written.length).toBe(2);
  const names = (await readdir(dir)).sort();
  expect(names[0]).toStartWith("final-state-");
  expect(names[1]).toStartWith("report-");
  const report = await readFile(join(dir, names[1] as string), "utf8");
  expect(report).toContain("ОТЧЁТ по модели процессов");
  expect(report).toContain("SLA:");
});

test("режим script прогоняет список команд без интерактива", async () => {
  const lines: string[] = [];
  const session = await runSession({
    graph,
    session: makeSession(),
    rand: mulberry32(1),
    now: () => NOW,
    script: ["list", "forward 5", "show 5"],
    print: (line) => lines.push(line),
  });
  const text = lines.join("\n");
  expect(text).toContain("№");           // шапка списка заявок
  expect(text).toContain("З-005");       // карточка заявки
  expect(session.step).toBe(1);          // один шаг вперёд выполнен
});

test("режим auto прогоняет массовые шаги", async () => {
  const lines: string[] = [];
  const session = await runSession({
    graph,
    session: makeSession(),
    rand: mulberry32(2),
    now: () => NOW,
    autoSweeps: 2,
    print: (line) => lines.push(line),
  });
  expect(session.step).toBeGreaterThan(0);
  expect(session.log.join(" ")).toContain("массовый прогон");
  expect(lines.length).toBeGreaterThan(2);
});

test("без TTY интерактив не запускается и подсказывает --script", async () => {
  const lines: string[] = [];
  await runSession({ graph, session: makeSession(), rand: mulberry32(3), now: () => NOW, print: (line) => lines.push(line) });
  expect(lines.join(" ")).toContain("--script");
});
