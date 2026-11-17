import { renderNav } from "./nav.ts";
import { renderPageHeader } from "./page-header.ts";
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
  applyTheme(saved === "dark" ? "dark" : "light");
};

/** Оболочка приложения: сайдбар, топбар, заголовок страницы и слот контента. */
export const renderShell = (input: ShellInput): string => {
  const dark = readTheme() === "dark";
  return (
    '<a class="skip-link" href="#view">К содержанию</a>' +
    '<div class="app" data-app>' +
    '<aside class="sidebar" data-sidebar>' +
    '<div class="brand"><span class="brand-mark">A</span><span><b>agencyai</b><i>Бюро · демо</i></span></div>' +
    renderNav(input.route) +
    '<p class="sidebar-note">' + (input.demoNote ?? "Демонстрационные данные модели процессов") + "</p>" +
    "</aside>" +
    '<div class="main">' +
    '<header class="topbar" data-topbar>' +
    '<button class="menu-btn" data-menu aria-label="Открыть меню" aria-expanded="false">☰</button>' +
    '<span class="topbar-title">agencyai · демо</span>' +
    '<span class="demo-chip">Демо-данные</span>' +
    '<button class="theme-btn" data-theme-toggle aria-pressed="' + String(dark) + '">' +
    (dark ? "Светлая тема" : "Тёмная тема") + "</button>" +
    "</header>" +
    '<div class="content">' +
    renderPageHeader(input.title, input.subtitle ?? "") +
    '<div id="view" class="view" data-view>' + input.content + "</div>" +
    "</div>" +
    "</div>" +
    "</div>"
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
