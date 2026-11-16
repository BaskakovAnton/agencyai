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
  expect(bundle.length).toBeGreaterThan(5000);
  expect(css.length).toBeGreaterThan(100);
  expect(page).toContain("./app.js");
  expect(page).toContain("./style.css");
});

test("бандл самодостаточен: нет внешних URL и импортов", () => {
  expect(bundle).not.toMatch(/https?:\/\//);
  expect(bundle).not.toMatch(/^\s*import\s/m);
  expect(bundle).not.toMatch(/require\(/);
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

test("страница рендерит 30 заявок с кнопками переходов", async () => {
  const mod = (await import(pathToFileURL(join(outDir, "app.js")).href)) as Record<string, any>;
  const state = mod.createState(mod.buildGraph(mod.NODES), 7);
  const html = mod.renderPage(state, "");
  expect(html).toContain("Заявки");
  expect(html.match(/class="row/g)?.length).toBe(30);
  expect(html).toContain('data-action="forward"');
  expect(html).toContain("Массовый шаг вперёд");
  const moved = mod.applyAction(state, { kind: "forward", ref: "5" });
  expect(moved.state.session.step).toBe(1);
  expect(moved.message).toContain("З-005");
});

test("html самодостаточен: локальные ресурсы, viewport, русская локаль", () => {
  expect(page).toContain('lang="ru"');
  expect(page).toContain("viewport");
  expect(page).not.toMatch(/https?:\/\//);
  expect(page).toContain("<title>");
});
