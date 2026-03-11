import { z } from "zod";

const ConfigSchema = z.object({
  timeout_ms: z.number().int().min(1000).max(600_000),
  health_check_timeout_ms: z.number().int().min(1000).max(60_000),
  default_rounds: z.number().int().min(1).max(10),
  default_mode: z.enum(["sequential", "parallel"]),
  max_context_size: z.number().int().min(100_000).max(10_000_000),
  models: z.object({
    claude: z.string().min(1).optional(),
    codex: z.string().min(1).optional(),
    gemini: z.string().min(1).optional(),
    openai: z.string().min(1).optional(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

function parseEnv(): Config {
  const raw = {
    timeout_ms: process.env.ARENA_TIMEOUT_MS ? Number(process.env.ARENA_TIMEOUT_MS) : 120_000,
    health_check_timeout_ms: 15_000,
    default_rounds: process.env.ARENA_DEFAULT_ROUNDS ? Number(process.env.ARENA_DEFAULT_ROUNDS) : 3,
    default_mode: process.env.ARENA_DEFAULT_MODE || "parallel",
    max_context_size: process.env.ARENA_MAX_CONTEXT_SIZE ? Number(process.env.ARENA_MAX_CONTEXT_SIZE) : 1_000_000,
    models: {
      claude: process.env.ARENA_CLAUDE_MODEL !== undefined ? (process.env.ARENA_CLAUDE_MODEL === "" ? "" : process.env.ARENA_CLAUDE_MODEL) : undefined,
      codex: process.env.ARENA_CODEX_MODEL !== undefined ? (process.env.ARENA_CODEX_MODEL === "" ? "" : process.env.ARENA_CODEX_MODEL) : undefined,
      gemini: process.env.ARENA_GEMINI_MODEL !== undefined ? (process.env.ARENA_GEMINI_MODEL === "" ? "" : process.env.ARENA_GEMINI_MODEL) : undefined,
      openai: process.env.ARENA_OPENAI_MODEL !== undefined ? (process.env.ARENA_OPENAI_MODEL === "" ? "" : process.env.ARENA_OPENAI_MODEL) : undefined,
    },
  };

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    console.error(`[arena] Invalid config:\n${errors}`);
    process.exit(1);
  }
  return result.data;
}

export const config = parseEnv();

export const ARENA_TIMEOUT_MS = config.timeout_ms;
export const HEALTH_CHECK_TIMEOUT_MS = config.health_check_timeout_ms;
export const DEFAULT_ROUNDS = config.default_rounds;
export const DEFAULT_MODE = config.default_mode;
export const MAX_CONTEXT_SIZE = config.max_context_size;
export const AGENT_MODELS = config.models;
