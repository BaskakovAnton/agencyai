import { nodeIn } from "./helpers.ts";

/** 8.1 Приём — U1…U5. Источник: deput/matrix.html. */
const n = nodeIn("priem");

export const PRIEM_NODES = [
  n("U1", "Подача обращения", "Житель пишет или звонит, депутат/помощник регистрирует", "allow allow allow na allow na na"),
  n("U2", "Уточнение у жителя", "Не хватает данных: адреса, фото, конкретики", "subset allow allow na allow na na"),
  n("U3", "Проверка на дубликат", "Тот же житель + адрес + категория за 30 дней", "na allow allow na allow na na"),
  n("U4", "Классификация", "Категория, подкатегория, срочность, атрибуты", "na allow allow na conditional na na"),
  n("U5", "Объединение / массовая проблема", "Одна проблема — много заявок", "na allow allow na allow na na"),
] as const;
