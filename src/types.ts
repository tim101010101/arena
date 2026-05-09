import { z } from "zod";

export const ContextSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("raw"), code: z.string() }),
  z.object({ type: z.literal("stdin"), content: z.string() }),
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
