import { expect, test } from "bun:test";
import {
  renderGraphTable,
  renderHelp,
  renderNodeCard,
  renderSituationCard,
  renderSituationsList,
  renderSlaLine,
} from "../src/cli/render.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { withClock } from "../src/core/sla.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { situationById } from "../src/data/situations.ts";
import { mulberry32 } from "../src/random.ts";

const graph = buildProcessGraph();

test("renderGraphTable перечисляет все 30 узлов", () => {
  const text = renderGraphTable(graph);
  expect(text).toContain("U1");
  expect(text).toContain("U30");
  expect(text.split("\n").length).toBe(32);
});

test("renderNodeCard: права ролей, соседи и метка текущей роли", () => {
  const text = renderNodeCard(graph, "U7", "deputy");
  expect(text).toContain("Передача подрядчику");
  expect(text).toContain("соседи: назад U6 · вперёд U8");
  expect(text).toContain("Депутат-диспетчер");
  expect(text).toContain("←");
  expect(renderNodeCard(graph, "U99")).toBe("неизвестный узел: U99");
});

test("renderSituationsList печатает все 37 ситуаций по разделам", () => {
  const text = renderSituationsList();
  expect(text).toContain("Ситуации регламента: 37");
  expect(text).toContain("8.1 До принятия — 8");
  expect(text).toContain("8.4 Отчётность — 4");
  expect((text.match(/С\d+/g) ?? []).length).toBeGreaterThanOrEqual(37);
});

test("renderSituationCard: заголовок, SLA, узлы и шаги", () => {
  const text = renderSituationCard(situationById("С9")!);
  expect(text).toContain("С9 · Срочная авария");
  expect(text).toContain("SLA:");
  expect(text).toContain("узлы:");
  expect(text).toContain("шаги:");
  expect(text.split("\n").length).toBeGreaterThan(6);
});

test("renderSlaLine показывает просрочку и эскалацию", () => {
  const urgent = generateIncidents(graph, mulberry32(11)).find((incident) => incident.priority === "urgent")!;
  const line = renderSlaLine(withClock(urgent, 100), 100);
  expect(line).toContain("SLA:");
  expect(line).toContain("просрочено");
  expect(line).toContain("эскалировано");
});

test("renderHelp перечисляет ключевые команды", () => {
  const text = renderHelp();
  ["wait", "role", "graph", "node", "list", "situations", "situation", "show", "forward", "back", "move", "sweep", "report", "save", "quit"]
    .forEach((command) => expect(text).toContain(command));
});
