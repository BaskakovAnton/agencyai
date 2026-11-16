import type { Priority } from "../types.ts";

/** Категория инцидента городской инфраструктуры. */
export interface IncidentCategory {
  readonly key: string;
  readonly title: string;
  readonly priority: Priority;
  readonly templates: readonly string[];
}

/** Справочник инцидентов: от аварий до благоустройства. */
export const CATEGORIES: readonly IncidentCategory[] = [
  { key: "emergency", title: "Авария / угроза жизни", priority: "urgent", templates: ["Прорыв трубопровода у дома", "Угроза обрушения конструкции", "Запах газа в подъезде"] },
  { key: "water", title: "Вода и канализация", priority: "urgent", templates: ["Нет холодной воды", "Течь в подвале", "Засор канализации"] },
  { key: "heat", title: "Отопление и ГВС", priority: "urgent", templates: ["Нет отопления", "Холодные батареи", "Нет горячей воды"] },
  { key: "elevator", title: "Лифт и подъезд", priority: "urgent", templates: ["Застрял лифт", "Разбита дверь подъезда", "Не работает домофон"] },
  { key: "electricity", title: "Электричество", priority: "normal", templates: ["Искрит щиток", "Нет света в подъезде"] },
  { key: "lighting", title: "Уличное освещение", priority: "normal", templates: ["Не горит фонарь на аллее", "Тёмный двор", "Мигает лампа у школы"] },
  { key: "road", title: "Дороги и ямы", priority: "normal", templates: ["Яма на проезжей части", "Провал у тротуара", "Разбитый асфальт у остановки"] },
  { key: "garbage", title: "Мусор", priority: "normal", templates: ["Навал мусора у контейнеров", "Не вывозят крупногабарит", "Переполнена площадка ТКО"] },
  { key: "tree", title: "Зелёные насаждения", priority: "normal", templates: ["Аварийное дерево над парковкой", "Обломанные ветки после ветра"] },
  { key: "yard", title: "Двор и благоустройство", priority: "routine", templates: ["Сломанная детская площадка", "Разбитый бордюр", "Просела плитка"] },
  { key: "traffic", title: "Знаки и парковка", priority: "routine", templates: ["Снесён дорожный знак", "Парковка на газоне"] },
  { key: "vandal", title: "Вандализм", priority: "routine", templates: ["Разрисованы стены", "Сломаны перила", "Исписан лифт"] },
];

/** Улицы для синтетических адресов. */
export const STREETS: readonly string[] = [
  "ул. Ленина", "пр. Мира", "ул. Садовая", "ул. Школьная", "ул. Заречная",
  "ул. Строителей", "пр. Победы", "ул. Северная", "ул. Луговая", "ул. Клубная",
];
