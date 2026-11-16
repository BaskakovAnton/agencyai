import { nodeIn } from "./helpers.ts";

/** 8.2 Исполнение — U6…U13. Источник: deput/matrix.html. */
const n = nodeIn("ispolnenie");

export const ISPOLNENIE_NODES = [
  n("U6", "Назначение подрядчика", "По территории + категории", "na allow allow na conditional na na"),
  n("U7", "Передача подрядчику", "Email / API / звонок / мессенджер", "na allow allow na allow na na"),
  n("U8", "Подтверждение принятия", "Подрядчик принял заявку", "na na na allow allow na na"),
  n("U9", "Отказ подрядчика", "«Не наша зона», «нет денег»", "na allow allow allow allow na na"),
  n("U10", "Отметка «в работе»", "Подрядчик приступил", "na na na allow allow na na"),
  n("U11", "Отметка «выполнено»", "Подрядчик завершил", "na na na allow allow na na"),
  n("U12", "Проверка результата", "Депутат или помощник выезжает / фото", "subset allow allow deny allow na na"),
  n("U13", "Возврат на переделку", "Результат не соответствует", "na allow allow deny allow na na"),
] as const;
