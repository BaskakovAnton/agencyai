/** Типы сводки обзора (B4): вынесены из overview.ts ради лимита строк. */
import type { SlaPhase } from "../core/sla-at.ts";
import type { PeriodAnalytics } from "../core/analytics/kpi.ts";
import type { OrgFacts } from "./org-integration.ts";
import type { Priority } from "../types.ts";

export type Tone = "red" | "amber" | "green" | "gray" | "blue";

export interface KpiSet {
  readonly active: number;
  readonly attention: number;
  readonly paused: number;
  readonly completed: number;
  readonly total: number;
}

export interface AttentionItem {
  readonly id: string;
  readonly title: string;
  readonly address: string;
  readonly priority: Priority;
  readonly priorityTone: Tone;
  readonly priorityTitle: string;
  readonly nodeId: string;
  readonly nodeTitle: string;
  readonly phase: SlaPhase;
  readonly slaTone: Tone;
  readonly slaText: string;
  /** Ответственное подразделение; пусто, если орг-модель не подключена. */
  readonly departmentName: string;
}

export interface ActivityRow {
  readonly id: string;
  readonly icon: string;
  readonly text: string;
  readonly time: string;
}

export interface DistributionRow {
  readonly id: Priority;
  readonly title: string;
  readonly count: number;
  readonly tone: Tone;
}

export interface SlaRow {
  readonly id: SlaPhase;
  readonly title: string;
  readonly count: number;
  readonly share: number;
}

export interface Overview {
  readonly day: string;
  readonly kpi: KpiSet;
  readonly attention: readonly AttentionItem[];
  readonly events: readonly ActivityRow[];
  readonly distribution: readonly DistributionRow[];
  readonly sla: readonly SlaRow[];
  /** Сколько обращений среза на риске нарушения SLA (просрочка или остаток ≤ 24 ч). */
  readonly atRisk: number;
  /** Орг-факты (UX-4): подразделения и ожидание подтверждения; null — модель не подключена. */
  readonly org: OrgFacts | null;
  /** Периодная аналитика (UX-3): Snapshot, Flow, дельта остатка и динамика. */
  readonly analytics: PeriodAnalytics;
}
