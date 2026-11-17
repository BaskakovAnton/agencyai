/** Заголовок страницы: общий для всех экранов. */
export const renderPageHeader = (title: string, subtitle = ""): string =>
  '<header class="page-header">' +
  '<h1 class="page-title">' + title + "</h1>" +
  (subtitle === "" ? "" : '<p class="page-sub">' + subtitle + "</p>") +
  "</header>";
