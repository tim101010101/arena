import { dispatch, type Fighter } from "./dispatch";
import { challengeSystemPrompt, challengeRoundPrompt } from "./prompts";
import { orchestrateRounds, type AgentSlot } from "../orchestrator";
import type { AgentResponse } from "../adapters/base";
import type { HistoryEntry } from "../types";
import { ARENA_TIMEOUT_MS, DEFAULT_ROUNDS } from "../constants";

export interface ChallengeInput {
  context: string;
  positions: string[];
  availableModels: string[];
  models?: string[];
  rounds?: number;
  timeout_ms?: number;
}

export interface ChallengeResult {
  fighters: Fighter[];
  rounds: AgentResponse[][];
}

export async function runChallenge(input: ChallengeInput): Promise<ChallengeResult> {
  if (input.positions.length < 2) {
    throw new Error("challenge requires at least 2 positions");
  }

  const fighters = dispatch(input.positions, input.availableModels, input.models);
  const rounds = input.rounds ?? DEFAULT_ROUNDS;
  const timeout = input.timeout_ms ?? ARENA_TIMEOUT_MS;
  const positionById = new Map(fighters.map((f) => [f.id, f.position]));
  const slots: AgentSlot[] = fighters.map(({ id, model }) => ({ id, model }));

  const transcript = await orchestrateRounds(
    slots,
    rounds,
    "sequential",
    (slot, round, history) => ({
      system: challengeSystemPrompt(positionById.get(slot.id) ?? ""),
      prompt: challengeRoundPrompt(
        input.context,
        round,
        history.map((r): HistoryEntry => ({ role: "agent", agent: r.agent, content: r.content })),
      ),
      timeout_ms: timeout,
    }),
  );

  return { fighters, rounds: transcript };
}
