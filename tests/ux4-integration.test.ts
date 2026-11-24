import { expect, test } from "bun:test";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { createDemoOrgRepository } from "../src/data/org-repository.ts";
import { APPROVE_USER, EXECUTOR_USER } from "../src/core/org/demo-story-types.ts";
import { renderDashboard } from "../src/web/dashboard-html.ts";
import { buildOverview } from "../src/web/overview.ts";
import { buildIncidentView } from "../src/web/incident.ts";
import { renderIncident } from "../src/web/incident-html.ts";
import {
  ACTOR_BY_ROLE,
  availableOrgActions,
  departmentDistribution,
  incidentDepartmentName,
  incidentOrgSummary,
  waitingForReview,
} from "../src/web/org-integration.ts";

const graph = buildProcessGraph();
const story = buildStory(graph, 7);
const incidents = story.incidents;
const { repository } = createDemoOrgRepository(graph, 7);
const ids = repository.incidentIds;
const day = "2026-01-02";
const overview = buildOverview(graph, incidents, day, repository);

test("распределение по подразделениям согласовано с назначениями", () => {
  const slices = departmentDistribution(repository, ids);
  expect(slices.length).toBeGreaterThan(1);
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const withAccountable = ids.filter((id) => repository.accountableOf(id) !== undefined).length;
  expect(total).toBe(withAccountable);
  expect(slices.every((slice) => slice.name.length > 0)).toBe(true);
  const busiest = slices[0]!;
  expect(repository.incidentIdsOfDepartment(busiest.departmentId).length).toBeGreaterThanOrEqual(busiest.count);
});

test("ожидание подтверждения считается по жизненным циклам", () => {
  const expected = ids.filter((id) => repository.lifecycleOf(id)?.status === "pending_review").length;
  expect(waitingForReview(repository, ids)).toBe(expected);
  expect(expected).toBeGreaterThan(0);
});

test("ответственное подразделение и участники берутся из модели", () => {
  const withParticipants = ids.find((id) => repository.participantsOf(id).length > 0)!;
  const accountable = repository.accountableOf(withParticipants)!;
  const name = repository.directory.departments.find((department) => department.id === accountable.departmentId)!.name;
  expect(incidentDepartmentName(repository, withParticipants)).toBe(name);
  const summary = incidentOrgSummary(repository, withParticipants)!;
  expect(summary.participants.length).toBeGreaterThan(1);
  expect(summary.participants.filter((item) => item.type === "accountable")).toHaveLength(1);
  expect(summary.participants.some((item) => item.employees.length > 0)).toBe(true);
  expect(summary.participants.some((item) => item.employees.length === 0)).toBe(true);
  expect(summary.statusTitle.length).toBeGreaterThan(0);
  expect(incidentOrgSummary(repository, "З-999")).toBeNull();
  expect(incidentDepartmentName(repository, "З-999")).toBe("");
});

test("доступные действия зависят от статуса и полномочий", () => {
  const active = ids.find((id) => repository.lifecycleOf(id)?.status === "active")!;
  expect(availableOrgActions(repository, active, EXECUTOR_USER).submit).toBe(true);
  expect(availableOrgActions(repository, active, APPROVE_USER).approve).toBe(false);

  const pending = ids.find((id) => repository.lifecycleOf(id)?.status === "pending_review")!;
  expect(availableOrgActions(repository, pending, APPROVE_USER).approve).toBe(true);
  expect(availableOrgActions(repository, pending, APPROVE_USER).reject).toBe(true);
  const submittedBy = repository.lifecycleOf(pending)?.records.at(-1)?.byUserId ?? null;
  expect(availableOrgActions(repository, pending, submittedBy).approve).toBe(false);
  expect(availableOrgActions(repository, pending, EXECUTOR_USER).approve).toBe(false);

  const completed = ids.find((id) => repository.lifecycleOf(id)?.status === "completed");
  if (completed) {
    expect(availableOrgActions(repository, completed, APPROVE_USER).reopen).toBe(true);
    expect(availableOrgActions(repository, completed, EXECUTOR_USER).reopen).toBe(false);
  }
  expect(ACTOR_BY_ROLE.deputy).toBe("USR-DISPATCHER");
  expect(ACTOR_BY_ROLE.contractor).toBe(EXECUTOR_USER);
  expect(ACTOR_BY_ROLE.auditor).toBe(APPROVE_USER);
  expect(ACTOR_BY_ROLE.resident).toBeNull();
});

test("обзор показывает подразделения, риск SLA и ожидание подтверждения", () => {
  const html = renderDashboard({ overview, days: story.days, day });
  expect(html).toContain("data-department-split");
  expect(html).toContain("Ответственные подразделения");
  expect(html).toContain("data-waiting-review");
  expect(html).toContain("с риском SLA");
  expect(html).toContain("Подразделение");
  expect(overview.atRisk).toBeGreaterThanOrEqual(0);
  expect(overview.org).not.toBeNull();
  expect(overview.org!.waitingForReview).toBe(waitingForReview(repository, ids));
});

test("без орг-модели обзор и карточка работают по-прежнему", () => {
  const plainOverview = buildOverview(graph, incidents, day);
  expect(plainOverview.org).toBeNull();
  const html = renderDashboard({ overview: plainOverview, days: story.days, day });
  expect(html).not.toContain("data-department-split");
  const view = buildIncidentView(graph, incidents, ids[0]!, day)!;
  expect(view.orgSummary).toBeNull();
  expect(view.actions).toBeNull();
  expect(renderIncident(view, day, story.days)).not.toContain("data-org-confirmation");
});

test("карточка показывает ответственное подразделение, участников и панель подтверждения", () => {
  const hero = ids[0]!;
  const view = buildIncidentView(graph, incidents, hero, day, repository, EXECUTOR_USER)!;
  const html = renderIncident(view, day, story.days);
  expect(html).toContain("Ответственное подразделение");
  expect(html).toContain("Состояние подтверждения");
  expect(html).toContain("data-org-confirmation");
  expect(html).toContain("data-org-actor");
  for (const action of ["submit", "approve", "reject", "reopen"]) {
    expect(html).toContain('data-org-action="' + action + '"');
  }
  expect(html).toContain("ответственное подразделение");
  expect(view.orgSummary).not.toBeNull();
  expect(view.actorOptions.map((option) => option.id)).toContain(APPROVE_USER);
});
