import { nodeIn } from "./helpers.ts";

/** 8.2 Управление — U14…U18. Источник: deput/matrix.html. */
const n = nodeIn("upravlenie");

export const UPRAVLENIE_NODES = [
  n("U14", "Приостановка SLA", "Уточнение / согласование / погода / доступ / финансы", "na conditional conditional deny conditional na na"),
  n("U15", "Возобновление SLA", "Причина устранена", "na allow allow na allow na na"),
  n("U16", "Эскалация", "При просрочке, отказе, неответе", "subset allow conditional na allow na na"),
  n("U17", "Переадресация", "Не в зоне ответственности", "na allow allow na allow na na"),
  n("U18", "Массовая проблема (issue)", "50 заявок в одну", "na allow allow na allow na na"),
] as const;
