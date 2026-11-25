/** UX-3.1 finalization (M1): доступные действия UI совпадают с доменным правилом lastSubmitter. */
import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { lastSubmitter } from "../src/core/org/completion.ts";
import { availableOrgActions } from "../src/web/org-integration.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const { repository } = createDemoOrgRepository(graph, 7);

/** Обращения, ожидающие проверки: у них есть запись submitted и есть что подтверждать. */
const pending = story.incidents
  .map((incident) => ({ incident, lifecycle: repository.lifecycleOf(incident.id) }))
  .filter((row) => row.lifecycle?.status === "pending_review");

test("в демо-истории есть обращения, ожидающие проверки", () => {
  expect(pending.length).toBeGreaterThan(0);
});

test("запрет самоподтверждения в UI совпадает с доменным lastSubmitter", () => {
  for (const row of pending) {
    const lifecycle = row.lifecycle!;
    const submitter = lastSubmitter(lifecycle.records);
    expect(submitter).not.toBeNull();
    // Тот, кто сдал работу, не видит доступного подтверждения.
    expect({ id: row.incident.id, approve: availableOrgActions(repository, row.incident.id, submitter).approve }).toEqual({
      id: row.incident.id,
      approve: false,
    });
  }
});

test("контролёр может подтвердить чужую работу, но не свою", () => {
  const row = pending[0]!;
  const submitter = lastSubmitter(row.lifecycle!.records)!;
  const control = "USR-CONTROL";
  expect(submitter).not.toBe(control);
  expect(availableOrgActions(repository, row.incident.id, control).approve).toBe(true);
  expect(availableOrgActions(repository, row.incident.id, submitter).approve).toBe(false);
});

test("неизвестный пользователь не получает ни одного действия", () => {
  const row = pending[0]!;
  const actions = availableOrgActions(repository, row.incident.id, null);
  expect(actions).toEqual({ submit: false, approve: false, reject: false, reopen: false });
});
