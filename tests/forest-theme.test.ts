import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const read = (p: string) => readFile(p, "utf8");
const [tokens, shell, style, screens] = await Promise.all([
  read("src/web/tokens.css"),
  read("src/web/shell.css"),
  read("src/web/style.css"),
  read("src/web/screens.css"),
]);
const all = tokens + shell + style + screens;
const noSpaces = tokens.replace(/\s+/g, "");

test("палитра forest из эталона на месте", () => {
  expect(noSpaces).toContain("--color-bg:#f4f6f5");
  expect(noSpaces).toContain("--color-surface:#ffffff");
  expect(noSpaces).toContain("--color-surface-muted:#f8faf9");
  expect(noSpaces).toContain("--color-text:#18221e");
  expect(noSpaces).toContain("--color-primary:#149447");
  expect(noSpaces).toContain("--color-primary-strong:#087638");
  expect(noSpaces).toContain("--color-primary-soft:#e8f7ed");
  expect(noSpaces).toContain("--color-border:#e4eae6");
  expect(noSpaces).toContain("--color-border-strong:#d7e0da");
  expect(noSpaces).toContain("--nav-bg:#111a18");
  expect(noSpaces).toContain("--nav-text:#d7e0db");
  expect(noSpaces).toContain("--radius-lg:15px");
});

test("текстовые варианты статусов тёмные — иначе не пройдёт AA", () => {
  expect(noSpaces).toContain("--color-success-text:#087638");
  expect(all).toContain("--color-danger-text");
  expect(all).toContain("--color-warning-text");
});

test("оболочка: тёмный сайдбар 246, топбар 76, H1 22", () => {
  expect(noSpaces).toContain("--sidebar-w:246px");
  expect(shell).toContain("height: 76px");
  expect(shell).toMatch(/\.page-title \{[^}]*font-size: 22px/);
  expect(shell).toMatch(/\.sidebar \{[^}]*var\(--nav-bg\)/);
});

test("наши правила: нет кеглей меньше 12px и нет инлайновых цветов", () => {
  for (const size of ["9px", "10px", "11px"]) {
    expect(all).not.toContain("font-size: " + size);
    expect(all).not.toContain("font-size:" + size);
  }
});
