import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { registry } from "../../src/adapters/registry";
import { registerAllAdapters } from "../../src/adapters/register-all";
import { runScenario } from "../../src/core/scenario";
import { reviewPositions } from "../../src/core/review";
import { availableModels } from "../../src/core/availability";
import { acquireContext } from "../../src/context";
import { formatTranscript } from "../../src/core/output";
import type { Case } from "./schema";
import type { RawOutput } from "./schema";

export interface ExecuteOptions {
  case: Case;
  caseRelPath: string;
  runId: string;
  outPath: string;
  onlyModels?: string[];
}

export async function executeCase(opts: ExecuteOptions): Promise<RawOutput> {
  registerAllAdapters();
  const startedAt = new Date().toISOString();
  const checks = await registry.healthCheckAll();
  let available = availableModels(checks);
  if (opts.onlyModels?.length) {
    const allow = new Set(opts.onlyModels);
    const missing = opts.onlyModels.filter((m) => !available.includes(m));
    if (missing.length) {
      throw new Error(`--only-models contains unhealthy/unknown adapters: ${missing.join(", ")}`);
    }
    available = available.filter((m) => allow.has(m));
  }
  if (available.length === 0) {
    throw new Error(
      "No agent CLIs available. Run `bun src/index.ts health` to inspect adapter status.",
    );
  }

  let context: string;
  let positions: string[];

  if (opts.case.kind === "challenge") {
    context = opts.case.context;
    positions = opts.case.positions;
  } else {
    const acquired = await acquireContext(opts.case.sources);
    context = acquired.content;
    positions = reviewPositions(opts.case.focus);
  }

  const result = await runScenario({
    context,
    positions,
    availableModels: available,
    models: opts.case.models,
    rounds: opts.case.rounds,
    timeout_ms: opts.case.timeout_ms,
  });

  const positionById = new Map(result.fighters.map((f) => [f.id, f.position]));
  const modelById = new Map(result.fighters.map((f) => [f.id, f.model]));

  const rounds = result.rounds.map((round) =>
    round.map((r) => ({
      agent: r.agent,
      position: positionById.get(r.agent) ?? r.agent,
      model: modelById.get(r.agent) ?? "?",
      content: r.content,
      latency_ms: r.latency_ms,
      ...(r.error ? { error: r.error } : {}),
    })),
  );

  const errors: { agent: string; round: number; message: string }[] = [];
  let totalLatency = 0;
  for (let i = 0; i < rounds.length; i++) {
    for (const r of rounds[i]) {
      totalLatency += r.latency_ms;
      if (r.error) errors.push({ agent: r.agent, round: i + 1, message: r.error });
    }
  }

  const finishedAt = new Date().toISOString();

  const raw: RawOutput = {
    case_id: opts.case.id,
    case_path: opts.caseRelPath,
    kind: opts.case.kind,
    run_id: opts.runId,
    fighters: result.fighters.map((f) => ({ id: f.id, model: f.model, position: f.position })),
    rounds,
    formatted_transcript: formatTranscript(result),
    structural: {
      rounds_completed: rounds.length,
      errors,
      total_latency_ms: totalLatency,
    },
    meta: {
      started_at: startedAt,
      finished_at: finishedAt,
      arena_models_used: [...new Set(result.fighters.map((f) => f.model))],
    },
  };

  await mkdir(dirname(opts.outPath), { recursive: true });
  await writeFile(opts.outPath, JSON.stringify(raw, null, 2), "utf8");
  return raw;
}
