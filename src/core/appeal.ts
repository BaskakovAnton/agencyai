/**
 * Два потока обращений к депутату: официальный (59-ФЗ, с идентификацией) и оперативный.
 * Здесь только чистые правила и формулировки — без отправки и без хранения.
 */
export type AppealStream = "official" | "operational";

export interface AppealDraft {
  readonly name: string;
  readonly contact: string;
  readonly text: string;
  readonly consent: boolean;
  /** Подтверждение идентификации: обязательно для официального потока (в демо — флажок). */
  readonly identified?: boolean;
}

export interface ValidationIssue {
  readonly field: "name" | "contact" | "text" | "consent" | "identified";
  readonly message: string;
}

export const STREAM_TITLES: Readonly<Record<AppealStream, string>> = {
  official: "Официальное обращение",
  operational: "Оперативное сообщение",
};

export const STREAM_NOTES: Readonly<Record<AppealStream, string>> = {
  official:
    "Официальное обращение по Федеральному закону № 59-ФЗ рассматривается в течение 30 дней. " +
    "Требуется идентификация отправителя: в рабочей версии — через ЕСИА или официальную электронную приёмную.",
  operational:
    "Оперативное сообщение — неформальная связь с депутатом. Оно не является официальным обращением по 59-ФЗ: " +
    "юридические сроки рассмотрения на него не распространяются, ответ приходит в удобном канале.",
};

export const TEXT_MIN = 10;
export const TEXT_MAX = 4000;

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-zA-Zа-яА-Я]{2,}$/;
const PHONE_SHAPE = /^[+()\-\s\d]{10,20}$/;

/** Тип контакта для ответа: телефон, почта или непонятная строка. */
export const contactKind = (value: string): "phone" | "email" | "unknown" => {
  const trimmed = value.trim();
  if (EMAIL.test(trimmed)) return "email";
  const digits = trimmed.replace(/\D/g, "");
  if (PHONE_SHAPE.test(trimmed) && digits.length >= 10 && digits.length <= 15) return "phone";
  return "unknown";
};

export const validateAppeal = (stream: AppealStream, draft: AppealDraft): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (draft.name.trim().length < 2) issues.push({ field: "name", message: "Укажите имя — не короче двух символов." });
  if (contactKind(draft.contact) === "unknown") {
    issues.push({ field: "contact", message: "Нужен телефон или адрес электронной почты для ответа." });
  }
  const text = draft.text.trim();
  if (text.length < TEXT_MIN) issues.push({ field: "text", message: "Опишите вопрос — не короче " + TEXT_MIN + " символов." });
  else if (text.length > TEXT_MAX) issues.push({ field: "text", message: "Текст длиннее " + TEXT_MAX + " символов — сократите." });
  if (!draft.consent) issues.push({ field: "consent", message: "Нужно согласие на обработку персональных данных." });
  if (stream === "official" && draft.identified !== true) {
    issues.push({ field: "identified", message: "Для официального обращения нужна идентификация отправителя." });
  }
  return issues;
};

/** Что происходит после отправки — своими словами для каждого потока. */
export const nextStepText = (stream: AppealStream): string =>
  stream === "official"
    ? "После идентификации обращение регистрируется, ему присваивается номер, срок рассмотрения — 30 дней."
    : "Сообщение попадает в общий inbox помощника. Ответ придёт в указанный вами канал.";

/** Напоминание о том, что прототип ничего не отправляет. */
export const DEMO_NOTE = "Демонстрация: данные не отправляются и не сохраняются. В рабочей версии здесь будет приём и регистрация.";
