import { describe, test, expect } from "bun:test";
import { ChallengeInputSchema } from "../../src/types";

describe("ChallengeInputSchema", () => {
  test("should accept positions-driven input", () => {
    const result = ChallengeInputSchema.safeParse({
      context: "decision X",
      positions: ["pro", "con"],
    });
    expect(result.success).toBe(true);
  });

  test("should reject input with fewer than 2 positions", () => {
    const result = ChallengeInputSchema.safeParse({
      context: "x",
      positions: ["only one"],
    });
    expect(result.success).toBe(false);
  });

  test("should reject input missing context", () => {
    const result = ChallengeInputSchema.safeParse({
      positions: ["a", "b"],
    });
    expect(result.success).toBe(false);
  });

  test("should accept optional models override", () => {
    const result = ChallengeInputSchema.safeParse({
      context: "x",
      positions: ["a", "b"],
      models: ["claude", "codex"],
    });
    expect(result.success).toBe(true);
  });

  test("should accept optional rounds within range", () => {
    const result = ChallengeInputSchema.safeParse({
      context: "x",
      positions: ["a", "b"],
      rounds: 5,
    });
    expect(result.success).toBe(true);
  });

  test("should reject legacy assertion/challengers/defender fields", () => {
    const r1 = ChallengeInputSchema.safeParse({
      assertion: "x is true",
      challengers: ["claude"],
    });
    expect(r1.success).toBe(false);
  });
});
