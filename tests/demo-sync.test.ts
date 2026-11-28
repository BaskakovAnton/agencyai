import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildWeb } from "../scripts/build-web.ts";
import { demoMismatches } from "../scripts/verify-demo-sync.ts";

test("закоммиченный demo/ совпадает со свежей сборкой из исходников", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agencyai-demo-sync-test-"));
  await buildWeb({ outDir: dir, minify: true });
  let problems = await demoMismatches("demo", dir);
  if (problems.length > 0) {
    // Возможная гонка с параллельной пересборкой demo/: при настоящем расхождении оно сохранится.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    problems = await demoMismatches("demo", dir);
  }
  expect(problems).toEqual([]);
});
