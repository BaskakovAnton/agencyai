import { nodeIn } from "./helpers.ts";

/** Особые случаи — U27…U30. Источник: deput/matrix.html. */
const n = nodeIn("osob");

export const OSOB_NODES = [
  n("U27", "Конфликт интересов", "Депутат — сам подрядчик или заинтересован", "na deny allow na allow allow allow"),
  n("U28", "Сезонные работы", "Снег, ямочный, озеленение", "na allow allow allow allow na na"),
  n("U29", "Внешние службы", "112, МЧС, МВД, скорая", "allow allow allow na allow na na"),
  n("U30", "Удаление", "Полный запрет — только архивация (ФЗ-59)", "deny deny deny deny deny deny deny"),
] as const;
