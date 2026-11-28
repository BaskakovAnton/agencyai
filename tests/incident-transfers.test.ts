import { expect, test } from "bun:test";
import { transfersBlock, type TransferRow } from "../src/web/incident-transfers.ts";

const row = (over: Partial<TransferRow>): TransferRow => ({
  department: "ЖКХ",
  from: "2026-01-02T04:00:00.000Z",
  to: "2026-01-02T20:00:00.000Z",
  reason: "Передано по регламенту",
  ...over,
});

test("закрытая передача показывает интервал и основание", () => {
  const html = transfersBlock([row({})]);
  expect(html).toContain("data-transfers");
  expect(html).toContain("ЖКХ");
  expect(html).toContain("Основание: Передано по регламенту");
  expect(html).toContain("по ");
});

test("открытая передача помечена как действующая", () => {
  const html = transfersBlock([row({ to: null })]);
  expect(html).toContain("по настоящее время");
});

test("без основания строка не выдумывает текст", () => {
  const html = transfersBlock([row({ reason: "" })]);
  expect(html).not.toContain("Основание:");
});

test("без передач показывается честное пустое состояние", () => {
  const html = transfersBlock([]);
  expect(html).toContain("data-transfers-empty");
  expect(html).toContain("Передач не зафиксировано");
});
