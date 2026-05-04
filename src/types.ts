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

export const ChallengeInputSchema = z
  .object({
    context: z.string().min(1),
    positions: z.array(z.string().min(1)).min(2),
    models: z.array(z.string().min(1)).optional(),
    rounds: z.number().int().min(1).max(10).optional(),
  })
  .strict();

export const ReviewInputSchema = z
  .object({
    sources: z.array(ContextSourceSchema).optional(),
    context: z.string().optional(),
    focus: z.array(z.enum(["bugs", "security", "performance", "readability"])).min(1).optional(),
    models: z.array(z.string().min(1)).optional(),
    rounds: z.number().int().min(1).max(10).optional(),
  })
  .strict();

export const HealthInputSchema = z.object({}).strict();

export type ChallengeInput = z.infer<typeof ChallengeInputSchema>;
export type ReviewInput = z.infer<typeof ReviewInputSchema>;
