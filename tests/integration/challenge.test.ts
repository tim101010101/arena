import { describe, test, expect, beforeAll } from "bun:test";
import { runChallenge } from "../../src/core/challenge";
import { formatChallengeTranscript } from "../../src/core/output";
import { registry } from "../../src/adapters/registry";
import { MockAdapter } from "./helpers/mock-adapter";

describe("arena_challenge integration", () => {
  beforeAll(() => {
    registry.register(new MockAdapter({ id: "mock-pro", response: "argues pro" }));
    registry.register(new MockAdapter({ id: "mock-con", response: "argues con" }));
  });

  test("should produce a transcript with one fighter per position", async () => {
    const result = await runChallenge({
      context: "选 REST 还是 GraphQL",
      positions: ["REST 派", "GraphQL 派"],
      availableModels: ["mock-pro", "mock-con"],
      rounds: 2,
    });

    expect(result.fighters).toHaveLength(2);
    expect(result.rounds).toHaveLength(2);
    expect(result.rounds[0]).toHaveLength(2);
  });

  test("should label transcript with positions, not fighter ids", async () => {
    const result = await runChallenge({
      context: "ctx",
      positions: ["微服务派", "单体派"],
      availableModels: ["mock-pro", "mock-con"],
      rounds: 1,
    });
    const transcript = formatChallengeTranscript(result);
    expect(transcript).toContain("微服务派");
    expect(transcript).toContain("单体派");
  });

  test("should reuse same model with different positions when only one available", async () => {
    const result = await runChallenge({
      context: "ctx",
      positions: ["pro", "con"],
      availableModels: ["mock-pro"],
      rounds: 1,
    });

    expect(result.fighters.every((f) => f.model === "mock-pro")).toBe(true);
    expect(result.fighters[0].position).not.toBe(result.fighters[1].position);
  });
});
