import { describe, test, expect } from "bun:test";
import { orchestrate, orchestrateRounds } from "../src/orchestrator";
import { registry } from "../src/adapters/registry";
import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "../src/adapters/base";

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
  test("should run slots in parallel using their model adapter", async () => {
    registry.register(new TestAdapter("test-a", "response A"));
    registry.register(new TestAdapter("test-b", "response B"));

    const result = await orchestrate({
      slots: [
        { id: "fighter-1", model: "test-a" },
        { id: "fighter-2", model: "test-b" },
      ],
      mode: "parallel",
      buildRequest: (slot) => ({
        prompt: `test prompt for ${slot.id}`,
        timeout_ms: 5000,
      }),
    });

    expect(result.responses).toHaveLength(2);
    expect(result.responses[0].content).toBe("response A");
    expect(result.responses[1].content).toBe("response B");
    expect(result.failed).toEqual([]);
  });

  test("should override response.agent with slot id (not model id)", async () => {
    const result = await orchestrate({
      slots: [
        { id: "pro-side", model: "test-a" },
        { id: "con-side", model: "test-a" },
      ],
      mode: "parallel",
      buildRequest: (slot) => ({ prompt: slot.id, timeout_ms: 5000 }),
    });

    expect(result.responses.map((r) => r.agent)).toEqual(["pro-side", "con-side"]);
  });

  test("should run slots sequentially", async () => {
    const result = await orchestrate({
      slots: [
        { id: "f1", model: "test-a" },
        { id: "f2", model: "test-b" },
      ],
      mode: "sequential",
      buildRequest: () => ({ prompt: "x", timeout_ms: 5000 }),
    });

    expect(result.responses).toHaveLength(2);
  });

  test("should handle partial failures and report failed slot ids", async () => {
    registry.register(new TestAdapter("test-fail", "x", 0, true));

    const result = await orchestrate({
      slots: [
        { id: "ok", model: "test-a" },
        { id: "broken", model: "test-fail" },
      ],
      mode: "parallel",
      buildRequest: () => ({ prompt: "test", timeout_ms: 5000 }),
    });

    expect(result.responses).toHaveLength(2);
    expect(result.failed).toEqual(["broken"]);
    expect(result.responses[1].error).toBe("mock failure");
  });

  test("should throw on unknown model", async () => {
    expect(
      orchestrate({
        slots: [{ id: "f1", model: "nonexistent-agent" }],
        mode: "parallel",
        buildRequest: () => ({ prompt: "test", timeout_ms: 5000 }),
      }),
    ).rejects.toThrow("Unknown agent");
  });
});

describe("orchestrateRounds", () => {
  test("should execute multiple rounds across slots", async () => {
    const rounds = await orchestrateRounds(
      [
        { id: "f1", model: "test-a" },
        { id: "f2", model: "test-b" },
      ],
      2,
      "parallel",
      (slot, round) => ({
        prompt: `round ${round} for ${slot.id}`,
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
      [{ id: "f1", model: "test-a" }],
      2,
      "sequential",
      (_slot, _round, history) => {
        receivedHistory.push([...history]);
        return { prompt: "test", timeout_ms: 5000 };
      },
    );

    expect(receivedHistory[0]).toHaveLength(0);
    expect(receivedHistory[1]).toHaveLength(1);
  });

  test("should call onRound callback", async () => {
    const roundsCalled: number[] = [];

    await orchestrateRounds(
      [{ id: "f1", model: "test-a" }],
      3,
      "sequential",
      () => ({ prompt: "test", timeout_ms: 5000 }),
      (round) => roundsCalled.push(round),
    );

    expect(roundsCalled).toEqual([1, 2, 3]);
  });
});
