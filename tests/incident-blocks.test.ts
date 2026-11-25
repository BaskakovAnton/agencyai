/** UX-3.2.0: проверка вынесенных блоков карточки — разметка и семантика не менялись. */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { buildIncidentView } from "../src/web/incident.ts";
import { linksBlock } from "../src/web/incident-actor.ts";
import { renderIncident } from "../src/web/incident-html.ts";
import { participantsBlock } from "../src/web/incident-org.ts";
import { HISTORICAL_NOTICE } from "../src/web/historical.ts";
import { ORG_STATUS_TONES, actionButton, confirmationBlock, shortDay } from "../src/web/incident-confirmation.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const days = story.days;
const lastDay = days.at(-1)!;
const { repository } = createDemoOrgRepository(graph, 7);
const view = buildIncidentView(graph, story.incidents, "З-001", lastDay, repository, "USR-CONTROL")!;
const viewNoOrg = buildIncidentView(graph, story.incidents, "З-001", lastDay)!;

test("кнопка действия: включённая без title, отключённая с пояснением", () => {
  expect(actionButton("submit", "Сделать", true, "подсказка")).toBe('<button class="button" data-org-action="submit">Сделать</button>');
  expect(actionButton("approve", "Подтвердить", false, "нужно право")).toBe('<button class="button" data-org-action="approve" disabled title="нужно право">Подтвердить</button>');
});

test("короткая дата формата «ДД.ММ»", () => {
  expect(shortDay("2026-01-02")).toBe("02.01");
});

test("панель подтверждения: набор действий и состояния соответствуют модели", () => {
  const html = confirmationBlock(view, false, "2026-01-02");
  expect((html.match(/data-org-action=/g) ?? []).length).toBe(4);
  expect((html.match(/ disabled/g) ?? []).length).toBe(3);
  expect(html).toContain("Действовать от имени");
  expect(html).toContain("Действия проверяются моделью");
  expect(html).not.toContain(HISTORICAL_NOTICE);
});

test("панель подтверждения в историческом срезе: все действия отключены и есть пояснение", () => {
  const html = confirmationBlock(view, true, "2026-01-02");
  expect((html.match(/data-org-action=/g) ?? []).length).toBe(4);
  expect((html.match(/ disabled/g) ?? []).length).toBe(4);
  expect(html).toContain(HISTORICAL_NOTICE);
  expect(html).toContain("Исторический срез: состояние на 02.01");
  expect(html).toContain("data-historical");
});

test("панель подтверждения без орг-модели не рисуется", () => {
  expect(confirmationBlock(viewNoOrg, false, lastDay)).toBe("");
});

test("участники: из орг-модели — с типом роли, без неё — прежний список ролей", () => {
  const withOrg = participantsBlock(view);
  expect(withOrg).toContain("ответственное подразделение");
  expect(withOrg).toContain("assignee");
  const withoutOrg = participantsBlock(viewNoOrg);
  expect(withoutOrg).not.toContain("ответственное подразделение");
  expect(withoutOrg.length).toBeGreaterThan(0);
});

test("переходы: четыре ссылки на связанные представления", () => {
  const html = linksBlock(view, "2026-01-02");
  expect((html.match(/<a class="button"/g) ?? []).length).toBe(4);
  expect(html).toContain("Открыть в хронологии");
  expect(html).toContain("Открыть переписку");
  expect(html).toContain("Все обращения");
});

test("перенесённый блок переходов используется композицией карточки", () => {
  const links = linksBlock(view, "2026-01-02");
  const card = renderIncident(view, "2026-01-02", days, {});
  expect(card).toContain(links);
  expect(card).toContain("Подтверждение завершения");
});

test("тональности статусов орг-модели сохранились", () => {
  expect(ORG_STATUS_TONES).toEqual({ active: "blue", pending_review: "amber", completed: "green", reopened: "gray" });
});
