import { describe, test, expect } from "bun:test";
import { dispatch, roundRobin } from "../../src/core/dispatch";

describe("dispatch", () => {
  test("should zip positions and models into fighters", () => {
    const fighters = dispatch(["pro", "con"], ["claude", "codex"]);
    expect(fighters).toEqual([
      { id: "claude#0", model: "claude", position: "pro" },
      { id: "codex#1", model: "codex", position: "con" },
    ]);
  });

  test("should generate unique ids when the same model appears multiple times", () => {
    const fighters = dispatch(["a", "b", "c"], ["claude", "claude", "claude"]);
    const ids = fighters.map((f) => f.id);
    expect(new Set(ids).size).toBe(3);
  });

  test("should throw when positions is empty", () => {
    expect(() => dispatch([], ["claude"])).toThrow(/positions/);
  });

  test("should throw when models and positions differ in length", () => {
    expect(() => dispatch(["a", "b"], ["claude"])).toThrow(/length/);
  });
});

describe("roundRobin", () => {
  test("should assign pool entries in order", () => {
    expect(roundRobin(2, ["claude", "codex"])).toEqual(["claude", "codex"]);
  });

  test("should cycle when count exceeds pool size", () => {
    expect(roundRobin(3, ["claude", "codex"])).toEqual(["claude", "codex", "claude"]);
  });

  test("should repeat single entry for all slots", () => {
    expect(roundRobin(3, ["claude"])).toEqual(["claude", "claude", "claude"]);
  });

  test("should throw when pool is empty", () => {
    expect(() => roundRobin(2, [])).toThrow(/no models/);
  });
});
