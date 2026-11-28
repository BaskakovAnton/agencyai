import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { parseRoute } from "../src/web/router.ts";
import { renderShell } from "../src/web/shell.ts";
import { renderBadge, renderEmptyState, renderKpi, renderPanel, renderReadOnlyNotice, renderSlaBadge } from "../src/web/components.ts";

const read = (p: string) => readFile(p, "utf8");
const [tokens, components, shell, style, screens, mobile, matrix, index] = await Promise.all([
  read("src/web/tokens.css"),
  read("src/web/components.css"),
  read("src/web/shell.css"),
  read("src/web/style.css"),
  read("src/web/screens.css"),
  read("src/web/mobile.css"),
  read("src/web/matrix.css"),
  read("src/web/index.html"),
]);
const all = tokens + components + shell + style + screens + mobile + matrix;
const compact = tokens.replace(/\s+/g, "");

test("токены соответствуют утверждённому reference.css", () => {
  expect(compact).toContain("--color-bg:#f4f6fa");
  expect(compact).toContain("--color-surface:#ffffff");
  expect(compact).toContain("--color-surface-muted:#f8fafc");
  expect(compact).toContain("--color-text:#172033");
  expect(compact).toContain("--color-primary:#2563eb");
  expect(compact).toContain("--color-primary-strong:#1d4ed8");
  expect(compact).toContain("--color-primary-soft:#eaf1ff");
  expect(compact).toContain("--color-border:#dce3ec");
  expect(compact).toContain("--color-line-2:#e9eef4");
  expect(compact).toContain("--color-neutral-bg:#eef2f7");
  expect(compact).toContain("--sidebar-w:250px");
  expect(compact).toContain("--topbar-h:68px");
  expect(compact).toContain("--radius:13px");
});

test("тёмная тема — основная: HTML и токены согласованы", () => {
  expect(index).toContain('data-theme="dark"');
  expect(index).toContain('content="#0f1115"');
  // Тема применяется до загрузки приложения: сохранённая светлая не даёт вспышки тёмной.
  expect(index).toContain("agencyai-theme");
  expect(index.indexOf("agencyai-theme")).toBeLessThan(index.indexOf("app.js"));
  const darkBlock = tokens.split('[data-theme="dark"]')[1] ?? "";
  expect(darkBlock.replace(/\s+/g, "")).toContain("--color-bg:#0f1115");
  expect(darkBlock).toContain("color-scheme: dark");
});

test("период «весь период модели» доступен и считается (UX-3.5, OD-2)", async () => {
  const { isPeriodLength, periodEndingAt, PERIOD_LENGTHS, PERIOD_TITLES } = await import("../src/core/periods.ts");
  expect(PERIOD_LENGTHS).toEqual([7, 30, 25]);
  expect(PERIOD_TITLES[25]).toBe("весь период модели");
  expect(isPeriodLength(25)).toBe(true);
  expect(isPeriodLength(90)).toBe(false);
  expect(periodEndingAt("2026-01-13", 25).days.length).toBe(25);
});

test("нет литеральных цветов вне tokens.css (WP-9)", () => {
  // Токены живут только в tokens.css; остальные стили пользуются переменными.
  const noTokens = components + shell + style + screens + mobile + matrix;
  const literals = (noTokens.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).filter(
    (value) => value.length === 4 || value.length === 7 || value.length === 9,
  );
  expect(literals).toEqual([]);
});

test("наши доработки доступности на месте", () => {
  expect(compact).toContain("--color-success-text:#0f7a4a");
  expect(compact).toContain("--color-warning-text:#8a5f13");
  expect(compact).toContain("--color-danger-text:#a92f42");
  expect(all).not.toContain("font-size: 9px");
  expect(all).not.toContain("font-size: 10px");
  expect(all).not.toContain("font-size: 11px");
});

test("цвета ролей заданы и различимы (из кит-макетов)", () => {
  const [light, dark] = tokens.split('[data-theme="dark"]');
  for (const block of [light!, dark!]) {
    const roles = [...block.matchAll(/--role-[a-z]+:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]!);
    expect(roles.length).toBe(7);
    expect(new Set(roles).size).toBe(7);
  }
  // оттенки кита (#4e83d9, #2d986e, #9066c8, #a0aaba), затемнённые для белого текста
  expect(compact).toContain("--role-resident:#3566b8");
  expect(compact).toContain("--role-deputy:#1f7a57");
  expect(compact).toContain("--role-contractor:#6f4aa8");
  expect(compact).toContain("--role-system:#5c6878");
});

test("компоненты ui-* и их классы объявлены", () => {
  for (const tag of ["ui-sidebar", "ui-topbar", "ui-panel", "ui-kpi", "ui-badge", "ui-sla", "ui-activity", "ui-chat-message", "ui-process-node"]) {
    expect(components).toContain(tag);
  }
  for (const cls of [".panel", ".panel-head", ".panel-title", ".kpi", ".badge", ".sla", ".role-chip", ".empty-state", ".read-only-notice", ".demo-notice"]) {
    expect(components).toContain(cls);
  }
});

test("оболочка использует ui-sidebar и ui-topbar", () => {
  const html = renderShell({ route: parseRoute("#dashboard"), title: "Обзор", subtitle: "тест", content: "<p>тело</p>" });
  expect(html).toContain("<ui-sidebar");
  expect(html).toContain("<ui-topbar");
  expect(html).toContain('role="complementary"');
  expect(html).toContain('role="banner"');
  expect(html).toContain("data-sidebar");
  expect(html).toContain("data-topbar");
  expect(html).toContain('class="nav-item nav-link');
  expect(html).toContain('id="view"');
});

test("хелперы компонентов отдают ui-разметку и экранируют текст", () => {
  expect(renderPanel({ title: "Панель", body: "<b>тело</b>" })).toContain('<ui-panel class="panel">');
  expect(renderPanel({ title: "Панель", body: "x" })).toContain("panel-title");
  expect(renderKpi("Всего", "30", "в срезе")).toContain('<ui-kpi class="kpi">');
  expect(renderBadge("Просрочено", "red")).toContain('class="badge red"');
  expect(renderSlaBadge("в срок", "green")).toContain('class="sla green"');
  expect(renderEmptyState("Ничего не найдено")).toContain("data-empty-state");
  expect(renderReadOnlyNotice("Только чтение")).toContain("data-read-only");
  expect(renderBadge("<script>", "gray")).toContain("&lt;script&gt;");
});
