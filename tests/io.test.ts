import { expect, test } from "bun:test";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPORTS_DIR, stamp, writeFinalState, writeReport } from "../src/io/writers.ts";

const ISO = "2026-11-16T12:00:00.000Z";

test("stamp превращает ISO в безопасное имя файла", () => {
  expect(stamp(ISO)).toBe("2026-11-16_12-00-00");
  expect(stamp(ISO)).not.toContain(":");
  expect(stamp(ISO).length).toBe(19);
});

test("writeReport и writeFinalState пишут файлы в указанную папку", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agencyai-io-"));
  const report = await writeReport(dir, "ОТЧЁТ", ISO);
  const state = await writeFinalState(dir, { step: 3, incidents: [] }, ISO);
  expect(await readFile(report, "utf8")).toBe("ОТЧЁТ\n");
  expect(JSON.parse(await readFile(state, "utf8"))).toEqual({ step: 3, incidents: [] });
  expect((await readdir(dir)).sort()).toEqual(["final-state-2026-11-16_12-00-00.json", "report-2026-11-16_12-00-00.md"]);
});

test("повторная запись перезаписывает файл, а не падает", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agencyai-io2-"));
  await writeReport(dir, "первый", ISO);
  const again = await writeReport(dir, "второй", ISO);
  expect(await readFile(again, "utf8")).toBe("второй\n");
  expect((await readdir(dir)).length).toBe(1);
});

test("каталог отчётов по умолчанию — reports", () => {
  expect(REPORTS_DIR).toBe("reports");
});
