import type { Attribution } from "../core/analytics/attribution.ts";
import { renderPanel } from "./components.ts";

const TITLES: Readonly<Record<Attribution["state"], string>> = {
  assigned: "Подразделение определено",
  conflict: "Конфликт данных",
  incomplete: "Неполные данные",
  no_data: "Нет данных",
};

/** Историческая атрибуция подразделения на дату (UX-3.3, блок F): состояния не подменяют друг друга. */
export const attributionBlock = (attribution: Attribution, departmentName: string): string =>
  renderPanel({
    title: "Историческая атрибуция на дату",
    subtitle: "Кто отвечал за обращение в выбранный день",
    body:
      '<div class="fact" data-attribution="' + attribution.state + '"><div class="fact-label">Атрибуция</div><b>' +
      TITLES[attribution.state] +
      "</b>" +
      (attribution.state === "assigned"
        ? '<div class="muted" data-attribution-department>' + (departmentName === "" ? attribution.departmentId ?? "" : departmentName) + "</div>"
        : '<div class="muted">' +
          (attribution.state === "conflict"
            ? "На конец дня действует несколько ответственных интервалов — выбор запрещён."
            : attribution.state === "incomplete"
              ? "У последнего назначения некорректное подразделение."
              : "В выбранный день ответственных назначений не было.") +
          "</div>") +
      (attribution.viaTransferDay ? '<div class="muted" data-attribution-transfer>Передача в этот день</div>' : "") +
      "</div>",
  });
