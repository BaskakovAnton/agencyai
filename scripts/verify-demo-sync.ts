/** Проверка, что закоммиченный demo/ совпадает со сборкой из исходников (C1). */
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildWeb } from "./build-web.ts";

const sha = (buffer: Uint8Array): string => createHash("sha256").update(buffer).digest("hex");

/** Сравнивает закоммиченный каталог со свежей сборкой и возвращает список расхождений. */
export const demoMismatches = async (committedDir: string, freshDir: string): Promise<readonly string[]> => {
  const [committed, fresh] = await Promise.all([readdir(committedDir), readdir(freshDir)]);
  const names = [...new Set([...committed, ...fresh])].sort();
  const problems: string[] = [];
  for (const name of names) {
    if (!committed.includes(name)) { problems.push("лишний в сборке: " + name); continue; }
    if (!fresh.includes(name)) { problems.push("нет в сборке: " + name); continue; }
    const [left, right] = await Promise.all([readFile(join(committedDir, name)), readFile(join(freshDir, name))]);
    if (sha(left) !== sha(right)) problems.push("расходится: " + name);
  }
  return problems;
};

if (import.meta.main) {
  const dir = await mkdtemp(join(tmpdir(), "agencyai-demo-sync-"));
  await buildWeb({ outDir: dir, minify: true });
  const problems = await demoMismatches("demo", dir);
  await rm(dir, { recursive: true, force: true });
  if (problems.length > 0) {
    console.error("demo/ устарел — пересоберите: bun run build:demo");
    for (const problem of problems) console.error("  " + problem);
    process.exit(1);
  }
  console.log("demo/ совпадает со сборкой из исходников");
}
