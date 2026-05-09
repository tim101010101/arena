import type { HistoryEntry } from "../types";
import type { ScenarioPrompts } from "../config/scenarios";
import { BUILTIN_SCENARIOS } from "../config/scenarios";
import { renderString } from "../config/template";

export function challengeSystemPrompt(
  position: string,
  prompts: ScenarioPrompts = BUILTIN_SCENARIOS.challenge.prompts,
): string {
  return renderString(prompts.system, { prompt: "", position });
}

export function challengeRoundPrompt(
  context: string,
  round: number,
  history: HistoryEntry[],
  prompts: ScenarioPrompts = BUILTIN_SCENARIOS.challenge.prompts,
): string {
  const historyStr = history.length
    ? history
        .map((h) =>
          renderString(prompts.history_entry, {
            prompt: "",
            agent: h.agent ?? h.role,
            content: h.content,
          }),
        )
        .join("\n")
    : "";
  return renderString(prompts.round, {
    prompt: "",
    context,
    round: String(round),
    history: historyStr,
  });
}
