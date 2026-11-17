import type { SlaPhase } from "../core/sla-at.ts";
import type { RoleId } from "../types.ts";

/** Цвет роли — им окрашены полосы Ганта и пузыри чата. */
export const ROLE_COLORS: Readonly<Record<RoleId, string>> = {
  resident: "var(--role-resident)",
  deputy: "var(--role-deputy)",
  assistant: "var(--role-assistant)",
  contractor: "var(--role-contractor)",
  system: "var(--role-system)",
  observer: "var(--role-observer)",
  auditor: "var(--role-auditor)",
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
  ok: "var(--sla-ok)",
  overdue: "var(--sla-overdue)",
  paused: "var(--sla-paused)",
  none: "var(--sla-none)",
};

/** Значки развилки и слияния на графе. */
export const FORK_MARK = "◆";
export const MERGE_MARK = "⇄";