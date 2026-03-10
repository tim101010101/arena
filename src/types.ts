import { z } from "zod";

export const ContextSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("raw"), code: z.string() }),
  z.object({ type: z.literal("git_ref"), ref: z.string(), root: z.string().optional() }),
  z.object({ type: z.literal("file_list"), paths: z.array(z.string()), root: z.string().optional() }),
  z.object({ type: z.literal("git_range"), from: z.string(), to: z.string(), root: z.string().optional() }),
  z.object({ type: z.literal("patch_file"), path: z.string() }),
]);

export type ContextSource = z.infer<typeof ContextSourceSchema>;

const HistoryEntrySchema = z.object({
  role: z.enum(["user", "agent"]),
  agent: z.string().optional(),
  content: z.string(),
});

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const DebateInputSchema = z.object({
  topic: z.string(),
  agents: z.array(z.string()).min(2),
  positions: z.record(z.string()).optional(),
  rounds: z.number().min(1).max(10).optional(),
  context: z.string().optional(),
  mode: z.enum(["sequential", "parallel"]).optional(),
});

export const ReviewInputSchema = z.object({
  sources: z.array(ContextSourceSchema).optional(),
  agents: z.array(z.string()).min(1),
  focus: z.enum(["bugs", "security", "performance", "all"]).optional(),
  context: z.string().optional(),
  output_format: z.enum(["prose", "json"]).optional(),
});

export const ChallengeInputSchema = z.object({
  assertion: z.string(),
  evidence: z.string().optional(),
  challengers: z.array(z.string()).min(1),
  defender: z.string().optional(),
  rounds: z.number().min(1).max(10).optional(),
  context: z.string().optional(),
});

export const JudgeInputSchema = z.object({
  session_id: z.string(),
  judge: z.string(),
  criteria: z.array(z.string()).optional(),
});

export const HealthInputSchema = z.object({});

export type DebateInput = z.infer<typeof DebateInputSchema>;
export type ReviewInput = z.infer<typeof ReviewInputSchema>;
export type ChallengeInput = z.infer<typeof ChallengeInputSchema>;
export type JudgeInput = z.infer<typeof JudgeInputSchema>;
