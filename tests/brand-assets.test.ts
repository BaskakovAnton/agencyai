import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("index.html подключает иконку, манифест и скелет загрузки", async () => {
  const html = await readFile("src/web/index.html", "utf8");
  expect(html).toContain('rel="icon" href="./favicon.svg"');
  expect(html).toContain('rel="manifest" href="./manifest.webmanifest"');
  expect(html).toContain("data-boot");
  expect(html).toContain('name="description"');
});

test("манифест описывает бренд, тему и иконку", async () => {
  const raw = await readFile("src/web/manifest.webmanifest", "utf8");
  const manifest = JSON.parse(raw) as { name: string; theme_color: string; display: string; icons: { src: string }[] };
  expect(manifest.name).toContain("ДЕПУТАТ 360°");
  expect(manifest.theme_color).toBe("#0f1115");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons[0]?.src).toBe("./favicon.svg");
});

test("иконка — валидный SVG с брендовым знаком", async () => {
  const svg = await readFile("src/web/favicon.svg", "utf8");
  expect(svg).toContain("<svg");
  expect(svg).toContain("360");
  expect(svg).toContain("linearGradient");
});
