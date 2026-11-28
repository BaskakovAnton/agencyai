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

test("index.html остаётся полноценной страницей-источником", async () => {
  const html = await readFile("index.html", "utf8");
  expect(html.length).toBeGreaterThan(10_000);
  expect(html).not.toContain('http-equiv="refresh"');
});
