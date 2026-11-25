/** UX-3.1.2: модельное время не зависит от часового пояса пользователя. */
import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { dayOf, daysRange } from "../src/core/timeline.ts";
import { dayShift, periodEndingAt } from "../src/core/periods.ts";
import { modelTimestamp } from "../src/web/historical.ts";

test("модельная отметка времени остаётся внутри выбранного дня при любой тайм-зоне", () => {
  const day = "2026-01-10";
  const stamp = modelTimestamp(day);
  expect(stamp).toBe(day + "T12:00:00.000Z");
  expect(dayOf(stamp)).toBe(day);
  // Полдень UTC не переходит на соседний день ни при сдвиге назад, ни вперёд.
  expect(dayOf(day + "T00:00:00.000Z")).toBe(day);
  expect(dayOf(day + "T23:59:59.999Z")).toBe(day);
  expect(new Date(stamp).toISOString().slice(0, 10)).toBe(day);
});

test("границы периодов считаются по UTC-дням", () => {
  const period = periodEndingAt("2026-01-10", 7);
  expect(period.fromDay).toBe("2026-01-04");
  expect(dayShift("2026-01-10", -1)).toBe("2026-01-09");
  const incident = {
    id: "x",
    category: "elevator",
    title: "Проверка",
    address: "ул. Тестовая",
    reporter: "Житель дома",
    priority: "normal" as const,
    nodeId: "U1",
    situationId: "С9",
    sla: { dueAt: 72, paused: false, pauseReason: "", pausedAt: 0, breached: false, escalated: false },
    history: [],
    createdAt: "2026-01-10T23:30:00.000Z",
  };
  expect(daysRange([incident])).toEqual(["2026-01-10"]);
});

test("в модулях расчёта нет обращения к локальному времени", async () => {
  const files = [
    "src/core/periods.ts",
    "src/core/timeline.ts",
    "src/core/analytics/snapshot.ts",
    "src/core/analytics/flow.ts",
    "src/core/analytics/kpi.ts",
    "src/web/historical.ts",
    "src/web/dashboard-html.ts",
    "src/web/incidents-html.ts",
  ];
  const forbidden = /toLocaleDateString|toLocaleString|\bgetDate\(|\bgetMonth\(|\bgetHours\(|Date\.now\(/;
  for (const file of files) {
    const source = await readFile(file, "utf8");
    expect({ file, local: forbidden.test(source) }).toEqual({ file, local: false });
  }
});
