import { expect, test } from "bun:test";
import { exportFileName, toCsv, toJson } from "../src/web/registry-export.ts";
import type { IncidentRow } from "../src/web/incidents.ts";

const row = (over: Partial<IncidentRow>): IncidentRow => ({
  id: "З-001", title: "Прорыв трубы", situation: "С1", priority: "urgent", nodeId: "U6",
  nodeTitle: "Назначение подрядчика", phase: "overdue", lastEvent: "2026-01-02T10:00:00.000Z",
  dueDay: "2026-01-03", roleTitle: "Депутат-диспетчер", departmentName: "ЖКХ",
  slaText: "Просрочено", assigneeName: "Иванов И.", ...over,
});

test("CSV: BOM, точка с запятой, CRLF и заголовки полей", () => {
  const csv = toCsv([row({})]);
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain("Номер;Обращение;Ситуация");
  expect(csv).toContain("\r\n");
  const lines = csv.trim().split("\r\n");
  expect(lines.length).toBe(2);
  expect(lines[1]).toContain("З-001;Прорыв трубы");
});

test("CSV: значения с разделителем и кавычками экранируются", () => {
  const csv = toCsv([row({ title: 'Труба "главная"; срочно' })]);
  expect(csv).toContain('"Труба ""главная""; срочно"');
});

test("JSON: срез, период, фильтры и строки сохраняются", () => {
  const payload = { day: "2026-01-02", period: 7, filters: { view: "attention" }, rows: [row({})] };
  const parsed = JSON.parse(toJson(payload)) as typeof payload;
  expect(parsed.day).toBe("2026-01-02");
  expect(parsed.period).toBe(7);
  expect(parsed.filters.view).toBe("attention");
  expect(parsed.rows[0]?.id).toBe("З-001");
});

test("имя файла различает срез дня и события периода", () => {
  expect(exportFileName("csv", "2026-01-02", 1)).toBe("реестр-2026-01-02.csv");
  expect(exportFileName("json", "2026-01-13", 30)).toBe("события-30-дней-2026-01-13.json");
});
