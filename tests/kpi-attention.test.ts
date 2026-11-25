import { expect, test } from "bun:test";
import { buildPeriodAnalytics } from "../src/core/analytics/kpi.ts";
import { snapshotOn } from "../src/core/analytics/snapshot.ts";
import { needsAttention } from "../src/core/sla-attention.ts";
import { graph, incidents } from "./attention-fixture.ts";

test("просрочка и внимание не совпадают, внимание считается по needsAttention", () => {
  const snapshot = snapshotOn(graph, incidents, "2026-01-05");
  expect(snapshot.overdue).toBe(2); // A и D
  expect(snapshot.attention).toBe(3); // A, D (просрочка) + B (срочная в срок)
  const expected = incidents.filter((incident) => needsAttention(graph, incident, "2026-01-05")).length;
  expect(snapshot.attention).toBe(expected);
});

test("динамика внимания сравнивает внимание с вниманием и не подменяется просрочкой", () => {
  const analytics = buildPeriodAnalytics({ graph, incidents }, "2026-01-05", 7);
  const attention = analytics.kpis.find((kpi) => kpi.id === "attention");
  const overdue = analytics.kpis.find((kpi) => kpi.id === "overdue");
  expect(attention).toBeDefined();
  expect(attention!.value).toBe(analytics.snapshot.attention);
  expect(attention!.delta!.current).toBe(analytics.snapshot.attention);
  expect(attention!.delta!.previous).toBe(analytics.snapshotPrevious.attention);
  // Просрочка не изменилась, внимание выросло — это разные дельты.
  expect(overdue!.delta!.change).toBe(0);
  expect(attention!.delta!.change).not.toBe(overdue!.delta!.change);
});

test("рост просрочки без изменения внимания: показатели независимы", () => {
  const early = snapshotOn(graph, incidents, "2026-01-05");
  const later = snapshotOn(graph, incidents, "2026-01-06");
  // B (срочная с 5 января) к 6 января становится просроченной, но внимания не прибавляет.
  expect(later.overdue).toBe(early.overdue + 1);
  expect(later.attention).toBe(early.attention);
});

test("нулевая база и отсутствие данных не дают ложного процента", () => {
  const empty = snapshotOn(graph, incidents, "2025-12-01");
  expect(empty.hasData).toBe(false);
  expect(empty.attention).toBe(0);
  const analytics = buildPeriodAnalytics({ graph, incidents }, "2025-12-25", 7);
  const attention = analytics.kpis.find((kpi) => kpi.id === "attention")!;
  expect(attention.delta!.percent).toBeNull();
  expect(attention.delta!.text).toBe("нет сравнения");
});
