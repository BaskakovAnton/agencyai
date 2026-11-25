import { expect, test } from "bun:test";
import { snapshotOn } from "../src/core/analytics/snapshot.ts";
import { graph, incidents, lifecycles } from "./kpi-fixture.ts";

test("Snapshot показывает состояние на дату, а не поток за период", () => {
  const snapshot = snapshotOn(graph, incidents, "2026-01-10", lifecycles);
  expect(snapshot.total).toBe(5);
  expect(snapshot.finished).toBe(1);
  expect(snapshot.active).toBe(4);
  expect(snapshot.paused).toBe(1);
  expect(snapshot.pendingReview).toBe(1);
  expect(snapshot.none).toBe(1);
});

test("просрочка считается только по незавершённым обращениям", () => {
  const snapshot = snapshotOn(graph, incidents, "2026-01-10", lifecycles);
  // З-101 и З-102 вне норматива; завершённая З-103 в просрочку не попадает.
  expect(snapshot.overdue).toBe(2);
  expect(snapshot.atRisk).toBe(2);
});

test("Snapshot на более раннюю дату отличается и восстанавливается без истории вперёд", () => {
  // UX-3.1: 3 января З-103 уже на терминальном узле, но подтверждение будет 4 января,
  // поэтому она ожидает проверки и остаётся активной нагрузкой, а не завершённой.
  const early = snapshotOn(graph, incidents, "2026-01-03", lifecycles);
  expect(early.total).toBe(2);
  expect(early.finished).toBe(0);
  expect(early.active).toBe(2);
  expect(early.pendingReview).toBe(1);
  expect(early.overdue).toBe(2); // З-101 и З-103 (обе срочные и вне норматива)
});

test("нет данных — нули и явный признак отсутствия", () => {
  const empty = snapshotOn(graph, incidents, "2025-12-01", lifecycles);
  expect(empty.total).toBe(0);
  expect(empty.active).toBe(0);
  expect(empty.overdue).toBe(0);
  expect(empty.hasData).toBe(false);
});
