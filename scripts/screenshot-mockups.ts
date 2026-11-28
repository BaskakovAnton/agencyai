import { chromium, firefox, webkit } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/** Снимки макетов для приёмки: обе темы, мобильный вид и проверка отрисовки в трёх движках. */
const page = pathToFileURL(resolve("docs/design/mockups/radial.html")).href;
const out = "docs/design/mockups";

const shoot = async (): Promise<void> => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const view = await context.newPage({ viewport: { width: 1440, height: 1000 } });
  const problems: string[] = [];
  view.on("pageerror", (error) => problems.push(error.message));
  view.on("console", (message) => { if (message.type() === "error") problems.push(message.text()); });
  await view.goto(page, { waitUntil: "networkidle" });
  await view.waitForTimeout(900);
  await view.screenshot({ path: out + "/radial-dark-desktop.png", fullPage: true });
  await view.locator('[data-theme-btn="light"]').click();
  await view.waitForTimeout(600);
  await view.screenshot({ path: out + "/radial-light-desktop.png", fullPage: true });
  const mobile = await context.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(page, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(900);
  await mobile.screenshot({ path: out + "/radial-dark-mobile.png", fullPage: true });
  const orbit = await view.evaluate(() => ({
    arcs: document.querySelectorAll("o-arc").length,
    progress: document.querySelectorAll("o-progress").length,
    drawn: document.querySelectorAll("o-arc, o-progress").length > 0 &&
      [...document.querySelectorAll("o-arc, o-progress")].every((el) => (el.shadowRoot?.querySelector("svg") ?? null) !== null),
    ownSvg: document.querySelectorAll("svg.ring").length,
  }));
  console.log("Orbit на макете: элементов " + (orbit.arcs + orbit.progress) + ", отрисовано=" + orbit.drawn + ", своих SVG=" + orbit.ownSvg);
  console.log("ошибок консоли: " + problems.length + (problems.length > 0 ? " :: " + problems.slice(0, 2).join(" | ") : ""));
  await browser.close();
  // Кросс-движковая проверка самого макета.
  for (const [name, engine] of [["firefox", firefox], ["webkit", webkit]] as const) {
    const other = await engine.launch();
    const p = await other.newPage({ viewport: { width: 1440, height: 1000 } });
    await p.goto(page, { waitUntil: "networkidle" });
    await p.waitForTimeout(900);
    const info = await p.evaluate(() => ({
      own: document.querySelectorAll("svg.ring").length,
      orbit: [...document.querySelectorAll("o-arc, o-progress")].filter((el) => (el.shadowRoot?.querySelector("svg") ?? null) !== null).length,
    }));
    console.log(name + ": своих SVG=" + info.own + ", Orbit отрисовано=" + info.orbit);
    await other.close();
  }
};

await shoot();
