import { describe, test, expect, beforeAll } from "bun:test";
import { orchestrateRounds } from "../../src/orchestrator";
import { sessions } from "../../src/session";
import { registry } from "../../src/adapters/registry";
import { MockAdapter } from "./helpers/mock-adapter";
import { SAMPLE_TOPIC } from "./helpers/fixtures";

describe("arena_debate integration", () => {
  beforeAll(() => {
    registry.register(new MockAdapter({ id: "mock1", response: "Argument A" }));
    registry.register(new MockAdapter({ id: "mock2", response: "Argument B" }));
  });

  test("should_run_sequential_debate_with_history", async () => {
    const session = sessions.create("debate", ["mock1", "mock2"], { topic: SAMPLE_TOPIC });

    await orchestrateRounds(
      ["mock1", "mock2"],
      2,
      "sequential",
      (agentId, round, history) => ({
        system: `You are ${agentId}`,
        prompt: `Round ${round}: ${SAMPLE_TOPIC}`,
        timeout_ms: 5000,
        history,
      }),
      (round, responses) => sessions.addRound(session.id, responses)
    );

    const result = sessions.get(session.id);
    expect(result.rounds.length).toBe(2);
    expect(result.rounds[0].responses.length).toBe(2);
    expect(result.rounds[1].responses.length).toBe(2);
  });

  test("should_run_parallel_debate", async () => {
    const session = sessions.create("debate", ["mock1", "mock2"], { topic: SAMPLE_TOPIC });

    await orchestrateRounds(
      ["mock1", "mock2"],
      2,
      "parallel",
      (agentId, round) => ({
        prompt: `Round ${round}: ${SAMPLE_TOPIC}`,
        timeout_ms: 5000,
      }),
      (round, responses) => sessions.addRound(session.id, responses)
    );

    const result = sessions.get(session.id);
    expect(result.rounds.length).toBe(2);
  });

  test("should_store_session_metadata", async () => {
    const metadata = { topic: SAMPLE_TOPIC, mode: "sequential" };
    const session = sessions.create("debate", ["mock1", "mock2"], metadata);

    expect(session.metadata.topic).toBe(SAMPLE_TOPIC);
    expect(session.metadata.mode).toBe("sequential");
  });
});
