import type { NodeGroup, ProcessNode } from "../../types.ts";
import { toAccess } from "../roles.ts";

/** Компактный конструктор узла: уровень доступа задаётся строкой в порядке ROLE_IDS. */
export const nodeIn =
  (group: NodeGroup) =>
  (id: string, title: string, desc: string, access: string): ProcessNode => ({
    id,
    group,
    title,
    desc,
    access: toAccess(access),
  });
