import { expect, test, beforeAll } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildWeb } from "../scripts/build-web.ts";
import { buildGraph } from "../src/core/graph.ts";
import { generateIncidents } from "../src/core/generator.ts";
import { moveForward, moveToNode } from "../src/core/navigation.ts";
import { NODES } from "../src/data/nodes.ts";
import { mulberry32 } from "../src/random.ts";

let outDir = "";
let bundle = "";
let page = "";

beforeAll(async () => {
  outDir = await mkdtemp(join(tmpdir(), "agencyai-web-"));
  await buildWeb({ outDir, minify: false });
  bundle = await readFile(join(outDir, "app.js"), "utf8");
  page = await readFile(join(outDir, "index.html"), "utf8");
});

test("сборка создаёт страницу, стили и бандл", async () => {
  const css = await readFile(join(outDir, "style.css"), "utf8");
  const tokens = await readFile(join(outDir, "tokens.css"), "utf8");
  const shell = await readFile(join(outDir, "shell.css"), "utf8");
  const screens = await readFile(join(outDir, "screens.css"), "utf8");
  expect(bundle.length).toBeGreaterThan(5000);
  expect(css.length).toBeGreaterThan(100);
  expect(tokens.length).toBeGreaterThan(100);
  expect(shell.length).toBeGreaterThan(100);
  expect(screens.length).toBeGreaterThan(100);
  expect(page).toContain("./app.js");
  expect(page).toContain("./tokens.css");
  expect(page).toContain("./components.css");
  expect(page).toContain("./shell.css");
  expect(page).toContain("./screens.css");
  expect(page).toContain("./style.css");
});

test("бандл самодостаточен: ничего не загружает из сети", () => {
  // в chart.js внутри есть ссылки на документацию обычными строками — проверяем именно загрузку
  expect(bundle).not.toMatch(/from\s+["']https?:/);
  expect(bundle).not.toMatch(/import\s*\(\s*["']https?:/);
  expect(bundle).not.toMatch(/fetch\(\s*["']https?:/);
  expect(bundle).not.toMatch(/^\s*import\s/m);
  expect(bundle).not.toMatch(/require\(/);
});

test("в бандл попали оба экрана: Git-граф и мобильный чат", () => {
  expect(bundle).toContain("Хронология");
  expect(bundle).toContain("Обзор");
  expect(bundle).toContain("Обращения");
  expect(bundle).toContain("Диаграмма Ганта");
  expect(bundle).toContain("Перемотка времени");
  expect(bundle).toContain("Переписка на");
  expect(bundle).toContain("#timeline");
  expect(bundle).toContain("#chat/");
});

test("когорты и таблица срочности убраны из интерфейса", () => {
  expect(bundle).not.toContain("Шкала времени и когорты");
  expect(bundle).not.toContain("Дашборд когорт");
  expect(bundle).not.toContain("Авария / экстренно");
});

test("паритет: история с датами и переписка на странице совпадают с ядром", async () => {
  const mod = (await import(pathToFileURL(join(outDir, "app.js")).href)) as Record<string, any>;
  const page = mod.demoModel();
  expect(page.incidents.length).toBe(30);
  expect(page.story.days.length).toBeGreaterThan(15);

  const graph = mod.buildProcessGraph(mod.NODES);
  const hero = page.incidents.find((incident: any) => incident.id === "З-015");
  const snapshot = mod.chatAt(graph, hero, "2026-01-02");
  const replies = snapshot.messages.filter((message: any) => message.kind === "message");
  expect(replies.length).toBe(2);
  expect(snapshot.messages.length).toBe(3); // две реплики + системное сообщение о передаче
  expect(snapshot.activeRole).toBe("deputy");
  expect(replies.map((message: any) => message.nodeId)).toEqual(["U1", "U6"]);

  const git = mod.buildGitGraph(graph, page.incidents, "2026-01-02");
  expect(git.commits.every((commit: any) => commit.day <= "2026-01-02")).toBe(true);
  expect(git.incidents.length).toBeLessThan(30);

  const gantt = mod.buildGantt(graph, page.incidents, "2026-01-02");
  expect(gantt.rows.length).toBe(git.incidents.length);
  expect(mod.renderGitSvg(git).match(/data-commit=/g)?.length).toBe(git.commits.length);
  expect(mod.renderPhone({
    incident: hero,
    snapshot,
    activeRole: snapshot.activeRole,
    interlocutor: snapshot.interlocutor,
    overridden: false,
    backHref: mod.hrefTimeline("2026-01-02"),
    nextDay: "2026-01-03",
    prevDay: "",
    nodeTitle: "Назначение подрядчика",
    slaPhase: "overdue",
  })).toContain("data-phone");
});

test("паритет: логика на странице совпадает с ядром", async () => {
  const mod = (await import(pathToFileURL(join(outDir, "app.js")).href)) as Record<string, any>;
  const graph = buildGraph(NODES);
  const core = generateIncidents(graph, mulberry32(7));
  const onPage = mod.generateIncidents(mod.buildGraph(mod.NODES), mod.mulberry32(7));
  expect(JSON.stringify(onPage)).toBe(JSON.stringify(core));

  const incident = core[4]!;
  const coreMove = moveForward(graph, incident, mulberry32(3), 1, "operator");
  const pageMove = mod.moveForward(graph, incident, mulberry32(3), 1, "operator");
  expect(JSON.stringify(pageMove)).toBe(JSON.stringify(coreMove));

  const coreJump = moveToNode(graph, incident, "U20", 2, "operator");
  const pageJump = mod.moveToNode(graph, incident, "U20", 2, "operator");
  expect(JSON.stringify(pageJump)).toBe(JSON.stringify(coreJump));
  expect(pageJump.ok).toBe(false);
});

test("в бандл попала вся модель процессов", () => {
  expect(bundle).toContain("Передача подрядчику");
  expect(bundle).toContain("Просмотр аудита");
  expect(bundle).toContain("U30");
});
