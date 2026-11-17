import { expect, test } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildWeb } from "../scripts/build-web.ts";

test("buildWeb падает с понятной ошибкой на неверной точке входа", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agencyai-badbuild-"));
  await expect(buildWeb({ outDir: dir, entry: "src/web/нет-такого-файла.ts" })).rejects.toThrow(/не удалась/);
});

test("buildWeb запускается как CLI и печатает путь сборки", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agencyai-clibuild-"));
  const runtime = Bun.which("bun") ?? process.execPath;
  const proc = Bun.spawnSync([runtime, "run", "scripts/build-web.ts", dir], { stdout: "pipe", stderr: "pipe" });
  const out = new TextDecoder().decode(proc.stdout);
  expect(proc.exitCode).toBe(0);
  expect(out).toContain("собрано");
  expect((await readdir(dir)).sort()).toEqual(["app.js", "index.html", "screens.css", "shell.css", "style.css", "tokens.css"]);
});
