import { expect, test } from "bun:test";
import { mulberry32, pick, pickWeighted, randInt, shuffle } from "../src/random.ts";

test("mulberry32 детерминирован и даёт числа из [0, 1)", () => {
  const first = mulberry32(1);
  const second = mulberry32(1);
  for (let i = 0; i < 50; i += 1) {
    const value = first();
    expect(value).toBe(second());
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  }
});

test("pick и randInt держатся в границах", () => {
  const rand = mulberry32(5);
  const items = ["a", "b", "c"] as const;
  for (let i = 0; i < 30; i += 1) expect(items).toContain(pick(items, rand));
  for (let i = 0; i < 30; i += 1) {
    const value = randInt(2, 4, rand);
    expect(value).toBeGreaterThanOrEqual(2);
    expect(value).toBeLessThanOrEqual(4);
  }
  expect(() => pick([], rand)).toThrow();
});

test("pickWeighted уважает веса и терпит нулевые", () => {
  const items = [{ weight: 0 }, { weight: 5 }];
  for (let seed = 1; seed <= 20; seed += 1) {
    expect(pickWeighted(items, (item) => item.weight, mulberry32(seed))).toEqual({ weight: 5 });
  }
  const flat = [{ weight: 0 }, { weight: 0 }];
  expect(flat).toContain(pickWeighted(flat, (item) => item.weight, mulberry32(1)));
  expect(mulberry32(0)).toBeDefined();
});

test("shuffle переставляет без потерь и не трогает исходный массив", () => {
  const source = [1, 2, 3, 4, 5];
  const first = shuffle(source, mulberry32(7));
  const second = shuffle(source, mulberry32(7));
  expect(first).toEqual(second);
  expect([...first].sort()).toEqual(source);
  expect(source).toEqual([1, 2, 3, 4, 5]);
});
