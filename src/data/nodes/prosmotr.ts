import { nodeIn } from "./helpers.ts";

/** Просмотр и контроль — U23…U26. Источник: deput/matrix.html. */
const n = nodeIn("prosmotr");

export const PROSMOTR_NODES = [
  n("U23", "Просмотр статуса", "Что с обращением", "subset allow allow subset allow allow allow"),
  n("U24", "Просмотр ПД", "Паспорт, ИНН, СНИЛС, сканы (ФЗ-152)", "subset conditional conditional deny allow deny conditional"),
  n("U25", "Просмотр аудита", "Кто и когда трогал — append-only", "deny deny deny deny allow allow allow"),
  n("U26", "Отчёт", "Ежемесячный свод", "na allow allow subset allow allow allow"),
] as const;
