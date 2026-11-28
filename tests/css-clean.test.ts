import { expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";

const cssFiles = (await readdir("src/web")).filter((name) => name.endsWith(".css") && name !== "tokens.css");
const tsFiles = (await readdir("src/web")).filter((name) => name.endsWith(".ts"));

test("в CSS нет правил для удалённых классов реестра", async () => {
  for (const file of cssFiles) {
    const css = await readFile("src/web/" + file, "utf8");
    expect(css.match(/\.incidents-table\b/g) ?? []).toEqual([]);
  }
});

test("в CSS нет полос прогресса, заменённых кольцом SLA", async () => {
  for (const file of cssFiles) {
    const css = await readFile("src/web/" + file, "utf8");
    expect(css.match(/\.progress(-head|-paused|-overdue|-none)?\b/g) ?? []).toEqual([]);
  }
});

test("бейджи и пустые состояния не собираются вручную на экранах", async () => {
  for (const file of tsFiles.filter((name) => name !== "components.ts")) {
    const source = await readFile("src/web/" + file, "utf8");
    expect(source).not.toContain('class="badge');
    expect(source).not.toContain('class="empty-state"');
  }
});

test("заголовок раздела доступен как общий компонент", async () => {
  const components = await readFile("src/web/components.ts", "utf8");
  expect(components).toContain("export const renderSectionHeader");
  expect(components).toContain("export const renderPriorityBadge");
  expect(components).toContain("export const renderActiveFilterChip");
});
