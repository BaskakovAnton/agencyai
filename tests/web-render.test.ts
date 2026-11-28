import { expect, test, beforeAll } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildWeb } from "../scripts/build-web.ts";

let outDir = "";
let page = "";

beforeAll(async () => {
  outDir = await mkdtemp(join(tmpdir(), "agencyai-web-render-"));
  await buildWeb({ outDir, minify: false });
  page = await readFile(join(outDir, "index.html"), "utf8");
});

test("страница рендерит 30 заявок с кнопками переходов", async () => {
  const mod = (await import(pathToFileURL(join(outDir, "app.js")).href)) as Record<string, any>;
  const state = mod.createState(mod.buildGraph(mod.NODES), 7);
  const html = mod.renderPage(state, "");
  expect(html).toContain("Заявки");
  expect(html.match(/class="row(?:"| on)/g)?.length).toBe(30);
  expect(html).toContain('data-action="forward"');
  expect(html).not.toContain('class="brand"'); // заголовок и бренд теперь в оболочке
  expect(html.match(/data-action="select"/g)?.length).toBe(30);
  expect(html.match(/class="row-main"/g)?.length).toBe(30);
  expect(html).toContain("Массовый шаг вперёд");
  const moved = mod.applyAction(state, { kind: "forward", ref: "5" });
  expect(moved.state.session.step).toBe(1);
  expect(moved.message).toContain("З-005");
});

test("экран модели: матрица прав из 7 ролей и легенда групп узлов", async () => {
  const mod = (await import(pathToFileURL(join(outDir, "app.js")).href)) as Record<string, any>;
  const graph = mod.buildProcessGraph(mod.NODES);
  const state = mod.createState(graph, 7);
  const selected = { ...state, selected: state.session.incidents[0].id };
  const html = mod.renderPage(selected, "");
  expect(html).toContain("data-roles-matrix");
  expect((html.match(/data-role-row=/g) ?? []).length).toBe(7);
  expect(html).toContain("data-group-legend");
  expect((html.match(/data-group=/g) ?? []).length).toBe(6);
});

test("карточка на узле с развилкой показывает варианты с процентами", async () => {
  const mod = (await import(pathToFileURL(join(outDir, "app.js")).href)) as Record<string, any>;
  const graph = mod.buildProcessGraph(mod.NODES);
  const state = mod.createState(graph, 7);
  const atU12 = { ...state, selected: state.session.incidents.find((i: any) => i.nodeId === "U12").id };
  const html = mod.renderPage(atU12, "");
  expect(html).toContain("Развилка");
  expect(html).toContain("40%");
  expect(html).toContain("60%");
});

test("страница показывает роль оператора и блокирует недоступный переход", async () => {
  const mod = (await import(pathToFileURL(join(outDir, "app.js")).href)) as Record<string, any>;
  const graph = mod.buildProcessGraph(mod.NODES);
  const base = mod.createState(graph, 7);
  const asContractor = mod.applyAction(base, { kind: "role", role: "contractor" });
  expect(asContractor.state.session.role).toBe("contractor");
  const atU18 = {
    ...asContractor.state,
    selected: asContractor.state.session.incidents.find((i: any) => i.nodeId === "U18").id,
  };
  const denied = mod.applyAction(atU18, { kind: "move", ref: atU18.selected, nodeId: "U19" });
  expect(String(denied.message).toLowerCase()).toContain("не может");
  const html = mod.renderPage(atU18, denied.message);
  expect(html).toContain("Оператор");
  expect(html).toContain("Подрядчик");
});

test("страница показывает SLA и кнопку времени", async () => {
  const mod = (await import(pathToFileURL(join(outDir, "app.js")).href)) as Record<string, any>;
  const graph = mod.buildProcessGraph(mod.NODES);
  const waited = mod.applyAction(mod.createState(graph, 5), { kind: "wait", hours: 30 });
  expect(waited.state.session.clock).toBe(30);
  expect(String(waited.message)).toContain("просрочено");
  const html = mod.renderPage(waited.state, waited.message);
  expect(html).toContain("SLA:");
  expect(html).toContain("+4 ч");
  const incidents = waited.state.session.incidents as any[];
  expect(incidents.some((i) => mod.slaStatus(i, 30).phase === "overdue")).toBe(true);
});

test("карточка заявки показывает ситуацию регламента и её шаги", async () => {
  const mod = (await import(pathToFileURL(join(outDir, "app.js")).href)) as Record<string, any>;
  const graph = mod.buildProcessGraph(mod.NODES);
  const state = mod.createState(graph, 7);
  const incident = state.session.incidents[8];
  const html = mod.renderPage({ ...state, selected: incident.id }, "");
  expect(html).toContain("Ситуация " + incident.situationId);
  expect(html).toContain("class=\"steps\"");
});

test("html самодостаточен: локальные ресурсы, viewport, русская локаль", () => {
  expect(page).toContain('lang="ru"');
  expect(page).toContain("viewport");
  expect(page).not.toMatch(/https?:\/\//);
  expect(page).toContain("<title>");
});
