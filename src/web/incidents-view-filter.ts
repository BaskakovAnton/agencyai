/**
 * Представления списка обращений (UX-3.2.1): URL-параметр `view` использует ту же
 * доменную семантику, что и Snapshot, а не «похожее» условие. `department` работает
 * по активному ответственному подразделению (как в `departmentDistribution`).
 */
import { lifecycleStatusOn } from "../core/analytics/snapshot.ts";
import { needsAttention } from "../core/sla-attention.ts";
import { slaPhaseOnDay } from "../core/sla-at.ts";
import type { OrgQuery } from "../core/org/repository.ts";
import type { Graph, Incident } from "../types.ts";
import type { IncidentViewFilter } from "./incidents.ts";

/** Обращение подтверждённо завершено на эту дату (та же проверка, что в Snapshot). */
const isCompletedOn = (org: OrgQuery | undefined, incidentId: string, day: string): boolean => {
  const lifecycle = org?.lifecycleOf(incidentId);
  return lifecycle !== undefined && lifecycleStatusOn(lifecycle, day) === "completed";
};

/** Обращение ожидает подтверждения завершения на эту дату. */
export const isPendingReviewOn = (org: OrgQuery | undefined, incidentId: string, day: string): boolean => {
  const lifecycle = org?.lifecycleOf(incidentId);
  return lifecycle !== undefined && lifecycleStatusOn(lifecycle, day) === "pending_review";
};

/** Совпадает ли обращение с выбранным представлением. */
export const matchesView = (
  view: IncidentViewFilter,
  graph: Graph,
  org: OrgQuery | undefined,
  incident: Incident,
  day: string,
): boolean => {
  if (view === "all") return true;
  if (view === "review") return isPendingReviewOn(org, incident.id, day);
  // Отсутствие активного ответственного: accountableOf возвращает undefined, поэтому нормализуем к null
  // (та же нормализация, что в matchesDepartment ниже) — иначе режим всегда возвращал пустой список.
  if (view === "unassigned") return org !== undefined && (org.accountableOf(incident.id) ?? null) === null;
  if (isCompletedOn(org, incident.id, day)) return false; // активная нагрузка: завершённые исключены
  if (view === "active") return true;
  if (view === "attention") return needsAttention(graph, incident, day);
  if (view === "overdue") return slaPhaseOnDay(incident, day) === "overdue";
  return slaPhaseOnDay(incident, day) === "paused";
};

/** Фильтр подразделения применим: неизвестный справочнику id игнорируется. */
export const departmentFilterActive = (org: OrgQuery | undefined, department: string): boolean =>
  department !== "" &&
  org !== undefined &&
  (department === "none" || org.directory.departments.some((item) => item.id === department));

/** Обращение относится к подразделению (или не имеет активного ответственного при `none`). */
export const matchesDepartment = (org: OrgQuery | undefined, incidentId: string, department: string): boolean => {
  const accountable = org?.accountableOf(incidentId) ?? null;
  return department === "none" ? accountable === null : accountable?.departmentId === department;
};
