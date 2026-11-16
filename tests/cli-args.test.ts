import { expect, test } from "bun:test";
import { parseArgs } from "../src/cli/args.ts";

test("значения по умолчанию", () => {
  const parsed = parseArgs([]);
  expect(parsed.seed).toBe(42);
  expect(parsed.auto).toBe(0);
  expect(parsed.script).toEqual([]);
  expect(parsed.outDir).toBe("reports");
});

test("флаги --seed, --auto, --out читаются", () => {
  const parsed = parseArgs(["--seed", "7", "--auto", "12", "--out", "tmp"]);
  expect(parsed.seed).toBe(7);
  expect(parsed.auto).toBe(12);
  expect(parsed.outDir).toBe("tmp");
});

test("--script разбивается по точкам с запятой и тримится", () => {
  const parsed = parseArgs(["--script", "list ; forward 5;; show 5"]);
  expect(parsed.script).toEqual(["list", "forward 5", "show 5"]);
});

test("мусор в числах не ломает запуск: берутся значения по умолчанию", () => {
  const parsed = parseArgs(["--seed", "abc", "--auto", "xx"]);
  expect(parsed.seed).toBe(42);
  expect(parsed.auto).toBe(0);
  expect(parseArgs(["--auto", "-5"]).auto).toBe(0);
});
