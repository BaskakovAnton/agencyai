import type { Move, RoleId } from "../types.ts";

/** Заявка-герой демонстрации: её переписка показана в спеке дословно. */
export const HERO_INCIDENT_ID = "З-015";
export const HERO_TITLE = "Разбита дверь подъезда";
export const HERO_ADDRESS = "ул. Ленина, 10";

/** Переписка героя начинается 1 января — тогда «перемотка на 2 января» видна на нём. */
export const HERO_START = "2026-01-01T09:00:00.000Z";

/** Маршрут героя из спеки: U1 → U6 → U7 → U19. */
export const HERO_ROUTE: readonly string[] = ["U6", "U7", "U19"];

/** Часы между репликами: 1 января → 2 января → 3 января → 5 января. */
export const HERO_GAPS: readonly number[] = [25, 30, 44];

/** Роли реплик героя по узлам (совпадают с текстами в data/messages.ts). */
export const HERO_ROLES: Readonly<Record<string, RoleId>> = {
  U1: "resident",
  U6: "deputy",
  U7: "contractor",
  U19: "resident",
};

export const heroMoves = (): readonly Move[] => {
  let from = "U1";
  return HERO_ROUTE.map((to, index) => {
    const move: Move = { step: index + 1, from, to, actor: "auto", note: "сценарий демонстрации" };
    from = to;
    return move;
  });
};
