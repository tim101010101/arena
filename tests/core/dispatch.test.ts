import { describe, test, expect } from "bun:test";
import { dispatch } from "../../src/core/dispatch";

describe("dispatch", () => {
  test("should assign one model per position when counts match", () => {
    const fighters = dispatch(["pro", "con"], ["claude", "codex"]);
    expect(fighters).toHaveLength(2);
    expect(fighters[0]).toEqual({ id: "claude#0", model: "claude", position: "pro" });
    expect(fighters[1]).toEqual({ id: "codex#1", model: "codex", position: "con" });
  });

  test("should prefer different models when more available than positions", () => {
    const fighters = dispatch(["a", "b"], ["claude", "codex", "gemini"]);
    const models = fighters.map((f) => f.model);
    expect(new Set(models).size).toBe(2);
  });

  test("should cycle models when positions exceed available", () => {
    const fighters = dispatch(["a", "b", "c"], ["claude", "codex"]);
    expect(fighters.map((f) => f.model)).toEqual(["claude", "codex", "claude"]);
  });

  test("should reuse the same model for all positions when only one available", () => {
    const fighters = dispatch(["pro", "con"], ["claude"]);
    expect(fighters.map((f) => f.model)).toEqual(["claude", "claude"]);
    expect(fighters.map((f) => f.position)).toEqual(["pro", "con"]);
  });

  test("should generate unique fighter ids even when reusing models", () => {
    const fighters = dispatch(["a", "b", "c"], ["claude"]);
    const ids = fighters.map((f) => f.id);
    expect(new Set(ids).size).toBe(3);
  });

  test("should respect override list when provided", () => {
    const fighters = dispatch(["a", "b"], ["claude", "codex", "gemini"], ["gemini", "codex"]);
    expect(fighters.map((f) => f.model)).toEqual(["gemini", "codex"]);
  });

  test("should cycle override when shorter than positions", () => {
    const fighters = dispatch(["a", "b", "c"], ["claude", "codex"], ["codex"]);
    expect(fighters.map((f) => f.model)).toEqual(["codex", "codex", "codex"]);
  });

  test("should reject override containing unavailable models", () => {
    expect(() => dispatch(["a"], ["claude"], ["nonexistent"])).toThrow(/nonexistent/);
  });

  test("should reject empty positions", () => {
    expect(() => dispatch([], ["claude"])).toThrow(/positions/);
  });

  test("should reject empty available models", () => {
    expect(() => dispatch(["a"], [])).toThrow(/no available models/);
  });

  test("should preserve position text on each fighter", () => {
    const fighters = dispatch(["argue X", "argue Y"], ["claude", "codex"]);
    expect(fighters[0].position).toBe("argue X");
    expect(fighters[1].position).toBe("argue Y");
  });
});
