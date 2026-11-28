import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

/** Контраст токенов (C4): обе темы обязаны держать AA для обычного текста. */
const text = await readFile("src/web/tokens.css", "utf8");

const block = (from: number): Record<string, string> => {
  const out: Record<string, string> = {};
  const end = text.indexOf("}", from);
  for (const match of text.slice(from, end).matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) out[match[1] as string] = (match[2] as string).trim();
  return out;
};
const light = block(text.indexOf(":root {"));
const dark = block(text.indexOf('[data-theme="dark"]'));

const rgb = (value: string): [number, number, number] | null => {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (match === null) return null;
  const n = Number.parseInt(match[1] as string, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (rgb3: [number, number, number]): number => {
  const f = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(rgb3[0]) + 0.7152 * f(rgb3[1]) + 0.0722 * f(rgb3[2]);
};
const ratio = (a: string, b: string): number => {
  const x = rgb(a); const y = rgb(b);
  if (x === null || y === null) throw new Error("не hex-цвет: " + a + " / " + b);
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const PAIRS: readonly (readonly [string, string, string])[] = [
  ["текст на фоне", "--color-text", "--color-bg"],
  ["текст на поверхности", "--color-text", "--color-surface"],
  ["приглушённый на фоне", "--color-text-muted", "--color-bg"],
  ["приглушённый на поверхности", "--color-text-muted", "--color-surface"],
  ["мелкий на поверхности", "--color-subtle", "--color-surface"],
  ["ссылка на поверхности", "--color-primary-strong", "--color-surface"],
];

const check = (theme: Record<string, string>, name: string): void => {
  for (const [label, fg, bg] of PAIRS) {
    const value = ratio(theme[fg] as string, theme[bg] as string);
    expect(value, name + ": " + label + " = " + value.toFixed(2)).toBeGreaterThanOrEqual(4.5);
  }
};

test("светлая тема держит контраст AA для обычного текста", () => check(light, "светлая"));
test("тёмная тема держит контраст AA для обычного текста", () => check(dark, "тёмная"));
