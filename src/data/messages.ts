import type { RoleId } from "../types.ts";

/** Реплика, которой узел отвечает в переписке: кто пишет и что. */
export interface NodeMessage {
  readonly role: RoleId;
  readonly text: string;
}

/** Тексты узлов: U1, U6, U7 и U19 — дословно из спеки демонстрации. */
export const NODE_MESSAGES: Readonly<Record<string, NodeMessage>> = {
  U1: { role: "resident", text: "Добрый день, разбита дверь в подъезде" },
  U2: { role: "deputy", text: "Уточните, пожалуйста, адрес и когда это случилось" },
  U3: { role: "resident", text: "Адрес верный, дверь сломана со вчерашнего вечера" },
  U4: { role: "system", text: "Заявка зарегистрирована в реестре обращений" },
  U5: { role: "deputy", text: "Обращение относится к другой организации — перенаправляю" },
  U6: { role: "deputy", text: "Назначаю подрядчика" },
  U7: { role: "contractor", text: "Принято, выезжаю" },
  U8: { role: "contractor", text: "Бригада на объекте, начинаем работы" },
  U9: { role: "deputy", text: "Подрядчик отказался — ищу замену" },
  U10: { role: "contractor", text: "Готов взять заявку, подтверждаю выезд" },
  U11: { role: "deputy", text: "Работы выполнены, проверяю результат" },
  U12: { role: "assistant", text: "Нужно согласование с администрацией района" },
  U13: { role: "resident", text: "Подтверждаю, проблема пока не решена" },
  U14: { role: "deputy", text: "Приостанавливаю SLA: нет доступа к объекту" },
  U15: { role: "deputy", text: "Доступ получен, SLA возобновлён" },
  U16: { role: "assistant", text: "Передаю на эскалацию руководителю" },
  U17: { role: "deputy", text: "Переадресую обращение в профильное ведомство" },
  U18: { role: "system", text: "Похожие обращения объединены в одно" },
  U19: { role: "resident", text: "Работы выполнены, подтвердите" },
  U20: { role: "resident", text: "Спасибо, всё в порядке" },
  U21: { role: "observer", text: "Запросил материалы по обращению" },
  U22: { role: "auditor", text: "Проверка сроков: нарушений не выявлено" },
  U23: { role: "assistant", text: "Подготовил ответ жителю" },
  U24: { role: "system", text: "Доступ к персональным данным ограничен" },
  U25: { role: "auditor", text: "Запись добавлена в журнал аудита" },
  U26: { role: "deputy", text: "Отчёт по обращению сформирован" },
  U27: { role: "observer", text: "Проверка конфликта интересов: подрядчик и депутат" },
  U28: { role: "system", text: "Напоминание направлено исполнителю" },
  U29: { role: "deputy", text: "Заявка закрыта, результат подтверждён жителем" },
  U30: { role: "system", text: "Заявка передана в архив на 5 лет" },
};

export const messageFor = (nodeId: string): NodeMessage =>
  NODE_MESSAGES[nodeId] ?? { role: "system", text: "Событие процесса" };
