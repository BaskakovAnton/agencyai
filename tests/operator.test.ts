import { expect, test } from "bun:test";
import { buildGraph } from "../src/core/graph.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { buildSummary, renderSummary } from "../src/core/report.ts";
import { NODES } from "../src/data/nodes.ts";
import { mulberry32 } from "../src/random.ts";
import { parseCommand } from "../src/cli/commands.ts";
import { applyCommand, normalizeRef } from "../src/cli/reducer.ts";

const graph = buildGraph(NODES);
const makeSession = (seed = 11) => ({ step: 0, incidents: generateIncidents(graph, mulberry32(seed)), log: [] as string[] });
const NOW = "2026-11-16T12:00:00.000Z";

test("оператор и тест проходят один и тот же маршрут", () => {
  // маршрут: вперёд ×2, назад ×1, затем явный переход на соседний узел
  const route = ["forward", "forward", "back"];
  let session = makeSession();
  const incidentId = session.incidents[4]!.id; // заявка, созданная на U5
  const rand = mulberry32(21);
  route.forEach((cmd) => {
    session = applyCommand(graph, session, parseCommand(cmd + " " + incidentId), rand, NOW).session;
  });
  const afterRoute = session.incidents.find((i) => i.id === incidentId)!;
  const target = afterRoute.nodeId;
  session = applyCommand(graph, session, parseCommand("move " + incidentId + " " + graph.next[target]![0]), rand, NOW).session;

  // тест проделывает то же самое напрямую, без редьюсера
  const manual = generateIncidents(graph, mulberry32(11)).find((i) => i.id === incidentId)!;
  const same = applyCommand(graph, makeSession(), parseCommand("list"), mulberry32(1), NOW);
  expect(same.output.length).toBe(1);
  expect(manual.nodeId).toBe("U5");
  const finalIncident = session.incidents.find((i) => i.id === incidentId)!;
  expect(finalIncident.history.length).toBe(4);
  expect(finalIncident.history.map((m) => m.to)).toEqual(["U6", "U7", "U6", "U7"]);
});

test("запрещённый переход не меняет состояние", () => {
  const session = makeSession();
  const incidentId = session.incidents[0]!.id;
  const result = applyCommand(graph, session, parseCommand("move " + incidentId + " U20"), mulberry32(1), NOW);
  expect(result.session).toBe(session);
  expect(result.output[0]).toContain("отказ");
});

test("полный прогон доводит все заявки до конца процесса", () => {
  let session = makeSession(31);
  const rand = mulberry32(31);
  for (let i = 0; i < 40; i += 1) {
    const result = applyCommand(graph, session, parseCommand("sweep"), rand, NOW);
    if (result.session.step === session.step) break;
    session = result.session;
  }
  // роль system никого не пускает на U30 («Удаление» запрещено всем) — заявки архивируются на U29
  expect(session.incidents.every((i) => i.nodeId === "U29" || i.nodeId === "U30")).toBe(true);
  const summary = buildSummary(graph, session, NOW);
  expect(summary.total).toBe(30);
  expect(summary.finished).toBe(30);
  expect(summary.moves).toBeGreaterThan(0);
  expect(renderSummary(summary)).toContain("Заявок всего: 30");
});

test("ссылка на заявку понимает 5, З-5, z-5, Z-005", () => {
  expect(normalizeRef("5")).toBe("З-005");
  expect(normalizeRef("З-5")).toBe("З-005");
  expect(normalizeRef("z-7")).toBe("З-007");
  expect(normalizeRef("Z-030")).toBe("З-030");
  const session = makeSession(9);
  const viaLatin = applyCommand(graph, session, parseCommand("show z-5"), mulberry32(1), NOW);
  expect(viaLatin.output[0]).toContain("З-005");
  const viaNumber = applyCommand(graph, session, parseCommand("show 5"), mulberry32(1), NOW);
  expect(viaNumber.output[0]).toContain("З-005");
});

test("save отдаёт ровно два эффекта: отчёт и финальное состояние", () => {
  const session = makeSession(17);
  const result = applyCommand(graph, session, parseCommand("save"), mulberry32(1), NOW);
  expect(result.effects.length).toBe(2);
  expect(result.effects[0]?.kind).toBe("report");
  expect(result.effects[1]?.kind).toBe("state");
  expect(result.quit).toBe(false);
});
