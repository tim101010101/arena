import { dispatch, roundRobin, type Fighter } from "./dispatch";
import { scenarioSystemPrompt, scenarioRoundPrompt } from "./prompts";
import { orchestrateRounds, type AgentSlot } from "../orchestrator";
import type { AgentResponse } from "../adapters/base";
import type { HistoryEntry } from "../types";
import type { ScenarioConfig } from "../config/scenarios";
import { BUILTIN_SCENARIOS } from "../config/scenarios";
import { ARENA_TIMEOUT_MS, DEFAULT_ROUNDS } from "../constants";

export interface ScenarioRunInput {
  context: string;
  positions: string[];
  availableModels: string[];
  models?: string[];
  rounds?: number;
  timeout_ms?: number;
  scenario?: ScenarioConfig;
}

export interface ScenarioResult {
  fighters: Fighter[];
  rounds: AgentResponse[][];
}

export async function runScenario(input: ScenarioRunInput): Promise<ScenarioResult> {
  if (input.positions.length < 2) {
    throw new Error("challenge requires at least 2 positions");
  }

  const scenario = input.scenario ?? BUILTIN_SCENARIOS.challenge;
  const pool = input.models ?? input.availableModels;
  if (pool.length === 0) throw new Error("no available models");
  const fighters = dispatch(input.positions, roundRobin(input.positions.length, pool));
  const rounds = input.rounds ?? scenario.default_rounds ?? DEFAULT_ROUNDS;
  const mode = scenario.default_mode ?? "parallel";
  const timeout = input.timeout_ms ?? ARENA_TIMEOUT_MS;
  const positionById = new Map(fighters.map((f) => [f.id, f.position]));
  const slots: AgentSlot[] = fighters.map(({ id, model }) => ({ id, model }));

  const transcript = await orchestrateRounds(
    slots,
    rounds,
    mode,
    (slot, round, history) => ({
      system: scenarioSystemPrompt(positionById.get(slot.id) ?? "", scenario.prompts),
      prompt: scenarioRoundPrompt(
        input.context,
        round,
        history.map((r): HistoryEntry => ({ role: "agent", agent: r.agent, content: r.content })),
        scenario.prompts,
      ),
      timeout_ms: timeout,
    }),
  );

  return { fighters, rounds: transcript };
}
