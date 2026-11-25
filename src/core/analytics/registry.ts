/** Реестр показателей Dashboard: подписи, сравнение и смысл изменения. Только представление данных. */
import { SLA_PROFILES } from "../../data/sla.ts";
import type { FlowInput } from "./flow.ts";
import type { KpiDelta, PeriodAnalytics, PeriodKpi, Sentiment } from "./kpi-types.ts";

const SNAPSHOT_COMPARISON = "конец периода против конца предыдущего";
const FLOW_COMPARISON = "события периода против предыдущего периода";

export const kpisOf = (
  analytics: Omit<PeriodAnalytics, "kpis" | "notes">,
  deltaOf: (current: number, previous: number, sentiment: Sentiment) => KpiDelta,
): readonly PeriodKpi[] => {
  const { snapshot, snapshotPrevious, flow, flowPrevious, backlogDelta, inTimeShare, inTimeSharePrevious } = analytics;
  return [
    { id: "active", title: "Активные обращения", kind: "snapshot", value: snapshot.active, unit: "count", delta: deltaOf(snapshot.active, snapshotPrevious.active, "neutral"), note: "включая ожидающие проверки", comparison: SNAPSHOT_COMPARISON },
    { id: "attention", title: "Требуют внимания", kind: "snapshot", value: snapshot.attention, unit: "count", delta: deltaOf(snapshot.attention, snapshotPrevious.attention, "bad"), note: "просрочка или срочная незавершённая", comparison: SNAPSHOT_COMPARISON },
    { id: "overdue", title: "Просроченные", kind: "snapshot", value: snapshot.overdue, unit: "count", delta: deltaOf(snapshot.overdue, snapshotPrevious.overdue, "bad"), note: "только активные", comparison: SNAPSHOT_COMPARISON },
    { id: "paused", title: "На паузе", kind: "snapshot", value: snapshot.paused, unit: "count", delta: deltaOf(snapshot.paused, snapshotPrevious.paused, "neutral"), note: "только активные", comparison: SNAPSHOT_COMPARISON },
    { id: "pending", title: "Ждут подтверждения", kind: "snapshot", value: snapshot.pendingReview, unit: "count", delta: deltaOf(snapshot.pendingReview, snapshotPrevious.pendingReview, "bad"), note: "по журналу проверок", comparison: SNAPSHOT_COMPARISON },
    { id: "created", title: "Поступило", kind: "flow", value: flow.created, unit: "count", delta: deltaOf(flow.created, flowPrevious.created, "neutral"), note: "объём обращений", comparison: FLOW_COMPARISON },
    { id: "finished", title: "Завершено", kind: "flow", value: flow.finished, unit: "count", delta: deltaOf(flow.finished, flowPrevious.finished, "good"), note: "подтверждено контролёром", comparison: FLOW_COMPARISON },
    { id: "approved", title: "Подтверждено контролёром", kind: "flow", value: flow.approved, unit: "count", delta: deltaOf(flow.approved, flowPrevious.approved, "good"), note: "", comparison: FLOW_COMPARISON },
    { id: "reopened", title: "Переоткрыто", kind: "flow", value: flow.reopened, unit: "count", delta: deltaOf(flow.reopened, flowPrevious.reopened, "bad"), note: "", comparison: FLOW_COMPARISON },
    { id: "rejected", title: "Отказано в подтверждении", kind: "flow", value: flow.rejected, unit: "count", delta: deltaOf(flow.rejected, flowPrevious.rejected, "bad"), note: "", comparison: FLOW_COMPARISON },
    { id: "backlog", title: "Изменение остатка", kind: "delta", value: backlogDelta, unit: "count", delta: null, note: "активные: конец против конца предыдущего периода", comparison: "дельта, а не поток" },
    { id: "inTime", title: "Завершено в срок", kind: "share", value: inTimeShare, unit: "percent", delta: inTimeShare !== null && inTimeSharePrevious !== null ? deltaOf(inTimeShare, inTimeSharePrevious, "good") : null, note: "среди подтверждённых за период", comparison: FLOW_COMPARISON },
  ];
};

export const notesOf = (
  input: FlowInput,
  analytics: Omit<PeriodAnalytics, "kpis" | "notes">,
): readonly string[] => {
  const notes: string[] = [
    "Snapshot — состояние на конец периода, Flow — события внутри периода; дельта остатка не равна потоку.",
    "Завершённым считается только обращение с подтверждением контролёра: достижение терминального узла завершением не является.",
    "Ожидающие подтверждения остаются активной нагрузкой до решения контролёра.",
    "Просрочка, пауза и внимание считаются только по активным обращениям.",
    "Рейтинг подразделений по SLA не строится: передача ответственности и причины паузы не позволяют отнести просрочку однозначно.",
    "Записи подтверждения, датированные позже выбранного дня, в период не попадают.",
  ];
  if (analytics.flow.reachedTerminal !== analytics.flow.finished) {
    notes.push(
      "За период терминального узла достигли " + analytics.flow.reachedTerminal + " обращений, подтверждено " + analytics.flow.finished +
        " — это разные события.",
    );
  }
  if (analytics.inTimeShare === null) notes.push("В периоде нет подтверждённых обращений — доля в срок не рассчитывается.");
  if (!analytics.snapshot.hasData) notes.push("На конец периода нет данных: проверьте выбранную дату среза.");
  if (SLA_PROFILES.routine.resolveHours === 0) notes.push("Для приоритета без норматива SLA показатель не рассчитывается.");
  if ((input.assignments ?? []).length === 0) notes.push("Назначения подразделений в срезе отсутствуют.");
  return notes;
};
