import { expect, test } from "bun:test";
import { SLA_LEGEND_TITLES, SLA_PHASE_LABELS, SLA_PHASE_TITLES, SLA_PHASES } from "../src/core/sla-at.ts";
import { PHASE_TITLES } from "../src/web/overview.ts";

test("подписи фаз живут в ядре и различимы", () => {
  expect(PHASE_TITLES).toBe(SLA_PHASE_LABELS);
  expect(SLA_PHASES.map((phase) => SLA_PHASE_LABELS[phase])).toEqual(["В срок", "Пауза", "Просрочено", "Нет SLA"]);
  expect(new Set(SLA_PHASES.map((phase) => SLA_PHASE_LABELS[phase])).size).toBe(4);
  expect(SLA_PHASE_LABELS.overdue).not.toBe(SLA_PHASE_LABELS.none);
});

test("короткие подписи и легенда остаются прежними для значков", () => {
  expect(SLA_PHASE_TITLES.ok).toBe("в срок");
  expect(SLA_PHASE_TITLES.overdue).toBe("вне SLA");
  expect(SLA_LEGEND_TITLES.none).toBe("вне норматива");
  expect(SLA_LEGEND_TITLES.overdue).not.toBe(SLA_LEGEND_TITLES.none);
});
