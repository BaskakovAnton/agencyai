import { formatStamp } from "../core/timeline.ts";
import { esc, renderPanel } from "./components.ts";

/** Строка истории передач: подразделение, интервал и основание. Автор намеренно скрыт (решение 3A). */
export interface TransferRow {
  readonly department: string;
  readonly from: string;
  readonly to: string | null;
  readonly reason: string;
}

/** История ответственных назначений на дату: только факты модели, без управляющих действий. */
export const transfersBlock = (rows: readonly TransferRow[]): string =>
  renderPanel({
    title: "Передачи подразделению",
    subtitle: "История ответственных назначений: время и основание",
    body:
      rows.length === 0
        ? '<p class="muted" data-transfers-empty>Передач не зафиксировано.</p>'
        : '<ol class="transfer-list" data-transfers>' +
          rows
            .map(
              (row) =>
                '<li class="transfer-row" data-transfer><b data-transfer-department>' + esc(row.department) +
                '</b><div class="case-sub">с ' + formatStamp(row.from) +
                (row.to === null ? " · по настоящее время" : " по " + formatStamp(row.to)) +
                "</div>" +
                (row.reason === "" ? "" : '<div class="case-sub" data-transfer-reason>Основание: ' + esc(row.reason) + "</div>") +
                "</li>",
            )
            .join("") +
          "</ol>",
  });
