export type PositionsFrom = "args" | "focus";

export interface ScenarioPrompts {
  system: string;
  round: string;
  history_entry: string;
}

export interface ScenarioConfig {
  positions_from: PositionsFrom;
  default_rounds?: number;
  default_mode?: "sequential" | "parallel";
  prompts: ScenarioPrompts;
  default_focus?: string[];
  focus_positions?: Record<string, string>;
}

const CHALLENGE_SYSTEM = [
  "You are an agent in a position-driven adversarial arena.",
  "Your assigned position: {{position}}",
  "Argue for your position rigorously. Cite concrete evidence and edge cases.",
  "Engage directly with opposing positions — find weaknesses, propose counterexamples.",
  "Be specific. Avoid generalities.",
].join("\n");

const CHALLENGE_ROUND =
  "Subject under review:\n{{context}}\n\nRespond from your assigned position." +
  "{{#if history}}\n\nPrevious responses:\n{{history}}\n\n" +
  "Address the latest opposing arguments directly. (Round {{round}}){{/if}}" +
  "{{#if output_max_words}}\n\nRespond in ≤{{output_max_words}} words. One paragraph + 3-5 bullet rebuttals. No code unless strictly necessary.{{/if}}";

const CHALLENGE_HISTORY_ENTRY = "[{{agent}}]: {{content}}";

const REVIEW_FOCUS: Record<string, string> = {
  bugs: "Hostile reviewer hunting for bugs and logic errors. Find concrete failure cases the author missed.",
  security: "Adversarial security auditor. Attack the code from a threat model: injection, auth bypass, data leaks, supply chain.",
  performance: "Performance critic. Find hot paths, allocations, blocking calls, and complexity surprises that will hurt at scale.",
  readability: "Maintainer two years from now. Find naming, structure, and coupling that will break the next reader.",
};

export const BUILTIN_SCENARIOS: Record<string, ScenarioConfig> = {
  challenge: {
    positions_from: "args",
    default_rounds: 3,
    default_mode: "parallel",
    prompts: {
      system: CHALLENGE_SYSTEM,
      round: CHALLENGE_ROUND,
      history_entry: CHALLENGE_HISTORY_ENTRY,
    },
  },
  review: {
    positions_from: "focus",
    default_focus: ["bugs", "security"],
    focus_positions: REVIEW_FOCUS,
    prompts: {
      system: CHALLENGE_SYSTEM,
      round: CHALLENGE_ROUND,
      history_entry: CHALLENGE_HISTORY_ENTRY,
    },
  },
};
