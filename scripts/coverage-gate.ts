/** Гейт покрытия доменного слоя (C3): считает core+data по lcov и падает ниже порога. */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const THRESHOLDS = { lines: 92, functions: 88 } as const;
const AREAS = ["src/core/", "src/data/"] as const;

const run = async (): Promise<void> => {
  const dir = await mkdtemp(join(tmpdir(), "agencyai-coverage-"));
  const proc = Bun.spawnSync(
    [process.execPath, "test", "--coverage", "--coverage-reporter=lcov", "--coverage-dir=" + dir],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (proc.exitCode !== 0) {
    console.error("тесты упали — покрытие не проверяется");
    process.exit(1);
  }
  const lcov = await readFile(join(dir, "lcov.info"), "utf8");
  await rm(dir, { recursive: true, force: true });
  let linesFound = 0, linesHit = 0, funcsFound = 0, funcsHit = 0, current = "";
  for (const line of lcov.split("\n")) {
    if (line.startsWith("SF:")) current = line.slice(3).replace(/\\/g, "/");
    if (!AREAS.some((area) => current.includes(area))) continue;
    if (line.startsWith("LF:")) linesFound += Number(line.slice(3));
    if (line.startsWith("LH:")) linesHit += Number(line.slice(3));
    if (line.startsWith("FNF:")) funcsFound += Number(line.slice(4));
    if (line.startsWith("FNH:")) funcsHit += Number(line.slice(4));
  }
  const percent = (hit: number, found: number): number => (found === 0 ? 0 : (hit / found) * 100);
  const lines = percent(linesHit, linesFound);
  const functions = percent(funcsHit, funcsFound);
  console.log("покрытие core+data: строки " + lines.toFixed(2) + "%, функции " + functions.toFixed(2) + "%");
  const problems: string[] = [];
  if (lines < THRESHOLDS.lines) problems.push("строки " + lines.toFixed(2) + "% < " + THRESHOLDS.lines + "%");
  if (functions < THRESHOLDS.functions) problems.push("функции " + functions.toFixed(2) + "% < " + THRESHOLDS.functions + "%");
  if (problems.length > 0) {
    console.error("порог покрытия домена не достигнут: " + problems.join(", "));
    process.exit(1);
  }
};

await run();
