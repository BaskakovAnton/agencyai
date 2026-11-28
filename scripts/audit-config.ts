/** Настройки аудита интерфейса (B4): вынесены из audit-ui.ts ради лимита строк. */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const base = "http://127.0.0.1:4321/";
export const outDir = "docs/screenshots/audit";
export const axePath = require.resolve("axe-core/axe.min.js");
export const viewports = [
  { name: "wide", width: 1920, height: 1080 },
  { name: "desktop", width: 1440, height: 950 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "portrait", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

/** Минимальная зона нажатия: телефон и планшет-портрет 44 px, широкие экраны 36 px. */
export const MIN_TARGET: Readonly<Record<string, number>> = { wide: 36, desktop: 36, tablet: 36, portrait: 44, mobile: 44 };

export interface Finding { page: string; viewport: string; kind: string; detail: string; count?: number; severity?: "violation" | "metric"; note?: string }

/** Пояснения к справочным метрикам (B5): они не являются нарушениями. */
export const METRIC_NOTES: Readonly<Record<string, string>> = {
  "canvas-scroll": "канвас прокручивается намеренно: область подписана и доступна с клавиатуры",
  "chips-scroll": "лента заявок прокручивается намеренно: подписана, доступна с клавиатуры",
  "slider-a11y": "снимок подписи и озвучки ползунка времени",
  "commit-a11y": "снимок роли, подписи и фокуса коммита графа",
  "card-position": "снимок положения карточки узла в окне",
  headings: "снимок иерархии заголовков экрана для сверки",
  "enter-on-commit": "проверка открытия карточки узла клавишей Enter",
};
