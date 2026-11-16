import type { AccessLevel, Graph, RoleId } from "../types.ts";
import { ROLE_IDS, ROLE_NAMES } from "../data/roles.ts";

/** Права роли на конкретном узле. */
export interface RoleAccess {
  readonly role: RoleId;
  readonly level: AccessLevel;
  readonly allowed: boolean;
  readonly caveat: string;
}

const CAVEATS: Readonly<Record<AccessLevel, string>> = {
  allow: "без оговорок",
  subset: "только в своём",
  conditional: "при условии",
  deny: "запрещено",
  na: "не участвует",
};

/** allow / subset / conditional — действие разрешено, deny и na — нет. */
export const roleAccess = (graph: Graph, nodeId: string, role: RoleId): RoleAccess => {
  const node = graph.byId[nodeId];
  const level: AccessLevel = node ? node.access[role] : "na";
  return {
    role,
    level,
    allowed: level === "allow" || level === "subset" || level === "conditional",
    caveat: CAVEATS[level],
  };
};

/** Роли, которым узел доступен (в порядке ROLE_IDS). */
export const allowedRoles = (graph: Graph, nodeId: string): readonly RoleId[] =>
  ROLE_IDS.filter((role) => roleAccess(graph, nodeId, role).allowed);

/** Человеческое объяснение отказа. */
export const denyReason = (graph: Graph, nodeId: string, role: RoleId): string => {
  const access = roleAccess(graph, nodeId, role);
  return (
    "роль " + ROLE_NAMES[role] + " не может действовать на узле " + nodeId +
    " (" + access.level + ": " + access.caveat + ")"
  );
};
