import { expect, test } from "bun:test";
import { renderIncidentsBody, type IncidentsInput } from "../src/web/incidents-html.ts";
import { defaultFilters, type IncidentRow } from "../src/web/incidents.ts";

const row = (over: Partial<IncidentRow>): IncidentRow => ({
  id: "З-001", title: "Тест", situation: "", priority: "normal", nodeId: "U1", nodeTitle: "Приём",
  phase: "ok", lastEvent: "2026-01-02T10:00:00.000Z", dueDay: "2026-01-03", roleTitle: "Депутат",
  departmentName: "ЖКХ", slaText: "В срок", assigneeName: "Иванов И.", ...over,
});

test("реестр показывает ответственного сотрудника", () => {
  const html = renderIncidentsBody([row({})], defaultFilters(), "2026-01-02");
  expect(html).toContain("data-assignee");
  expect(html).toContain("Иванов И.");
});

test("без сотрудника реестр пишет «Без ответственного» текстом", () => {
  const html = renderIncidentsBody([row({ assigneeName: "" })], defaultFilters(), "2026-01-02");
  expect(html).toContain("Без ответственного");
});
