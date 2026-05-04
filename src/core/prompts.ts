import type { HistoryEntry } from "../types";

export function challengeSystemPrompt(position: string): string {
  return [
    `You are an agent in a position-driven adversarial arena.`,
    `Your assigned position: ${position}`,
    `Argue for your position rigorously. Cite concrete evidence and edge cases.`,
    `Engage directly with opposing positions — find weaknesses, propose counterexamples.`,
    `Be specific. Avoid generalities.`,
  ].join("\n");
}

export function challengeRoundPrompt(
  context: string,
  round: number,
  history: HistoryEntry[],
): string {
  const parts = [
    `Subject under review:`,
    context,
    ``,
    `Round: ${round}`,
  ];
  if (history.length) {
    parts.push(``, `Previous responses:`);
    for (const h of history) parts.push(`[${h.agent ?? h.role}]: ${h.content}`);
    parts.push(``, `Respond from your assigned position. Address the latest opposing arguments directly.`);
  }
  return parts.join("\n");
}
