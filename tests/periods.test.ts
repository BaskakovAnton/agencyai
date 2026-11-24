import { expect, test } from "bun:test";
import { dayShift, periodEndingAt, previousOf } from "../src/core/periods.ts";

test("границы семидневного периода включают обе даты", () => {
  const period = periodEndingAt("2026-01-10", 7);
  expect(period.fromDay).toBe("2026-01-04");
  expect(period.toDay).toBe("2026-01-10");
  expect(period.days).toHaveLength(7);
  expect(period.days[0]).toBe("2026-01-04");
  expect(period.days.at(-1)).toBe("2026-01-10");
});

test("границы тридцатидневного периода", () => {
  const period = periodEndingAt("2026-01-10", 30);
  expect(period.fromDay).toBe("2025-12-12");
  expect(period.days).toHaveLength(30);
});

test("предыдущий период той же длины не пересекается с текущим", () => {
  const period = periodEndingAt("2026-01-10", 7);
  const previous = previousOf(period);
  expect(previous.fromDay).toBe("2025-12-28");
  expect(previous.toDay).toBe("2026-01-03");
  expect(previous.days).toHaveLength(7);
  const currentSet = new Set(period.days);
  expect(previous.days.some((day) => currentSet.has(day))).toBe(false);
  expect(previous.toDay < period.fromDay).toBe(true);
});

test("сдвиг дня работает через границы месяца и года", () => {
  expect(dayShift("2026-01-01", -1)).toBe("2025-12-31");
  expect(dayShift("2026-03-01", -7)).toBe("2026-02-22");
  expect(dayShift("2024-02-28", 1)).toBe("2024-02-29");
  expect(dayShift("2024-02-29", 1)).toBe("2024-03-01");
});

test("расчёт периода повторяем: одинаковый вход — одинаковый выход", () => {
  const first = periodEndingAt("2026-01-10", 30);
  const second = periodEndingAt("2026-01-10", 30);
  expect(first).toEqual(second);
});
