import { describe, test, expect } from "bun:test";
import { orchestrate, orchestrateRounds } from "../src/orchestrator";
import { registry } from "../src/adapters/registry";
import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "../src/adapters/base";
import type { ProgressEvent } from "../src/types";

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

  // #4 history_window
  test("history_window limits visible history passed to buildRequest", async () => {
    registry.register(new TestAdapter("test-a", "resp-a"));
    registry.register(new TestAdapter("test-b", "resp-b"));
    const slots = [
      { id: "f1", model: "test-a" },
      { id: "f2", model: "test-b" },
    ];
    const historySizes: number[] = [];

    await orchestrateRounds(
      slots,
      4,
      "sequential",
      (_slot, _round, history) => {
        historySizes.push(history.length);
        return { prompt: "x", timeout_ms: 5000 };
      },
      undefined,
      { history_window: 2 },
    );

    // round 4: only last 2 rounds × 2 slots = 4 responses visible
    expect(historySizes[historySizes.length - 1]).toBe(4);
    // round 1: always 0
    expect(historySizes[0]).toBe(0);
  });

  test("history_window null passes full history (regression)", async () => {
    const slots = [{ id: "f1", model: "test-a" }];
    const historySizes: number[] = [];

    await orchestrateRounds(
      slots,
      3,
      "sequential",
      (_slot, _round, history) => {
        historySizes.push(history.length);
        return { prompt: "x", timeout_ms: 5000 };
      },
      undefined,
      { history_window: null },
    );

    expect(historySizes).toEqual([0, 1, 2]);
  });

  // #5 onProgress
  test("onProgress fires per slot in parallel mode (fastest first)", async () => {
    registry.register(new TestAdapter("fast", "fast", 10));
    registry.register(new TestAdapter("medium", "med", 30));
    registry.register(new TestAdapter("slow", "slow", 60));
    const events: ProgressEvent[] = [];

    await orchestrateRounds(
      [
        { id: "s-fast", model: "fast" },
        { id: "s-medium", model: "medium" },
        { id: "s-slow", model: "slow" },
      ],
      1,
      "parallel",
      () => ({ prompt: "x", timeout_ms: 5000 }),
      undefined,
      { onProgress: (e) => events.push(e) },
    );

    expect(events).toHaveLength(3);
    expect(events[0].fighter).toBe("s-fast");
    expect(events[1].fighter).toBe("s-medium");
    expect(events[2].fighter).toBe("s-slow");
  });

  test("onProgress fires in slot order in sequential mode", async () => {
    const slots = [
      { id: "first", model: "test-a" },
      { id: "second", model: "test-b" },
    ];
    const order: string[] = [];

    await orchestrateRounds(
      slots,
      1,
      "sequential",
      () => ({ prompt: "x", timeout_ms: 5000 }),
      undefined,
      { onProgress: (e) => order.push(e.fighter) },
    );

    expect(order).toEqual(["first", "second"]);
  });

  test("onProgress error does not break orchestrate result", async () => {
    const slots = [{ id: "f1", model: "test-a" }];
    let result: AgentResponse[][] | undefined;

    result = await orchestrateRounds(
      slots,
      1,
      "sequential",
      () => ({ prompt: "x", timeout_ms: 5000 }),
      undefined,
      {
        onProgress: () => {
          throw new Error("progress callback error");
        },
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].error).toBeUndefined();
  });
});
