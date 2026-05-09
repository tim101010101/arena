import type { ScenarioResult } from "./scenario";

export function formatTranscript(result: ScenarioResult): string {
  const positionById = new Map(result.fighters.map((f) => [f.id, f.position]));
  const modelById = new Map(result.fighters.map((f) => [f.id, f.model]));

  const lines: string[] = ["# Arena Challenge", "", "## Fighters"];
  for (const f of result.fighters) {
    lines.push(`- **${f.position}** — ${f.model} (${f.id})`);
  }
  lines.push("");

  for (let i = 0; i < result.rounds.length; i++) {
    lines.push(`## Round ${i + 1}`);
    for (const r of result.rounds[i]) {
      const position = positionById.get(r.agent) ?? r.agent;
      const model = modelById.get(r.agent) ?? "?";
      lines.push(`### ${position} — ${model} (${r.latency_ms}ms)`);
      lines.push(r.error ? `**Error**: ${r.error}` : r.content);
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}
