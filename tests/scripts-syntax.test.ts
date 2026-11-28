import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Стражи синтаксиса скриптов: scripts/ не входит в tsc, поэтому сломанный скрипт
 * (например, лишняя скобка после правки) обнаруживался только в CI.
 */
const scripts = (await readdir("scripts")).filter((name) => name.endsWith(".ts"));

test("скрипты собираются без синтаксических ошибок", async () => {
  expect(scripts.length).toBeGreaterThan(0);
  const outdir = join(tmpdir(), "scripts-syntax-" + Date.now());
  const result = await Bun.build({
    entrypoints: scripts.map((name) => "scripts/" + name),
    target: "bun",
    outdir,
    throw: false,
  });
  const problems = result.logs.filter((log) => log.level === "error").map((log) => String(log.message));
  expect(problems, problems.join("; ")).toEqual([]);
  expect(result.success).toBe(true);
});
