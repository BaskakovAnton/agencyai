import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

/** Сверка дизайн-токенов: computed-стили макетов (4331) и реализованных экранов (4321). */
const MOCK = "http://127.0.0.1:4331/";
const APP = "http://127.0.0.1:4321/";
const outDir = "docs/screenshots/acceptance";
const pairs: readonly (readonly [string, string, string])[] = [
  ["overview.html", "#dashboard?at=2026-01-02", "dashboard"],
  ["incidents.html", "#incidents", "incidents"],
  ["incident-detail.html", "#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02", "incident"],
  ["timeline-git.html", "#timeline?at=2026-01-02&view=git", "timeline-git"],
  ["timeline-gantt.html", "#timeline?at=2026-01-02&view=gantt", "timeline-gantt"],
  ["chat.html", "#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02", "chat"],
  ["model.html", "#model", "model"],
];

const probe = () => {
  const style = (el: Element | null, prop: string): string => (el ? getComputedStyle(el).getPropertyValue(prop).trim() : "");
  const box = (el: Element | null, prop: "width" | "height"): number => (el ? Math.round((el.getBoundingClientRect() as DOMRect)[prop]) : 0);
  const body = document.body;
  const header = document.querySelector("header, .topbar, .phone-top");
  const aside = document.querySelector("aside, .sidebar, nav");
  const h1 = document.querySelector("h1, .page-title, .detail-title");
  const button = document.querySelector("button");
  const link = document.querySelector("a");
  const cards = document.querySelectorAll(".kpi, [class*=card], .panel, .phone").length;
  return {
    bodyBg: style(body, "background-color"),
    bodyColor: style(body, "color"),
    bodyFont: style(body, "font-size"),
    fontFamily: style(body, "font-family").split(",")[0] ?? "",
    headerH: box(header, "height"),
    headerBg: style(header, "background-color"),
    asideW: box(aside, "width"),
    asideBg: style(aside, "background-color"),
    h1Size: style(h1, "font-size"),
    h1Weight: style(h1, "font-weight"),
    h1Color: style(h1, "color"),
    buttonBg: style(button, "background-color"),
    buttonColor: style(button, "color"),
    buttonRadius: style(button, "border-radius"),
    linkColor: style(link, "color"),
    cards,
    docHeight: document.documentElement.scrollHeight,
  };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const rows: Record<string, unknown>[] = [];
for (const [file, hash, name] of pairs) {
  await page.goto(MOCK + file, { waitUntil: "load" });
  const mock = await page.evaluate(probe);
  await page.goto(APP + hash, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#view > *", { timeout: 10_000 });
  await page.waitForTimeout(250);
  const app = await page.evaluate(probe);
  rows.push({ screen: name, mock, app });
}
await browser.close();
await mkdir(outDir, { recursive: true });
await writeFile(outDir + "/dom-metrics.json", JSON.stringify(rows, null, 1), "utf8");

const hex = (value: string): string => value.replace(/rgba?\(([^)]+)\)/, (_m, inner: string) => {
  const [r, g, b] = inner.split(",").map((v: string) => Number(v.trim()));
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
});
const nums = (value: string): number => Number.parseFloat(value) || 0;
const sameColor = (a: unknown, b: unknown): boolean => hex(String(a)) === hex(String(b));
const near = (a: unknown, b: unknown, tol: number): boolean => Math.abs(nums(String(a)) - nums(String(b))) <= tol;

const keys: readonly (readonly [string, (a: unknown, b: unknown) => boolean])[] = [
  ["bodyBg", sameColor], ["bodyColor", sameColor], ["bodyFont", (a, b) => near(a, b, 1)],
  ["headerBg", sameColor], ["headerH", (a, b) => near(a, b, 8)], ["asideW", (a, b) => near(a, b, 10)],
  ["asideBg", sameColor], ["h1Size", (a, b) => near(a, b, 2)], ["h1Weight", (a, b) => near(a, b, 100)],
  ["buttonBg", sameColor], ["buttonRadius", (a, b) => near(a, b, 2)], ["linkColor", sameColor],
];
const header = ["Экран", ...keys.map(([k]) => k), "совпало"];
const body = rows.map((row) => {
  const mock = row.mock as Record<string, unknown>;
  const app = row.app as Record<string, unknown>;
  const marks = keys.map(([k, test]) => (test(mock[k], app[k]) ? "✔" : "✘"));
  return ["**" + row.screen + "**", ...marks, marks.filter((m) => m === "✔").length + "/" + keys.length];
});
const md = ["| " + header.join(" | ") + " |", "|" + header.map(() => "---").join("|") + "|",
  ...body.map((cells) => "| " + cells.join(" | ") + " |")].join("\n");
await writeFile(outDir + "/dom-report.md", md + "\n", "utf8");
console.log(md);
