/**
 * Информационное пояснение об ограничении F5 (UX-3.2.4, блок E): фильтр подразделения
 * использует текущую атрибуцию (accountableOf), а не историческую на выбранную дату.
 * Пояснение ничего не меняет в фильтрации — только объясняет.
 */
export const HISTORICAL_DEPARTMENT_NOTICE =
  "Фильтрация по подразделению использует текущую атрибуцию обращения, а не историческую на выбранную дату.";

/** Показывается только при исторической дате и активном фильтре подразделения (включая «без ответственного»). */
export const attributionNoticeNeeded = (historical: boolean, department: string): boolean =>
  historical && department !== "";

/** Разметка пояснения; пустая строка, когда пояснение не требуется. */
export const renderAttributionNotice = (historical: boolean, department: string): string =>
  attributionNoticeNeeded(historical, department)
    ? '<p class="hint notice" data-f5-notice role="note">' + HISTORICAL_DEPARTMENT_NOTICE + "</p>"
    : "";
