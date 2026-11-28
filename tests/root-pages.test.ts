import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const stubs = ["process.html", "player.html", "matrix.html"];

test("страницы прототипа сведены к одной: остались только редиректы", async () => {
  for (const file of stubs) {
    const html = await readFile(file, "utf8");
    expect(html).toContain('http-equiv="refresh"');
    expect(html).toContain('url=./index.html');
    expect(html.length).toBeLessThan(800);
  }
});

test("корневая страница ведёт в рабочую систему", async () => {
  const html = await readFile("index.html", "utf8");
  expect(html).toContain("data-demo-banner");
  expect(html).toContain('href="./demo/"');
  expect(html).toContain("data-demo-banner-close");
});

test("печатные стили подключены и скрывают обвязку", async () => {
  const html = await readFile("src/web/index.html", "utf8");
  expect(html).toContain('href="./print.css" media="print"');
  const css = await readFile("src/web/print.css", "utf8");
  expect(css).toContain("@media print");
  expect(css).toContain("ui-sidebar");
  expect(css).toContain("ui-topbar");
});

test("index.html остаётся полноценной страницей-источником", async () => {
  const html = await readFile("index.html", "utf8");
  expect(html.length).toBeGreaterThan(10_000);
  expect(html).not.toContain('http-equiv="refresh"');
});
