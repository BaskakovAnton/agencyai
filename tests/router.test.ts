import { expect, test } from "bun:test";
import { hrefChat, hrefDashboard, hrefIncident, hrefIncidents, hrefTimeline, parseRoute } from "../src/web/router.ts";

test("маршруты: обзор — стартовый, модель — по явному адресу", () => {
  expect(parseRoute("").name).toBe("dashboard");
  expect(parseRoute("#").name).toBe("dashboard");
  expect(parseRoute("#dashboard").name).toBe("dashboard");
  expect(parseRoute("#неизвестный").name).toBe("dashboard");
  expect(parseRoute("#incidents").name).toBe("incidents");
  expect(parseRoute("#model").name).toBe("model");
});

test("детали обращения: id и дата берутся из адреса", () => {
  const route = parseRoute("#incident/" + encodeURIComponent("З-015") + "?at=2026-01-02");
  expect(route.name).toBe("incident");
  expect(route.incidentId).toBe("З-015");
  expect(route.at).toBe("2026-01-02");
});

test("хронология и чат сохраняют at и view", () => {
  const timeline = parseRoute("#timeline?at=2026-01-02&view=gantt");
  expect(timeline.name).toBe("timeline");
  expect(timeline.at).toBe("2026-01-02");
  expect(timeline.view).toBe("gantt");
  expect(parseRoute("#timeline?at=2026-01-02&view=что-то").view).toBe("gantt");
  const chat = parseRoute("#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02");
  expect(chat.name).toBe("chat");
  expect(chat.incidentId).toBe("З-015");
});

test("хелперы собирают ссылки разделов", () => {
  expect(hrefDashboard()).toBe("#dashboard");
  expect(hrefIncidents()).toBe("#incidents");
  expect(hrefIncident("З-015", "2026-01-02")).toContain("#incident/");
  expect(hrefIncident("З-015", "2026-01-02")).toContain("at=2026-01-02");
  expect(hrefTimeline("2026-01-02", "gantt")).toBe("#timeline?at=2026-01-02&view=gantt");
  expect(hrefChat("З-015", "2026-01-02")).toBe("#chat/" + encodeURIComponent("З-015") + "?at=2026-01-02");
});
