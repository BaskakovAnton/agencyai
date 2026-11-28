import { expect, test } from "bun:test";
import { contactKind, STREAM_NOTES, STREAM_TITLES, validateAppeal, type AppealDraft } from "../src/core/appeal.ts";

const draft = (over: Partial<AppealDraft> = {}): AppealDraft => ({
  name: "Иванов Иван",
  contact: "+7 900 123-45-67",
  text: "Прошу отремонтировать освещение во дворе дома 12.",
  consent: true,
  ...over,
});

test("два потока названы различимо и без юридической путаницы", () => {
  expect(STREAM_TITLES.official).toContain("Официальное обращение");
  expect(STREAM_TITLES.operational).toContain("Оперативное сообщение");
  // Оперативный поток обязан прямо говорить, что обращением не является.
  expect(STREAM_NOTES.operational).toContain("не является официальным обращением");
  expect(STREAM_NOTES.operational).toContain("59-ФЗ");
  // Официальный — про идентификацию и срок.
  expect(STREAM_NOTES.official).toContain("ЕСИА");
  expect(STREAM_NOTES.official).toContain("30 дней");
});

test("валидация: корректный черновик проходит в обоих потоках", () => {
  expect(validateAppeal("official", draft({ identified: true }))).toEqual([]);
  expect(validateAppeal("operational", draft())).toEqual([]);
});

test("валидация: имя, текст и согласие обязательны", () => {
  expect(validateAppeal("operational", draft({ name: " " })).map((i) => i.field)).toContain("name");
  expect(validateAppeal("operational", draft({ text: "коротко" })).map((i) => i.field)).toContain("text");
  expect(validateAppeal("operational", draft({ consent: false })).map((i) => i.field)).toContain("consent");
});

test("валидация: контакт принимает телефон или почту, иначе ошибка", () => {
  expect(contactKind("+7 900 123-45-67")).toBe("phone");
  expect(contactKind("ivanov@example.ru")).toBe("email");
  expect(contactKind("просто текст")).toBe("unknown");
  expect(validateAppeal("operational", draft({ contact: "просто текст" })).map((i) => i.field)).toContain("contact");
});

test("валидация: слишком длинный текст отклоняется с понятным пределом", () => {
  const issues = validateAppeal("operational", draft({ text: "я".repeat(4001) }));
  expect(issues.map((i) => i.field)).toContain("text");
  expect(issues.find((i) => i.field === "text")?.message).toContain("4000");
});

test("валидация: официальный поток требует подтверждения идентификации", () => {
  const issues = validateAppeal("official", draft({ identified: false }));
  expect(issues.map((i) => i.field)).toContain("identified");
  expect(validateAppeal("official", draft({ identified: true }))).toEqual([]);
});
