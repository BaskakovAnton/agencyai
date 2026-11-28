import type { IncidentRow } from "./incidents.ts";

/** Выгрузка реестра (A1): чистые функции форматов плюс браузерное скачивание. */
export interface ExportPayload {
  readonly day: string;
  readonly period: number;
  readonly filters: Readonly<Record<string, string>>;
  readonly rows: readonly IncidentRow[];
}

const HEADERS: readonly (readonly [string, keyof IncidentRow])[] = [
  ["Номер", "id"],
  ["Обращение", "title"],
  ["Ситуация", "situation"],
  ["Приоритет", "priority"],
  ["Этап", "nodeId"],
  ["Название этапа", "nodeTitle"],
  ["Подразделение", "departmentName"],
  ["Ответственный", "assigneeName"],
  ["SLA", "slaText"],
  ["Последнее событие", "lastEvent"],
  ["Срок", "dueDay"],
];

/** Значение с разделителем, кавычкой или переводом строки оборачивается в кавычки. */
const cell = (value: string): string => (/[;"\n\r]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value);

/** CSV для Excel: BOM, точка с запятой, CRLF. */
export const toCsv = (rows: readonly IncidentRow[]): string => {
  const head = HEADERS.map(([title]) => cell(title)).join(";");
  const body = rows.map((row) => HEADERS.map(([, key]) => cell(String(row[key] ?? ""))).join(";"));
  return "\uFEFF" + [head, ...body].join("\r\n") + "\r\n";
};

export const toJson = (payload: ExportPayload): string => JSON.stringify(payload, null, 2);

export const exportFileName = (extension: string, day: string, period: number): string =>
  (period > 1 ? "события-" + period + "-дней-" : "реестр-") + day + "." + extension;

/** Скачивание в браузере: объектная ссылка живёт до конца клика. */
export const download = (content: string, fileName: string, type: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
