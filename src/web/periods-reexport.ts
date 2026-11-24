/** Реэкспорт периодных типов для веб-слоя (единый источник — core/periods.ts). */
export { PERIOD_LENGTHS, isPeriodLength, periodEndingAt, previousOf } from "../core/periods.ts";
export type { Period, PeriodLength } from "../core/periods.ts";
export type { PeriodAnalytics, KpiDelta, DailyPoint, PeriodKpi, Sentiment } from "../core/analytics/kpi.ts";
