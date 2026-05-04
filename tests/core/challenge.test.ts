import { describe, test, expect, beforeAll } from "bun:test";
import { runChallenge } from "../../src/core/challenge";
import { registry } from "../../src/adapters/registry";
import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "../../src/adapters/base";

class StubAdapter implements AgentAdapter {
  readonly id: string;
  readonly name: string;
  public requests: AgentRequest[] = [];

  constructor(id: string) {
    this.id = id;
    this.name = id;
  }

  async healthCheck(): Promise<HealthResult> {
    return { ok: true, latency_ms: 1 };
  }

  async execute(req: AgentRequest): Promise<AgentResponse> {
    this.requests.push(req);
    return {
      content: `${this.id} says: ${req.system?.match(/position: (.+)/)?.[1] ?? "?"}`,
      agent: this.id,
      latency_ms: 1,
    };
  }
}

const stubA = new StubAdapter("stub-a");
const stubB = new StubAdapter("stub-b");

beforeAll(() => {
  registry.register(stubA);
  registry.register(stubB);
});

describe("runChallenge", () => {
  test("should reject when fewer than 2 positions provided", async () => {
    expect(
      runChallenge({
        context: "x",
        positions: ["only one"],
        availableModels: ["stub-a", "stub-b"],
      }),
    ).rejects.toThrow(/at least 2 positions/i);
  });

  test("should dispatch one fighter per position with diverse models", async () => {
    const result = await runChallenge({
      context: "ctx",
      positions: ["pro", "con"],
      availableModels: ["stub-a", "stub-b"],
      rounds: 1,
    });

    expect(result.fighters).toHaveLength(2);
    expect(result.fighters[0].position).toBe("pro");
    expect(result.fighters[1].position).toBe("con");
    expect(new Set(result.fighters.map((f) => f.model)).size).toBe(2);
  });

  test("should reuse the same model when only one is available", async () => {
    const result = await runChallenge({
      context: "ctx",
      positions: ["pro", "con"],
      availableModels: ["stub-a"],
      rounds: 1,
    });

    expect(result.fighters.every((f) => f.model === "stub-a")).toBe(true);
    expect(result.fighters[0].id).not.toBe(result.fighters[1].id);
  });

  test("should run the configured number of rounds", async () => {
    const result = await runChallenge({
      context: "ctx",
      positions: ["a", "b"],
      availableModels: ["stub-a", "stub-b"],
      rounds: 3,
    });

    expect(result.rounds).toHaveLength(3);
    expect(result.rounds[0]).toHaveLength(2);
  });

  test("should embed each fighter's position in its system prompt", async () => {
    stubA.requests = [];
    stubB.requests = [];

    await runChallenge({
      context: "ctx",
      positions: ["微服务派", "单体派"],
      availableModels: ["stub-a", "stub-b"],
      rounds: 1,
    });

    const allSys = [...stubA.requests, ...stubB.requests].map((r) => r.system).join("\n");
    expect(allSys).toContain("微服务派");
    expect(allSys).toContain("单体派");
  });

  test("should default rounds when not specified", async () => {
    const { DEFAULT_ROUNDS } = await import("../../src/constants");
    const result = await runChallenge({
      context: "ctx",
      positions: ["a", "b"],
      availableModels: ["stub-a", "stub-b"],
    });

    expect(result.rounds).toHaveLength(DEFAULT_ROUNDS);
  });

  test("should respect models override", async () => {
    const result = await runChallenge({
      context: "ctx",
      positions: ["a", "b"],
      availableModels: ["stub-a", "stub-b"],
      models: ["stub-a", "stub-a"],
      rounds: 1,
    });

    expect(result.fighters.every((f) => f.model === "stub-a")).toBe(true);
  });
});
