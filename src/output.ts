import { z } from "zod";
import type { AgentResponse } from "./adapters/base";
import type { Session } from "./session";

export const FindingSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  category: z.enum(["bug", "security", "performance", "readability"]),
  file: z.string().optional(),
  line: z.number().optional(),
  evidence: z.string(),
  suggestion: z.string(),
});

export type Finding = z.infer<typeof FindingSchema>;

export interface AgentFindings {
  agent: string;
  findings: Finding[];
  summary?: string;
  raw?: string;
}

export function parseStructuredOutput(raw: string): { findings: Finding[]; summary?: string } {
  const jsonMatch = raw.match(/```json\s*\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return { findings: parsed.findings || [], summary: parsed.summary };
    } catch { /* fall through */ }
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.findings)) return { findings: parsed.findings, summary: parsed.summary };
  } catch { /* fall through */ }
  return { findings: [], summary: raw };
}

export function formatDebateTranscript(session: Session): string {
  const lines: string[] = [`# Arena Debate: ${session.metadata?.topic ?? ""}`, ""];
  for (const round of session.rounds) {
    lines.push(`## Round ${round.round}`);
    for (const r of round.responses) {
      lines.push(`### ${r.agent}${r.model ? ` (${r.model})` : ""} — ${r.latency_ms}ms`);
      lines.push(r.error ? `**Error**: ${r.error}` : r.content);
      lines.push("");
    }
  }
  lines.push(`_Session: ${session.id}_`);
  return lines.join("\n");
}

export function formatReviewOutput(responses: AgentResponse[], format: "prose" | "json"): string {
  if (format === "json") {
    const agentFindings: AgentFindings[] = responses.map((r) => {
      if (r.error) return { agent: r.agent, findings: [], raw: r.error };
      const parsed = parseStructuredOutput(r.content);
      return { agent: r.agent, ...parsed };
    });
    return JSON.stringify({ agents: agentFindings }, null, 2);
  }

  const lines: string[] = ["# Arena Code Review", ""];
  for (const r of responses) {
    lines.push(`## ${r.agent}${r.model ? ` (${r.model})` : ""} — ${r.latency_ms}ms`);
    lines.push(r.error ? `**Error**: ${r.error}` : r.content);
    lines.push("");
  }
  return lines.join("\n");
}

export function formatChallengeTranscript(session: Session): string {
  const lines: string[] = [
    `# Arena Challenge: ${session.metadata?.assertion ?? ""}`,
    `Defender: ${session.metadata?.defender ?? "none"}`,
    `Challengers: ${(session.metadata?.challengers as string[])?.join(", ") ?? ""}`,
    "",
  ];
  for (const round of session.rounds) {
    lines.push(`## Round ${round.round}`);
    for (const r of round.responses) {
      const role = r.agent === session.metadata?.defender ? "🛡️ Defender" : "⚔️ Challenger";
      lines.push(`### ${role}: ${r.agent} — ${r.latency_ms}ms`);
      lines.push(r.error ? `**Error**: ${r.error}` : r.content);
      lines.push("");
    }
  }
  lines.push(`_Session: ${session.id}_`);
  return lines.join("\n");
}
