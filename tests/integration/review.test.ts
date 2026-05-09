import { describe, test, expect, beforeAll } from "bun:test";
import { runScenario } from "../../src/core/scenario";
import { reviewPositions } from "../../src/core/review";
import { acquireContext } from "../../src/context";
import { registry } from "../../src/adapters/registry";
import { MockAdapter } from "./helpers/mock-adapter";
import { SAMPLE_CODE } from "./helpers/fixtures";

describe("arena_review integration", () => {
  beforeAll(() => {
    registry.register(new MockAdapter({ id: "rev-a", response: "review-a" }));
    registry.register(new MockAdapter({ id: "rev-b", response: "review-b" }));
  });

  test("should run review as challenge with attacker positions over raw code", async () => {
    const ctx = await acquireContext([{ type: "raw", code: SAMPLE_CODE }]);
    const result = await runScenario({
      context: ctx.content,
      positions: reviewPositions(["bugs", "security"]),
      availableModels: ["rev-a", "rev-b"],
      rounds: 1,
    });

    expect(result.fighters).toHaveLength(2);
    expect(result.fighters[0].position.toLowerCase()).toContain("bug");
    expect(result.fighters[1].position.toLowerCase()).toContain("security");
  });

  test("should default to bug + security when no focus given", async () => {
    const result = await runScenario({
      context: "any code",
      positions: reviewPositions(),
      availableModels: ["rev-a", "rev-b"],
      rounds: 1,
    });
    const text = result.fighters.map((f) => f.position).join("\n").toLowerCase();
    expect(text).toMatch(/bug/);
    expect(text).toMatch(/security/);
  });
});
