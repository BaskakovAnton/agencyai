import { expect, test } from "bun:test";
import { CHANNELS, REPORTERS, createIncident } from "../src/core/incident.ts";
import { CATEGORIES } from "../src/data/categories.ts";
import { mulberry32 } from "../src/random.ts";
import { buildStory } from "../src/core/story.ts";
import { buildProcessGraph } from "../src/data/edges.ts";
import { buildRows, defaultFilters } from "../src/web/incidents.ts";
import { buildIncidentView } from "../src/web/incident.ts";

test("заявитель и канал обращения хранятся раздельно", () => {
  const incident = createIncident({ index: 0, nodeId: "U1", categories: CATEGORIES, rand: mulberry32(5) });
  expect(REPORTERS).toContain(incident.reporter);
  expect(CHANNELS).toContain(incident.channel ?? "");
  // Житель — роль без персональных данных, канал — отдельное поле.
  expect(incident.reporter).not.toBe(incident.channel);
});

test("канал попадает в поиск реестра и в факты карточки", () => {
  const graph = buildProcessGraph();
  const story = buildStory(graph, 7);
  const day = "2026-01-02";
  const channel = story.incidents.find((incident) => incident.channel !== undefined)!.channel!;
  const rows = buildRows(graph, story.incidents, day, { ...defaultFilters(), q: channel });
  expect(rows.length).toBeGreaterThan(0);
  const target = story.incidents.find((incident) => incident.channel === channel)!;
  const view = buildIncidentView(graph, story.incidents, target.id, day)!;
  expect(view.channel).toBe(channel);
  expect(view.facts.some((fact) => fact.label === "Канал обращения" && fact.value === channel)).toBe(true);
});
