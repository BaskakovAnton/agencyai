import { expect, test } from "bun:test";
import { parseCommand, parseScript } from "../src/cli/commands.ts";

test("разбор основных и альтернативных форм команд", () => {
  expect(parseCommand("help").kind).toBe("help");
  expect(parseCommand("?").kind).toBe("help");
  expect(parseCommand("graph").kind).toBe("graph");
  expect(parseCommand("nodes").kind).toBe("graph");
  expect(parseCommand("ls").kind).toBe("list");
  expect(parseCommand("node u7")).toEqual({ kind: "node", nodeId: "U7" });
  expect(parseCommand("show 5")).toEqual({ kind: "show", ref: "5" });
  expect(parseCommand("move 5 u9")).toEqual({ kind: "move", ref: "5", nodeId: "U9" });
  expect(parseCommand("role")).toEqual({ kind: "role", role: null });
  expect(parseCommand("роль contractor")).toEqual({ kind: "role", role: "contractor" });
  expect(parseCommand("wait")).toEqual({ kind: "wait", hours: 4 });
  expect(parseCommand("wait -3")).toEqual({ kind: "wait", hours: 0 });
  expect(parseCommand("report").kind).toBe("report");
  expect(parseCommand("save").kind).toBe("save");
  expect(parseCommand("q").kind).toBe("quit");
  expect(parseCommand("exit").kind).toBe("quit");
});

test("неполные и неизвестные команды не ломают разбор", () => {
  expect(parseCommand("").kind).toBe("unknown");
  expect(parseCommand("move 5").kind).toBe("unknown");
  expect(parseCommand("node").kind).toBe("unknown");
  expect(parseCommand("абракадабра").kind).toBe("unknown");
});

test("parseScript режет сценарий по ; и выбрасывает мусор", () => {
  const script = parseScript("list; show 5 ;; forward 5;");
  expect(script.map((command) => command.kind)).toEqual(["list", "show", "forward"]);
});
