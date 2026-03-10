import { describe, test, expect, mock } from "bun:test";
import { orchestrate, orchestrateRounds } from "../src/orchestrator";
import { registry } from "../src/adapters/registry";
import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "../src/adapters/base";

// Create mock adapters for testing
class TestAdapter implements AgentAdapter {
  readonly id: string;
  readonly name: string;
  private response: string;
  private delay: number;
  private shouldFail: boolean;

  constructor(id: string, response: string, delay = 0, shouldFail = false) {
    this.id = id;
    this.name = `Test ${id}`;
    this.response = response;
    this.delay = delay;
    this.shouldFail = shouldFail;
  }

  async healthCheck(): Promise<HealthResult> {
    return { ok: true, latency_ms: 1 };
  }

  async execute(req: AgentRequest): Promise<AgentResponse> {
    if (this.delay) await new Promise((r) => setTimeout(r, this.delay));
    if (this.shouldFail) {
      return { content: "", agent: this.id, latency_ms: this.delay, error: "mock failure" };
    }
    return { content: this.response, agent: this.id, latency_ms: this.delay };
  }
}

describe("orchestrate", () => {
  test("should run agents in parallel", async () => {
    // Register test adapters
    registry.register(new TestAdapter("test-a", "response A"));
    registry.register(new TestAdapter("test-b", "response B"));

    const result = await orchestrate({
      agents: ["test-a", "test-b"],
      mode: "parallel",
      buildRequest: (agentId) => ({
        prompt: `test prompt for ${agentId}`,
        timeout_ms: 5000,
      }),
    });

    expect(result.responses).toHaveLength(2);
    expect(result.responses[0].content).toBe("response A");
    expect(result.responses[1].content).toBe("response B");
    expect(result.failed).toEqual([]);
  });

  test("should run agents sequentially", async () => {
    const result = await orchestrate({
      agents: ["test-a", "test-b"],
      mode: "sequential",
      buildRequest: (agentId) => ({
        prompt: `test prompt for ${agentId}`,
        timeout_ms: 5000,
      }),
    });

    expect(result.responses).toHaveLength(2);
  });

  test("should handle partial failures", async () => {
    registry.register(new TestAdapter("test-fail", "x", 0, true));

    const result = await orchestrate({
      agents: ["test-a", "test-fail"],
      mode: "parallel",
      buildRequest: () => ({ prompt: "test", timeout_ms: 5000 }),
    });

    expect(result.responses).toHaveLength(2);
    expect(result.failed).toEqual(["test-fail"]);
    expect(result.responses[0].content).toBe("response A");
    expect(result.responses[1].error).toBe("mock failure");
  });

  test("should throw on unknown agent", async () => {
    expect(
      orchestrate({
        agents: ["nonexistent-agent"],
        mode: "parallel",
        buildRequest: () => ({ prompt: "test", timeout_ms: 5000 }),
      }),
    ).rejects.toThrow("Unknown agent");
  });
});

describe("orchestrateRounds", () => {
  test("should execute multiple rounds", async () => {
    const rounds = await orchestrateRounds(
      ["test-a", "test-b"],
      2,
      "parallel",
      (agentId, round) => ({
        prompt: `round ${round} for ${agentId}`,
        timeout_ms: 5000,
      }),
    );

    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toHaveLength(2);
    expect(rounds[1]).toHaveLength(2);
  });

  test("should pass history from previous rounds", async () => {
    const receivedHistory: AgentResponse[][] = [];

    await orchestrateRounds(
      ["test-a"],
      2,
      "sequential",
      (_agentId, _round, history) => {
        receivedHistory.push([...history]);
        return { prompt: "test", timeout_ms: 5000 };
      },
    );

    expect(receivedHistory[0]).toHaveLength(0); // Round 1: no history
    expect(receivedHistory[1]).toHaveLength(1); // Round 2: has round 1 response
  });

  test("should call onRound callback", async () => {
    const roundsCalled: number[] = [];

    await orchestrateRounds(
      ["test-a"],
      3,
      "sequential",
      () => ({ prompt: "test", timeout_ms: 5000 }),
      (round) => roundsCalled.push(round),
    );

    expect(roundsCalled).toEqual([1, 2, 3]);
  });
});
