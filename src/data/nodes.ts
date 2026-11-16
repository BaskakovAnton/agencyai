import type { ProcessNode } from "../types.ts";
import { PRIEM_NODES } from "./nodes/priem.ts";
import { ISPOLNENIE_NODES } from "./nodes/ispolnenie.ts";
import { UPRAVLENIE_NODES } from "./nodes/upravlenie.ts";
import { ZAKRYTIE_NODES } from "./nodes/zakrytie.ts";
import { PROSMOTR_NODES } from "./nodes/prosmotr.ts";
import { OSOB_NODES } from "./nodes/osob.ts";

/** Канонический порядок узлов процесса (30 узлов, 6 групп). */
export const NODES: readonly ProcessNode[] = [
  ...PRIEM_NODES,
  ...ISPOLNENIE_NODES,
  ...UPRAVLENIE_NODES,
  ...ZAKRYTIE_NODES,
  ...PROSMOTR_NODES,
  ...OSOB_NODES,
];
