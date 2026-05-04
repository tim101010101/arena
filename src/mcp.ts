import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ChallengeInputSchema, ReviewInputSchema, HealthInputSchema } from "./types";
import { registry } from "./adapters/registry";
import { runChallenge } from "./core/challenge";
import { reviewPositions, type ReviewFocus } from "./core/review";
import { availableModels } from "./core/availability";
import { formatChallengeTranscript } from "./core/output";
import { acquireContext } from "./context";
import { errorResult } from "./utils";

export async function runMcp(version: string): Promise<void> {
  const server = new McpServer({ name: "arena", version });

  server.tool(
    "arena_health",
    "Check all registered agent CLIs.",
    HealthInputSchema.shape,
    async () => {
      try {
        const results = await registry.healthCheckAll();
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    "arena_challenge",
    "Run a position-driven adversarial debate. Each position becomes one fighter; arena dispatches models (preferring distinct models, falling back to same model with different system prompts when only one CLI is available). Host provides context + 2+ opposing positions; arena returns the full transcript.",
    ChallengeInputSchema.shape,
    async (input) => {
      try {
        const checks = await registry.healthCheckAll();
        const available = availableModels(checks);
        const result = await runChallenge({
          context: input.context,
          positions: input.positions,
          models: input.models,
          rounds: input.rounds,
          availableModels: available,
        });
        return { content: [{ type: "text", text: formatChallengeTranscript(result) }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    "arena_review",
    "Adversarial code review preset. Spawns attacker fighters (default: bug-hunter + security-auditor) over the supplied code/diff. Thin wrapper over arena_challenge with preset positions.",
    ReviewInputSchema.shape,
    async (input) => {
      try {
        let context = input.context ?? "";
        if (input.sources?.length) {
          const acquired = await acquireContext(input.sources);
          context = acquired.content + (context ? `\n\n${context}` : "");
        }
        if (!context.trim()) {
          throw new Error("arena_review requires either sources or context");
        }

        const checks = await registry.healthCheckAll();
        const available = availableModels(checks);
        const positions = reviewPositions(input.focus as ReviewFocus[] | undefined);
        const result = await runChallenge({
          context,
          positions,
          models: input.models,
          rounds: input.rounds,
          availableModels: available,
        });
        return { content: [{ type: "text", text: formatChallengeTranscript(result) }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[arena] server running on stdio (v${version})`);
}
