/** Бюджет размера сборки (B3): бандл и весь demo не должны расти бесконтрольно. */
import { stat } from "node:fs/promises";
import { readdir } from "node:fs/promises";

const LIMITS = { appJs: 180, demo: 260 } as const;

const kb = (bytes: number): number => Math.round((bytes / 1024) * 10) / 10;

const appSize = (await stat("demo/app.js")).size;
const files = await readdir("demo");
let demoSize = 0;
for (const file of files) demoSize += (await stat("demo/" + file)).size;

const appKb = kb(appSize);
const demoKb = kb(demoSize);
console.log("app.js: " + appKb + " КБ (бюджет " + LIMITS.appJs + "), demo: " + demoKb + " КБ (бюджет " + LIMITS.demo + ")");

const problems: string[] = [];
if (appKb > LIMITS.appJs) problems.push("app.js " + appKb + " КБ > " + LIMITS.appJs + " КБ");
if (demoKb > LIMITS.demo) problems.push("demo " + demoKb + " КБ > " + LIMITS.demo + " КБ");
if (problems.length > 0) {
  console.error("бюджет размера превышен: " + problems.join(", ") + "; пересоберите и проверьте рост зависимостей");
  process.exit(1);
}
