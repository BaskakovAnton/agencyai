import { renderDemoNotice } from "./components.ts";
import { renderNav } from "./nav.ts";
import type { Route } from "./router.ts";

export interface ShellInput {
  readonly route: Route;
  readonly title: string;
  readonly subtitle?: string;
  readonly content: string;
  readonly demoNote?: string;
}

const THEME_KEY = "agencyai-theme";

export const readTheme = (): "light" | "dark" =>
  typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export const applyTheme = (theme: "light" | "dark"): void => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // приватный режим: тема просто не запомнится
  }
};

export const initTheme = (): void => {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    saved = null;
  }
  applyTheme(saved === "light" ? "light" : "dark");
};

/** Оболочка по утверждённому эталону: ui-sidebar 250 px, ui-topbar 68 px, H1 в топбаре. */
export const renderShell = (input: ShellInput): string => {
  const dark = readTheme() === "dark";
  return (
    '<a class="skip-link" href="#view">К содержанию</a>' +
    '<div class="app" data-app>' +
    '<ui-sidebar class="sidebar" data-sidebar role="complementary" aria-label="Основная навигация">' +
    '<div class="brand"><span class="brand-mark" aria-hidden="true">360</span>' +
    "<span><b>ДЕПУТАТ 360°</b><i>ПРИЁМНАЯ ДЕПУТАТА</i></span></div>" +
    '<p class="nav-label">Разделы</p>' +
    renderNav(input.route) +
    '<div class="sidebar-status"><span><i class="live-dot" aria-hidden="true"></i>Демо-данные модели</span>' +
    "<span>30 заявок · 30 узлов</span></div>" +
    "</ui-sidebar>" +
    '<div class="main">' +
    '<ui-topbar class="topbar" data-topbar role="banner">' +
    '<div class="topbar-main">' +
    '<button class="menu-btn" data-menu aria-label="Открыть меню" aria-expanded="false">☰</button>' +
    "<div><h1 class=\"page-title\">" + input.title + "</h1>" +
    (input.subtitle ? '<p class="page-sub">' + input.subtitle + "</p>" : "") +
    "</div></div>" +
    '<div class="topbar-actions">' +
    renderDemoNotice(input.demoNote ?? "Демо-данные") +
    '<button class="theme-btn" data-theme-toggle aria-pressed="' + String(dark) + '">' +
    (dark ? "Светлая тема" : "Тёмная тема") +
    "</button></div></ui-topbar>" +
    '<div class="content"><div id="view" class="view" data-view>' + input.content + "</div></div>" +
    "</div></div>"
  );
};

/** Обработчики оболочки: переключатель темы и мобильное меню. */
export const bindShell = (root: ParentNode): void => {
  const toggle = root.querySelector("[data-theme-toggle]");
  toggle?.addEventListener("click", () => {
    const next = readTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    toggle.textContent = next === "dark" ? "Светлая тема" : "Тёмная тема";
    toggle.setAttribute("aria-pressed", String(next === "dark"));
  });
  const menu = root.querySelector("[data-menu]");
  const app = root.querySelector("[data-app]");
  menu?.addEventListener("click", () => {
    const open = app?.classList.toggle("menu-open") ?? false;
    menu.setAttribute("aria-expanded", String(open));
  });
};
