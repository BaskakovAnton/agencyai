import { expect, test } from "bun:test";
import { COHORT_TITLES, applyFilters, cohortsByNode, pluralize, tooltipFor } from "../src/core/analytics.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { startSla } from "../src/core/sla.ts";
import type { Incident, Priority } from "../src/types.ts";

const graph = buildProcessGraph();

const mk = (id: string, nodeId: string, priority: Priority): Incident => ({
  id,
  category: "test",
  title: "Тестовая заявка",
  address: "ул. Тестовая, д. 1",
  reporter: "телефон",
  priority,
  nodeId,
  situationId: "С1",
  sla: startSla(priority, 0),
  history: [],
});

const incidents: readonly Incident[] = [
  mk("З-001", "U1", "urgent"),
  mk("З-002", "U1", "normal"),
  mk("З-003", "U7", "urgent"),
  mk("З-004", "U7", "normal"),
  mk("З-005", "U7", "routine"),
];

test("когорты по узлам: 30 узлов, счётчики и итоги", () => {
  const buckets = cohortsByNode(graph, incidents);
  expect(buckets.length).toBe(30);
  const u1 = buckets.find((b) => b.nodeId === "U1")!;
  expect(u1.total).toBe(2);
  expect(u1.byCohort.urgent).toBe(1);
  expect(u1.byCohort.normal).toBe(1);
  const u7 = buckets.find((b) => b.nodeId === "U7")!;
  expect(u7.total).toBe(3);
  expect(u7.byCohort).toEqual({ urgent: 1, normal: 1, routine: 1, none: 0 });
  expect(u7.incidentIds).toEqual(["З-003", "З-004", "З-005"]);
  expect(buckets.find((b) => b.nodeId === "U30")!.total).toBe(0);
});

test("русские формы числительных", () => {
  expect(pluralize(1, "заявка", "заявки", "заявок")).toBe("заявка");
  expect(pluralize(3, "заявка", "заявки", "заявок")).toBe("заявки");
  expect(pluralize(5, "заявка", "заявки", "заявок")).toBe("заявок");
  expect(pluralize(11, "заявка", "заявки", "заявок")).toBe("заявок");
  expect(pluralize(22, "заявка", "заявки", "заявок")).toBe("заявки");
});

test("текст тултипа совпадает с макетом", () => {
  const u7 = cohortsByNode(graph, incidents).find((b) => b.nodeId === "U7")!;
  expect(tooltipFor(u7)).toBe("Узел U7 · Передача подрядчику: 3 заявки (1 аварийная, 1 неотложная, 1 обычная)");
  const single = cohortsByNode(graph, [mk("З-001", "U1", "urgent")]).find((b) => b.nodeId === "U1")!;
  expect(tooltipFor(single)).toBe("Узел U1 · Подача обращения: 1 заявка (1 аварийная)");
  expect(COHORT_TITLES.urgent).toContain("Авария");
});

test("фильтры: когорта, узел, роль и их комбинация", () => {
  expect(applyFilters(graph, incidents, { cohort: "urgent", nodeId: "", role: "any" }).map((i) => i.id)).toEqual(["З-001", "З-003"]);
  expect(applyFilters(graph, incidents, { cohort: "all", nodeId: "U7", role: "any" }).map((i) => i.id)).toEqual(["З-003", "З-004", "З-005"]);
  expect(applyFilters(graph, incidents, { cohort: "all", nodeId: "", role: "deputy" }).length).toBe(5);
  // подрядчик не действует ни на U1, ни на U7 → пусто
  expect(applyFilters(graph, incidents, { cohort: "all", nodeId: "", role: "contractor" }).length).toBe(0);
  // житель действует только на U1
  expect(applyFilters(graph, incidents, { cohort: "all", nodeId: "", role: "resident" }).map((i) => i.id)).toEqual(["З-001", "З-002"]);
  expect(applyFilters(graph, incidents, { cohort: "urgent", nodeId: "U7", role: "deputy" }).map((i) => i.id)).toEqual(["З-003"]);
});
