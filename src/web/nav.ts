import { HERO_INCIDENT_ID } from "../data/hero.ts";
import type { Route, RouteName } from "./router.ts";

export interface NavItem {
  readonly id: RouteName;
  readonly label: string;
  readonly href: string;
}

/** Разделы приложения. Адреса заданы строками, чтобы не плодить циклические импорты. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "dashboard", label: "Обзор", href: "#dashboard" },
  { id: "incidents", label: "Обращения", href: "#incidents" },
  { id: "timeline", label: "Хронология", href: "#timeline" },
  { id: "chat", label: "Переписка", href: "#chat/" + encodeURIComponent(HERO_INCIDENT_ID) },
  { id: "model", label: "Модель процесса", href: "#model" },
];

/** Карточка обращения подсвечивает раздел «Обращения». */
export const activeNav = (route: Route): RouteName => (route.name === "incident" ? "incidents" : route.name);

export const renderNav = (route: Route): string => {
  const active = activeNav(route);
  const items = NAV_ITEMS.map(
    (item) =>
      '<a class="nav-item' + (item.id === active ? " on" : "") + '" data-nav="' + item.id + '" href="' + item.href + '"' +
      (item.id === active ? ' aria-current="page"' : "") + ">" + item.label + "</a>",
  ).join("");
  return '<nav class="nav" aria-label="Разделы">' + items + "</nav>";
};
