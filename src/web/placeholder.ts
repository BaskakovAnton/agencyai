import { HERO_INCIDENT_ID } from "../data/hero.ts";
import type { Route } from "./router.ts";

/** Честная заглушка для экранов, которые появятся на следующих этапах: ничего не имитирует. */
export const renderPlaceholder = (route: Route): string => {
  const stage = route.name === "incident" ? "Этапе 3" : "Этапе 2";
  const title =
    route.name === "incidents" ? "Обращения" : route.name === "incident" ? "Карточка обращения" : "Обзор";
  return (
    '<section class="placeholder" data-placeholder>' +
    "<h2>" + title + " — в работе</h2>" +
    "<p>Экран появится на " + stage + ". Данные для него уже есть в модели, поэтому заглушка ничего не изображает.</p>" +
    '<p><a href="#timeline">Хронология</a> · <a href="#chat/' + encodeURIComponent(HERO_INCIDENT_ID) +
    '">Переписка</a> · <a href="#model">Модель процесса</a></p>' +
    "</section>"
  );
};
