import type { ModelConfig } from "./schema";
import type { ScenarioConfig } from "./scenarios";
import type { UserConfig, UserScenarioConfig } from "./user-schema";
import { BUILTIN_DEFAULTS } from "./defaults";
import { BUILTIN_SCENARIOS } from "./scenarios";

export interface ResolvedConfig {
  models: Record<string, ModelConfig>;
  scenarios: Record<string, ScenarioConfig>;
  timeout_ms?: number;
}

export function resolveConfig(user: UserConfig | null): ResolvedConfig {
  const models = mergeModels(user);
  const scenarios = mergeScenarios(user);
  return {
    models,
    scenarios,
    timeout_ms: user?.defaults?.timeout_ms,
  };
}

function mergeModels(user: UserConfig | null): Record<string, ModelConfig> {
  const out: Record<string, ModelConfig> = { ...BUILTIN_DEFAULTS };
  const userModels = user?.defaults?.models;
  if (!userModels) return out;
  for (const [id, cfg] of Object.entries(userModels)) {
    out[id] = {
      enabled: cfg.enabled !== false,
      bin: cfg.bin,
      model: cfg.model,
      env: cfg.env ?? {},
      command: cfg.command,
      prompt_assembly: cfg.prompt_assembly,
      history_entry: cfg.history_entry,
    };
  }
  return out;
}

function mergeScenarios(user: UserConfig | null): Record<string, ScenarioConfig> {
  const out: Record<string, ScenarioConfig> = { ...BUILTIN_SCENARIOS };
  const userScenarios = user?.scenarios;
  if (!userScenarios) return out;

  const all: Record<string, UserScenarioConfig | ScenarioConfig> = {
    ...BUILTIN_SCENARIOS,
    ...userScenarios,
  };

  for (const name of Object.keys(userScenarios)) {
    out[name] = resolveOne(name, all, new Set());
  }
  return out;
}

function resolveOne(
  name: string,
  all: Record<string, UserScenarioConfig | ScenarioConfig>,
  visiting: Set<string>,
): ScenarioConfig {
  if (visiting.has(name)) {
    throw new Error(`scenario inheritance cycle: ${[...visiting, name].join(" -> ")}`);
  }
  const node = all[name];
  if (!node) throw new Error(`scenario not found: ${name}`);

  let base: ScenarioConfig | null = null;
  if ("inherits" in node && node.inherits) {
    const parentName = node.inherits;
    base = resolveOne(parentName, all, new Set([...visiting, name]));
  }

  return mergeScenarioFields(base, node);
}

function mergeScenarioFields(
  base: ScenarioConfig | null,
  node: UserScenarioConfig | ScenarioConfig,
): ScenarioConfig {
  const positions_from = node.positions_from ?? base?.positions_from;
  if (!positions_from) {
    throw new Error("scenario missing positions_from");
  }

  const prompts = node.prompts
    ? {
        system: node.prompts.system,
        round: node.prompts.round,
        history_entry: node.prompts.history_entry ?? base?.prompts.history_entry ?? "[{{agent}}]: {{content}}",
      }
    : base!.prompts;

  return {
    positions_from,
    default_rounds: node.default_rounds ?? base?.default_rounds,
    default_mode: node.default_mode ?? base?.default_mode,
    default_focus: node.default_focus ?? base?.default_focus,
    focus_positions: node.focus_positions ?? base?.focus_positions,
    prompts,
  };
}
