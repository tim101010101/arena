import type { HistoryEntry } from "./types";

export function debateSystemPrompt(agent: string, position?: string): string {
  const parts = [
    `You are "${agent}" in a multi-agent debate arena.`,
    "Argue your position clearly and concisely. Cite specific evidence.",
    "Respond to other agents' arguments directly. Be constructive but critical.",
  ];
  if (position) parts.push(`Your assigned position: ${position}`);
  return parts.join("\n");
}

export function debateRoundPrompt(
  topic: string, round: number, history: HistoryEntry[], context?: string,
): string {
  const parts = [`Topic: ${topic}`, `Round: ${round}`, ""];
  if (context) parts.push(`Context:\n${context}`, "");
  if (history.length) {
    parts.push("Previous responses:");
    for (const h of history) parts.push(`[${h.agent ?? h.role}]: ${h.content}`);
    parts.push("", "Build on previous points. Avoid repetition. Deepen the analysis.");
  }
  return parts.join("\n");
}

export function reviewSystemPrompt(agent: string, focus: string): string {
  const focusText = focus === "all"
    ? "bugs, security issues, performance problems, and readability"
    : focus;
  return [
    `You are "${agent}" performing a code review in a multi-agent arena.`,
    `Focus on: ${focusText}`,
    "Be specific — cite file paths, line numbers, and concrete evidence.",
    "Suggest fixes for each issue found.",
  ].join("\n");
}

export function reviewPrompt(code: string, context?: string, jsonOutput?: boolean): string {
  const parts = ["Review the following code:", "", code];
  if (context) parts.push("", `Additional context: ${context}`);
  if (jsonOutput) {
    parts.push("", "Return findings as JSON:", `{"findings":[{"severity":"critical|high|medium|low|info","category":"bug|security|performance|readability","file":"...","line":0,"evidence":"...","suggestion":"..."}],"summary":"..."}`);
  }
  return parts.join("\n");
}

export function challengeSystemPrompt(agent: string, role: "challenger" | "defender"): string {
  if (role === "defender") {
    return [
      `You are "${agent}" defending an assertion in a multi-agent challenge arena.`,
      "Defend the assertion with evidence, logic, and concrete examples.",
      "Address each challenger's counterarguments directly.",
    ].join("\n");
  }
  return [
    `You are "${agent}" challenging an assertion in a multi-agent arena.`,
    "Find counterexamples, edge cases, and overlooked trade-offs.",
    "Be specific — cite concrete evidence and real-world scenarios.",
  ].join("\n");
}

export function challengeRoundPrompt(
  assertion: string, evidence: string | undefined, round: number,
  history: HistoryEntry[], context?: string,
): string {
  const parts = [`Assertion: ${assertion}`, `Round: ${round}`];
  if (evidence) parts.push(`Supporting evidence: ${evidence}`);
  if (context) parts.push(`Context: ${context}`);
  if (history.length) {
    parts.push("", "Previous arguments:");
    for (const h of history) parts.push(`[${h.agent ?? h.role}]: ${h.content}`);
    parts.push("", "Respond to the latest arguments. Find new angles.");
  }
  return parts.join("\n");
}

export function judgeSystemPrompt(agent: string): string {
  return [
    `You are "${agent}" serving as an impartial judge in a multi-agent arena.`,
    "Evaluate each participant's arguments objectively.",
    "Score on: evidence quality, logical coherence, constructiveness, and persuasiveness.",
  ].join("\n");
}

export function judgePrompt(transcript: string, criteria?: string[]): string {
  const parts = ["Evaluate this arena session:", "", transcript, ""];
  if (criteria?.length) {
    parts.push(`Additional evaluation criteria: ${criteria.join(", ")}`, "");
  }
  parts.push(
    "Provide:",
    "1. Per-agent scores (1-10) with justification",
    "2. Key strengths and weaknesses of each agent",
    "3. Overall winner and reasoning",
    "4. Areas of consensus and unresolved disagreements",
  );
  return parts.join("\n");
}
