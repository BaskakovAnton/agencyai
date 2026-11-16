import type { SlaPhase } from "../core/sla-at.ts";
import type { RoleId } from "../types.ts";

/** Цвет роли — им окрашены полосы Ганта и пузыри чата. */
export const ROLE_COLORS: Readonly<Record<RoleId, string>> = {
  resident: "#6fd28a",
  deputy: "#4da3ff",
  assistant: "#a78bfa",
  contractor: "#ffc14d",
  system: "#7c8794",
  observer: "#f472b6",
  auditor: "#2dd4bf",
};

/** Инициалы роли для аватара в чате. */
export const ROLE_SHORT: Readonly<Record<RoleId, string>> = {
  resident: "Ж",
  deputy: "Д",
  assistant: "П",
  contractor: "К",
  system: "С",
  observer: "Н",
  auditor: "А",
};

/** Цвет статуса SLA — им окрашены ветки Git-графа: 🟢 в срок, 🔴 вне SLA, 🟡 на паузе. */
export const SLA_COLORS: Readonly<Record<SlaPhase, string>> = {
  ok: "#6fd28a",
  overdue: "#ff5c5c",
  paused: "#ffc14d",
  none: "#7c8794",
};

/** Значки развилки и слияния на графе. */
export const FORK_MARK = "◆";
export const MERGE_MARK = "⇄";
