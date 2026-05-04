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

  test("should ensure at least 2 positions even when only one focus given", () => {
    const positions = reviewPositions(["bugs"]);
    expect(positions.length).toBeGreaterThanOrEqual(2);
  });

  test("each position should describe an attacker stance, not a generic reviewer", () => {
    const positions = reviewPositions(["bugs"]);
    const joined = positions.join("\n").toLowerCase();
    expect(joined).toMatch(/find|attack|hostile|adversarial|exploit|break/);
  });
});
