import { describe, test, expect } from "bun:test";
import { reviewPositions } from "../../src/core/review";

describe("reviewPositions", () => {
  test("should default to bug + security adversaries when focus is omitted", () => {
    const positions = reviewPositions();
    expect(positions.length).toBeGreaterThanOrEqual(2);
    const joined = positions.join("\n").toLowerCase();
    expect(joined).toMatch(/bug/);
    expect(joined).toMatch(/security/);
  });

  test("should derive one adversary per requested focus", () => {
    const positions = reviewPositions(["bugs", "performance"]);
    expect(positions).toHaveLength(2);
    expect(positions[0].toLowerCase()).toContain("bug");
    expect(positions[1].toLowerCase()).toContain("performance");
  });

  test("should throw when fewer than 2 focus values are given", () => {
    expect(() => reviewPositions(["bugs"])).toThrow(/at least 2/i);
  });

  test("should throw on unknown focus key", () => {
    expect(() => reviewPositions(["nonsense"])).toThrow(/unknown focus/i);
  });

  test("each position should describe an attacker stance, not a generic reviewer", () => {
    const positions = reviewPositions(["bugs", "security"]);
    const joined = positions.join("\n").toLowerCase();
    expect(joined).toMatch(/find|attack|hostile|adversarial|exploit|break/);
  });
});
