import { expect, test } from "bun:test";
import { DEMO_NOTE, type AppealDraft } from "../src/core/appeal.ts";
import { renderAppealChooser, renderAppealConfirm, renderAppealForm } from "../src/web/appeal-html.ts";

const draft: AppealDraft = {
  name: "Иванов Иван",
  contact: "ivanov@example.ru",
  text: "Прошу отремонтировать освещение во дворе дома 12.",
  consent: true,
};

test("выбор потока: две карточки, честная формулировка и пометка демонстрации", () => {
  const html = renderAppealChooser();
  expect(html).toContain("data-appeal-chooser");
  expect(html).toContain('data-appeal-stream="official"');
  expect(html).toContain('data-appeal-stream="operational"');
  expect(html).toContain("не является официальным обращением");
  expect(html).toContain("ЕСИА");
  expect(html).toContain(DEMO_NOTE);
});

test("оперативная форма: поля с подписями, согласие и никакой идентификации", () => {
  const html = renderAppealForm("operational", draft, []);
  expect(html).toContain("data-appeal-form");
  expect(html).toContain('name="name"');
  expect(html).toContain('name="contact"');
  expect(html).toContain('name="text"');
  expect(html).toContain('name="consent"');
  expect(html).not.toContain('name="identified"');
  expect(html).toContain("не является официальным обращением");
  expect(html).toContain(DEMO_NOTE);
  // Каждое поле связано с подписью.
  for (const id of ["appeal-name", "appeal-contact", "appeal-text", "appeal-consent"]) expect(html).toContain('for="' + id + '"');
});

test("официальная форма: идентификация и срок 30 дней", () => {
  const html = renderAppealForm("official", draft, []);
  expect(html).toContain('name="identified"');
  expect(html).toContain("ЕСИА");
  expect(html).toContain("30 дней");
});

test("ошибки полей показываются текстом и связаны с полем", () => {
  const html = renderAppealForm("operational", { ...draft, consent: false }, [
    { field: "consent", message: "Нужно согласие на обработку персональных данных." },
    { field: "text", message: "Опишите вопрос — не короче 10 символов." },
  ]);
  expect(html).toContain("Нужно согласие на обработку персональных данных.");
  expect(html).toContain("Опишите вопрос");
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain("appeal-text-error");
  expect(html).toContain('aria-describedby="appeal-text-error"');
});

test("подтверждение различает потоки и зовёт официальный путь", () => {
  const operational = renderAppealConfirm("operational", draft);
  expect(operational).toContain("оперативн");
  expect(operational).toContain("не является официальным обращением");
  expect(operational).toContain('href="#appeal?stream=official"');
  const official = renderAppealConfirm("official", draft);
  expect(official).toContain("номер");
  expect(official).toContain("30 дней");
  expect(official).toContain(DEMO_NOTE);
});
