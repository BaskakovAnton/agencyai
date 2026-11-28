import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildWeb } from "../scripts/build-web.ts";
import { demoMismatches } from "../scripts/verify-demo-sync.ts";

test("закоммиченный demo/ совпадает со свежей сборкой из исходников", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agencyai-demo-sync-test-"));
  await buildWeb({ outDir: dir, minify: true });
  expect(await demoMismatches("demo", dir)).toEqual([]);
});
