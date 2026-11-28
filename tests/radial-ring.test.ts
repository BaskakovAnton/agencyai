import { expect, test } from "bun:test";
import { ringShares, renderRing } from "../src/web/radial-ring.ts";

const segments = [
  { id: "ok", title: "В срок", value: 5 },
  { id: "paused", title: "Пауза", value: 0 },
  { id: "overdue", title: "Просрочено", value: 14 },
  { id: "none", title: "Без норматива", value: 9 },
];

test("доли считаются от суммы и в сумме дают 100", () => {
  const shares = ringShares(segments);
  expect(shares.map((item) => item.id)).toEqual(["ok", "paused", "overdue", "none"]);
  expect(shares.reduce((sum, item) => sum + item.share, 0)).toBe(100);
  expect(shares.find((item) => item.id === "overdue")?.share).toBe(50);
  expect(shares.find((item) => item.id === "paused")?.share).toBe(0);
});

test("без данных доли не выдумываются", () => {
  expect(ringShares([{ id: "ok", title: "В срок", value: 0 }])[0]?.share).toBe(0);
  const empty = renderRing({ segments: [], centerValue: "0", centerLabel: "нет данных" });
  expect(empty).toContain("нет данных");
  expect(empty).not.toContain("stroke-dasharray");
});

test("кольцо доступно: роль, имя и текстовые подписи сегментов", () => {
  const html = renderRing({ segments, centerValue: "28", centerLabel: "обращений" });
  expect(html).toContain("data-sla-ring");
  expect(html).toContain('role="img"');
  expect(html).toContain('aria-label="Фазы SLA');
  expect(html).toContain("<title>В срок: 5</title>");
  expect(html).toContain("ring-seg-overdue");
  expect(html).toContain("28");
});

test("кегль кольца задан в единицах viewBox, а не в пикселях", () => {
  const html = renderRing({ segments, centerValue: "28", centerLabel: "обращений" });
  expect(html).toContain('font-size="20"');
  expect(html).toContain('font-size="12"');
  expect(/font-size="[0-9.]+px"/.test(html)).toBe(false);
});

test("нулевые сегменты не рисуются в кольце, но остаются в данных легенды", () => {
  const html = renderRing({ segments, centerValue: "28", centerLabel: "обращений" });
  expect(html).not.toContain("ring-seg-paused");
  expect(ringShares(segments).some((item) => item.id === "paused")).toBe(true);
});
