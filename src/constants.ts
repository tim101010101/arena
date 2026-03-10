export const ARENA_TIMEOUT_MS = Number(process.env.ARENA_TIMEOUT_MS) || 120_000;
export const HEALTH_CHECK_TIMEOUT_MS = 15_000;
export const DEFAULT_ROUNDS = Number(process.env.ARENA_DEFAULT_ROUNDS) || 3;
export const DEFAULT_MODE = (process.env.ARENA_DEFAULT_MODE as "sequential" | "parallel") || "parallel";

export const AGENT_MODELS: Record<string, string | undefined> = {
  claude: process.env.ARENA_CLAUDE_MODEL,
  codex: process.env.ARENA_CODEX_MODEL,
  gemini: process.env.ARENA_GEMINI_MODEL,
  openai: process.env.ARENA_OPENAI_MODEL,
};
