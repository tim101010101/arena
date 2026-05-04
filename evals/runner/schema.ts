import { z } from "zod";
import { ContextSourceSchema } from "../../src/types";

export const ExpectationSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  required: z.boolean().default(false),
});

export const RubricDimSchema = z.object({
  dim: z.string().min(1),
  description: z.string().min(1),
  min: z.number().int().min(1).max(5),
});

export const BudgetSchema = z.object({
  max_latency_ms: z.number().int().positive().optional(),
  max_rounds_with_errors: z.number().int().min(0).optional(),
});

const BaseCase = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  rounds: z.number().int().min(1).max(10).default(2),
  expectations: z.array(ExpectationSchema).min(1),
  rubric: z.array(RubricDimSchema).min(1),
  budget: BudgetSchema.optional(),
  tags: z.array(z.string()).default([]),
  models: z.array(z.string().min(1)).optional(),
});

export const ChallengeCaseSchema = BaseCase.extend({
  kind: z.literal("challenge"),
  context: z.string().min(1),
  positions: z.array(z.string().min(1)).min(2),
});

export const ReviewCaseSchema = BaseCase.extend({
  kind: z.literal("review"),
  sources: z.array(ContextSourceSchema).min(1),
  focus: z.array(z.enum(["bugs", "security", "performance", "readability"])).min(1),
});

export const CaseSchema = z.discriminatedUnion("kind", [ChallengeCaseSchema, ReviewCaseSchema]);
export type Case = z.infer<typeof CaseSchema>;
export type ChallengeCase = z.infer<typeof ChallengeCaseSchema>;
export type ReviewCase = z.infer<typeof ReviewCaseSchema>;

export const ManifestEntrySchema = z.object({
  path: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export const ManifestSchema = z.object({
  run_defaults: z.object({
    repeats: z.number().int().min(1).max(5).default(1),
    shard_size: z.number().int().min(1).max(20).default(4),
    max_parallel_subagents: z.number().int().min(1).max(8).default(4),
  }),
  cases: z.array(ManifestEntrySchema).min(1),
});
export type Manifest = z.infer<typeof ManifestSchema>;

const FighterSchema = z.object({
  id: z.string(),
  model: z.string(),
  position: z.string(),
});

const RoundEntrySchema = z.object({
  agent: z.string(),
  position: z.string(),
  model: z.string(),
  content: z.string(),
  latency_ms: z.number(),
  error: z.string().optional(),
});

export const RawOutputSchema = z.object({
  case_id: z.string(),
  case_path: z.string(),
  kind: z.enum(["challenge", "review"]),
  run_id: z.string(),
  fighters: z.array(FighterSchema),
  rounds: z.array(z.array(RoundEntrySchema)),
  formatted_transcript: z.string(),
  structural: z.object({
    rounds_completed: z.number().int(),
    errors: z.array(z.object({ agent: z.string(), round: z.number(), message: z.string() })),
    total_latency_ms: z.number(),
  }),
  meta: z.object({
    started_at: z.string(),
    finished_at: z.string(),
    arena_models_used: z.array(z.string()),
  }),
});
export type RawOutput = z.infer<typeof RawOutputSchema>;

export const ExpectationVerdictSchema = z.object({
  id: z.string(),
  verdict: z.enum(["yes", "partial", "no"]),
  evidence: z.string(),
});

export const RubricScoreSchema = z.object({
  dim: z.string(),
  score: z.number().int().min(1).max(5),
  rationale: z.string(),
});

export const JudgedReportSchema = z.object({
  case_id: z.string(),
  run_id: z.string(),
  judge_agent_id: z.string(),
  judge_rubric_hash: z.string(),
  fighters: z.array(FighterSchema),
  expectations: z.array(ExpectationVerdictSchema),
  rubric: z.array(RubricScoreSchema),
  structural: z.object({
    rounds_completed: z.number().int(),
    errors: z.array(z.object({ agent: z.string(), round: z.number(), message: z.string() })),
    total_latency_ms: z.number(),
  }),
  verdict: z.enum(["pass", "fail"]),
  fail_reasons: z.array(z.string()),
  raw_transcript_path: z.string(),
});
export type JudgedReport = z.infer<typeof JudgedReportSchema>;

export const RunSummarySchema = z.object({
  run_id: z.string(),
  generated_at: z.string(),
  git_sha: z.string().optional(),
  judge_rubric_hash: z.string(),
  total_cases: z.number().int(),
  passed: z.number().int(),
  failed: z.number().int(),
  pass_rate: z.number(),
  rubric_means: z.record(z.string(), z.number()),
  by_tag: z.record(
    z.string(),
    z.object({ total: z.number().int(), passed: z.number().int() }),
  ),
  failures: z.array(
    z.object({ case_id: z.string(), reasons: z.array(z.string()) }),
  ),
  case_reports: z.array(z.string()),
});
export type RunSummary = z.infer<typeof RunSummarySchema>;
