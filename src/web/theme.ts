import type { RoleId } from "../types.ts";

/** Цвет роли — им окрашены коммиты графа, полосы Ганта и пузыри чата. */
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
