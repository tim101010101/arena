import { describe, test, expect, beforeAll } from "bun:test";
import { orchestrateRounds } from "../../src/orchestrator";
import { sessions } from "../../src/session";
import { registry } from "../../src/adapters/registry";
import { MockAdapter } from "./helpers/mock-adapter";
import { SAMPLE_ASSERTION } from "./helpers/fixtures";

describe("arena_challenge integration", () => {
  beforeAll(() => {
    registry.register(new MockAdapter({ id: "defender", response: "I defend this assertion" }));
    registry.register(new MockAdapter({ id: "challenger1", response: "I challenge this" }));
    registry.register(new MockAdapter({ id: "challenger2", response: "I also challenge" }));
  });

  test("should_include_defender_in_all_rounds", async () => {
    const defender = "defender";
    const challengers = ["challenger1", "challenger2"];
    const allAgents = [defender, ...challengers];

    const session = sessions.create("challenge", allAgents, {
      assertion: SAMPLE_ASSERTION,
      defender,
      challengers,
    });

    await orchestrateRounds(
      allAgents,
      2,
      "sequential",
      (agentId, round) => ({
        prompt: `Round ${round}: ${SAMPLE_ASSERTION}`,
        timeout_ms: 5000,
      }),
      (round, responses) => sessions.addRound(session.id, responses)
    );

    const result = sessions.get(session.id);
    expect(result.rounds.length).toBe(2);

    // Defender should be in every round
    for (const round of result.rounds) {
      const defenderResponse = round.responses.find((r) => r.agent === defender);
      expect(defenderResponse).toBeDefined();
    }
  });

  test("should_work_without_defender", async () => {
    const challengers = ["challenger1", "challenger2"];

    const session = sessions.create("challenge", challengers, {
      assertion: SAMPLE_ASSERTION,
      challengers,
    });

    await orchestrateRounds(
      challengers,
      1,
      "parallel",
      (agentId) => ({
        prompt: SAMPLE_ASSERTION,
        timeout_ms: 5000,
      }),
      (round, responses) => sessions.addRound(session.id, responses)
    );

    const result = sessions.get(session.id);
    expect(result.rounds.length).toBe(1);
    expect(result.rounds[0].responses.length).toBe(2);
  });

  test("should_store_challenge_metadata", async () => {
    const metadata = {
      assertion: SAMPLE_ASSERTION,
      defender: "defender",
      challengers: ["challenger1"],
      evidence: "Some evidence",
    };

    const session = sessions.create("challenge", ["defender", "challenger1"], metadata);

    expect(session.metadata.assertion).toBe(SAMPLE_ASSERTION);
    expect(session.metadata.defender).toBe("defender");
    expect(session.metadata.challengers).toEqual(["challenger1"]);
    expect(session.metadata.evidence).toBe("Some evidence");
  });
});
