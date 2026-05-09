import { z } from "zod";

const ArgTokenSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.object({
      if: z.string().min(1),
      then: z.array(ArgTokenSchema).min(1),
    }),
  ]),
);

const ModelCommandSchema = z.object({
  args: z.array(ArgTokenSchema).min(1),
  output: z.discriminatedUnion("via", [
    z.object({ via: z.literal("stdout") }),
    z.object({ via: z.literal("file") }),
  ]),
});

export const ModelConfigSchema = z.object({
  enabled: z.boolean().optional(),
  bin: z.string().min(1),
  model: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  command: ModelCommandSchema,
  prompt_assembly: z.string(),
  history_entry: z.string(),
});

export const ScenarioPromptsSchema = z.object({
  system: z.string(),
  round: z.string(),
  history_entry: z.string().optional(),
});

export const ScenarioConfigSchema = z
  .object({
    inherits: z.string().min(1).optional(),
    positions_from: z.enum(["args", "focus"]).optional(),
    default_rounds: z.number().int().min(1).max(20).optional(),
    default_mode: z.enum(["sequential", "parallel"]).optional(),
    default_focus: z.array(z.string().min(1)).optional(),
    focus_positions: z.record(z.string().min(1), z.string().min(1)).optional(),
    models: z.record(z.string().min(1), ModelConfigSchema.partial()).optional(),
    prompts: ScenarioPromptsSchema.optional(),
  })
  .refine((s) => s.inherits || (s.positions_from && s.prompts), {
    message: "scenario without 'inherits' must declare both 'positions_from' and 'prompts'",
  });

export const UserConfigSchema = z.object({
  version: z.literal(1),
  defaults: z
    .object({
      timeout_ms: z.number().int().min(1000).max(600_000).optional(),
      models: z.record(z.string().min(1), ModelConfigSchema).optional(),
    })
    .optional(),
  scenarios: z.record(z.string().min(1), ScenarioConfigSchema).optional(),
});

export type UserConfig = z.infer<typeof UserConfigSchema>;
export type UserScenarioConfig = z.infer<typeof ScenarioConfigSchema>;
