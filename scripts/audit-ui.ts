import { chromium, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

/** UX/a11y-аудит демо: скриншоты, axe-core (WCAG 2.1 AA) и измеримые метрики интерфейса. */
const base = "http://127.0.0.1:4321/";
const outDir = "docs/screenshots/audit";
const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const viewports = [
  { name: "wide", width: 1920, height: 1080 },
  { name: "desktop", width: 1440, height: 950 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "portrait", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

/** Минимальная зона нажатия: телефон и планшет-портрет 44 px, широкие экраны 36 px. */
const MIN_TARGET: Readonly<Record<string, number>> = { wide: 36, desktop: 36, tablet: 36, portrait: 44, mobile: 44 };

interface Finding { page: string; viewport: string; kind: string; detail: string; count?: number; severity?: "violation" | "metric" }

const auditPage = async (page: Page, name: string, viewport: string): Promise<Finding[]> =>
  page.evaluate(({ name, viewport, minTarget }) => {
    const out: { page: string; viewport: string; kind: string; detail: string; count?: number; severity?: "violation" | "metric" }[] = [];
    const lum = (rgb: number[]): number => {
      const f = (v: number): number => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(rgb[0] ?? 0) + 0.7152 * f(rgb[1] ?? 0) + 0.0722 * f(rgb[2] ?? 0);
    };
    const rgba = (value: string): number[] => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      return m ? (m[1] ?? "").split(",").map((x) => Number.parseFloat(x.trim())) : [0, 0, 0, 0];
    };
    const ratio = (fg: number[], bg: number[]): number => {
      const a = lum(fg);
      const b = lum(bg);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const doc = document.documentElement;
    /** Закрытые details и display:none не участвуют в проверках доступности. */
    const shown = (el: Element): boolean => {
      const node = el as HTMLElement & { checkVisibility?: (options?: object) => boolean };
      return typeof node.checkVisibility === "function" ? node.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }) : true;
    };
    if (doc.scrollWidth > doc.clientWidth + 1) out.push({ page: name, viewport, kind: "overflow-x", detail: doc.scrollWidth + " > " + doc.clientWidth });
    // Зоны нажатия считаются только в рабочей области: оболочка и скрытые контролы не в счёте.
    const scope = document.querySelector("#view") ?? document.body;
    const interactive = Array.from(scope.querySelectorAll("button, a, [tabindex], input, select, textarea")).filter((el) => {
      const r = (el as Element).getBoundingClientRect();
      return r.width > 0 && r.height > 0 && shown(el);
    });
    const small = interactive.filter((el) => {
      const r = (el as Element).getBoundingClientRect();
      return r.width < minTarget || r.height < minTarget;
    });
    if (small.length > 0) out.push({ page: name, viewport, kind: "tap-targets", count: small.length, detail: small.slice(0, 5).map((el) => {
      const r = (el as Element).getBoundingClientRect();
      const label = ((el as HTMLElement).innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 22);
      return label + " " + Math.round(r.width) + "x" + Math.round(r.height);
    }).join(" | ") });
    const unnamed = interactive.filter((el) => {
      const id = el.getAttribute("id") ?? "";
      const labelled = id !== "" && document.querySelector('label[for="' + id + '"]') !== null;
      const label = (el.getAttribute("aria-label") ?? "").trim() || ((el as HTMLElement).innerText ?? "").trim() ||
        (el.getAttribute("title") ?? "").trim() || (labelled ? "label" : "");
      return label === "";
    });
    if (unnamed.length > 0) out.push({ page: name, viewport, kind: "unlabeled", count: unnamed.length, detail: unnamed.slice(0, 5).map((el) => el.tagName + "." + (el.getAttribute("class") ?? "")).join(" | ") });
    const smallFonts = Array.from(document.querySelectorAll("p, span, b, small, text, div, a, button")).filter((el) => {
      const t = (el.textContent ?? "").trim();
      if (t === "" || el.children.length > 0) return false;
      const s = getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden" && Number.parseFloat(s.fontSize) < 12;
    }).length;
    if (smallFonts > 0) out.push({ page: name, viewport, kind: "fonts-small", count: smallFonts, detail: "текста мельче 12px: " + smallFonts });
    const canvas = document.querySelector("[data-canvas]");
    if (canvas) {
      const cs = getComputedStyle(canvas);
      const overflow = canvas.scrollWidth > canvas.clientWidth + 1;
      if (overflow) out.push({ page: name, viewport, kind: "canvas-scroll", severity: "metric", detail: "canvas " + canvas.clientWidth + "/" + canvas.scrollWidth + " (" + cs.overflowX + ")" });
    }
    const chips = document.querySelector("[data-chips]");
    if (chips && chips.scrollWidth > chips.clientWidth + 1) out.push({ page: name, viewport, kind: "chips-scroll", severity: "metric", detail: chips.clientWidth + "/" + chips.scrollWidth });
    const slider = document.querySelector('input[type="range"]');
    if (slider) {
      const a = slider.getAttribute("aria-label");
      const b = slider.getAttribute("aria-valuetext");
      out.push({ page: name, viewport, kind: "slider-a11y", severity: "metric", detail: "aria-label=" + (a ?? "нет") + "; aria-valuetext=" + (b ?? "нет") });
    }
    const commit = document.querySelector("[data-commit]");
    if (commit) {
      out.push({ page: name, viewport, kind: "commit-a11y", severity: "metric", detail: "role=" + (commit.getAttribute("role") ?? "нет") + "; aria-label=" + (commit.getAttribute("aria-label") ?? "нет") + "; tabindex=" + (commit.getAttribute("tabindex") ?? "нет") });
    }
    const card = document.querySelector("[data-node-card]");
    if (card) {
      const r = card.getBoundingClientRect();
      out.push({ page: name, viewport, kind: "card-position", severity: "metric", detail: "top=" + Math.round(r.top) + "px, в окне: " + (r.top < window.innerHeight && r.bottom > 0) });
    }
    const h = Array.from(document.querySelectorAll("h1, h2, h3")).map((x) => x.tagName + ": " + (x.textContent ?? "").trim().slice(0, 36));
    out.push({ page: name, viewport, kind: "headings", severity: "metric", count: h.length, detail: h.join(" | ") || "(нет)" });
    const low: string[] = [];
    for (const el of Array.from(document.querySelectorAll("p, span, b, small, text, div, a, button")).slice(0, 500)) {
      const t = (el.textContent ?? "").trim();
      if (t === "" || el.children.length > 0) continue;
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") continue;
      let bg = "rgba(0, 0, 0, 0)";
      let node: Element | null = el;
      let gradient = false;
      while (node) {
        const cs = getComputedStyle(node);
        if (cs.backgroundImage !== "none") { gradient = true; break; }
        if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") { bg = cs.backgroundColor; break; }
        node = node.parentElement;
      }
      // градиентный фон эвристикой не считается — контраст на нём проверяет axe
      if (gradient) continue;
      const size = Number.parseFloat(s.fontSize);
      const large = size >= 18.66 || (size >= 14 && Number(s.fontWeight) >= 700);
      const r = ratio(rgba(s.color), rgba(bg));
      if (r < (large ? 3 : 4.5)) low.push(r.toFixed(2) + " " + Math.round(size) + "px " + t.slice(0, 20));
    }
    if (low.length > 0) out.push({ page: name, viewport, kind: "contrast", count: low.length, detail: low.slice(0, 6).join(" | ") });
    return out;
  }, { name, viewport });

const axePage = async (page: Page, name: string, viewport: string): Promise<Finding[]> => {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: unknown) => Promise<{ violations: { id: string; impact: string | null; nodes: { target: string[] }[] }[] }> } }).axe;
    return axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
  });
  return result.violations.map((v) => ({
    page: name, viewport, kind: "axe:" + v.id, count: v.nodes.length,
    detail: "impact=" + (v.impact ?? "?") + "; " + v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | "),
  }));
};

const run = async (): Promise<void> => {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const report: Finding[] = [];
  const shots: string[] = [];
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const go = async (hash: string, file: string, settle = 700): Promise<void> => {
      await page.goto(base + hash, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(settle);
      report.push(...await auditPage(page, file, vp.name));
      report.push(...await axePage(page, file, vp.name));
      const path = outDir + "/" + vp.name + "-" + file + ".png";
      await page.screenshot({ path, fullPage: true });
      shots.push(path);
    };
    await go("#dashboard?at=2026-01-02", "dashboard", 600);
    await go("#incidents?at=2026-01-02", "incidents", 600);
    await go("#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02", "incident", 600);
    await go("#timeline?at=2026-01-02", "timeline", 900);
    // WP-3: на мобильном по умолчанию список событий, граф — по view=git; карточку узла проверяем на графе.
    await go("#timeline?at=2026-01-02&view=git", "timeline-graph", 900);
    const commit = page.locator('[data-commit][data-incident="З-015"][data-node="U6"]');
    if ((await commit.count()) > 0) {
      await commit.click();
      await page.waitForTimeout(400);
      report.push(...await auditPage(page, "timeline-card", vp.name));
      const p = outDir + "/" + vp.name + "-timeline-card.png";
      await page.screenshot({ path: p, fullPage: true });
      shots.push(p);
    }
    await go("#timeline?at=2026-01-02&view=gantt", "gantt");
    await go("#chat/З-015?at=2026-01-02", "chat", 600);
    await go("#model", "model", 600);
    await page.goto(base + "#timeline?at=2026-01-02&view=git", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.locator("[data-commit]").first().focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const cardAfterEnter = await page.locator("[data-node-card]").count();
    report.push({ page: "keyboard", viewport: vp.name, kind: "enter-on-commit", severity: "metric", detail: cardAfterEnter > 0 ? "карточка открылась" : "Enter не открывает карточку" });
    await page.close();
  }
  await browser.close();
  const violations = report.filter((item) => item.severity !== "metric");
  const metrics = report.filter((item) => item.severity === "metric");
  await writeFile(outDir + "/audit.json", JSON.stringify({ violations, metrics, shots }, null, 2));
  console.log(JSON.stringify({ violations: violations.length, metrics: metrics.length, shots: shots.length }, null, 2));
};

await run();