import { nodeIn } from "./helpers.ts";

/** 8.4 Закрытие — U19…U22. Источник: deput/matrix.html. */
const n = nodeIn("zakrytie");

export const ZAKRYTIE_NODES = [
  n("U19", "Ответ жителю", "Текст или шаблон", "na allow conditional na allow na na"),
  n("U20", "Закрытие", "После согласия или 7 дней молчания", "subset allow deny deny allow na na"),
  n("U21", "Отзыв жителем", "Передумал", "allow allow allow na allow na na"),
  n("U22", "Переоткрытие", "Жалоба после закрытия", "subset allow conditional na allow na na"),
] as const;
