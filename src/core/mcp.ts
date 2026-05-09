import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ScenarioConfig } from "../config/scenarios";
import type { ContextSource } from "../types";
import { registry } from "../adapters/registry";
import { availableModels } from "./availability";
import { runScenario } from "./scenario";
import { reviewPositions } from "./review";
import { formatTranscript } from "./output";
import { acquireContext } from "../context";

export function buildToolsForScenarios(scenarios: Record<string, ScenarioConfig>) {
  const tools: object[] = [];

  for (const [name, scenario] of Object.entries(scenarios)) {
    if (scenario.positions_from === "args") {
      tools.push({
        name,
        description: `Run scenario "${name}" — supply context and opposing positions`,
        inputSchema: {
          type: "object",
          required: ["context", "positions"],
          properties: {
            context: { type: "string", description: "Subject text under debate" },
            positions: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              description: "Opposing positions (min 2)",
            },
            rounds: { type: "number", description: "Number of debate rounds" },
            models: {
              type: "array",
              items: { type: "string" },
              description: "Model names to use (e.g. [\"claude\", \"codex\"])",
            },
          },
        },
      });
    } else {
      const focusKeys = scenario.focus_positions
        ? Object.keys(scenario.focus_positions)
        : [];
      tools.push({
        name,
        description: `Run scenario "${name}" — supply code sources for adversarial review`,
        inputSchema: {
          type: "object",
          required: ["sources"],
          properties: {
            sources: {
              type: "array",
              description: "One or more code sources to review",
              items: {
                oneOf: [
                  {
                    type: "object",
                    required: ["type", "code"],
                    properties: {
                      type: { const: "raw" },
                      code: { type: "string" },
                    },
                  },
                  {
                    type: "object",
                    required: ["type", "ref"],
                    properties: {
                      type: { const: "git_ref" },
                      ref: { type: "string" },
                      root: { type: "string" },
                    },
                  },
                  {
                    type: "object",
                    required: ["type", "from", "to"],
                    properties: {
                      type: { const: "git_range" },
                      from: { type: "string" },
                      to: { type: "string" },
                      root: { type: "string" },
                    },
                  },
                  {
                    type: "object",
                    required: ["type", "paths"],
                    properties: {
                      type: { const: "file_list" },
                      paths: { type: "array", items: { type: "string" } },
                      root: { type: "string" },
                    },
                  },
                  {
                    type: "object",
                    required: ["type", "path"],
                    properties: {
                      type: { const: "patch_file" },
                      path: { type: "string" },
                    },
                  },
                ],
              },
            },
            focus: {
              type: "array",
              items: { type: "string", enum: focusKeys.length ? focusKeys : undefined },
              description: `Review focus areas${focusKeys.length ? ` (${focusKeys.join(", ")})` : ""}`,
            },
            rounds: { type: "number", description: "Number of debate rounds" },
            models: {
              type: "array",
              items: { type: "string" },
              description: "Model names to use",
            },
          },
        },
      });
    }
  }

  tools.push({
    name: "health",
    description: "Check which agent CLIs (claude, codex, gemini, etc.) are available",
    inputSchema: { type: "object", properties: {} },
  });

  return tools;
}

type McpToolResult = {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
};

export async function handleMcpCall(
  name: string,
  args: unknown,
  scenarios: Record<string, ScenarioConfig>,
): Promise<McpToolResult> {
  if (name === "health") {
    const results = await registry.healthCheckAll();
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }

  const scenario = scenarios[name];
  if (!scenario) {
    return {
      isError: true,
      content: [{ type: "text", text: `Unknown scenario: ${name}` }],
    };
  }

  try {
    const checks = await registry.healthCheckAll();
    const available = availableModels(checks);
    if (available.length === 0) {
      throw new Error("no agent CLIs available — run the health tool to inspect");
    }

    let context: string;
    let positions: string[];

    if (scenario.positions_from === "args") {
      const a = args as { context: string; positions: string[]; rounds?: number; models?: string[] };
      context = a.context;
      positions = a.positions;
      const result = await runScenario({
        context,
        positions,
        models: a.models,
        rounds: a.rounds,
        availableModels: available,
        scenario,
      });
      return { content: [{ type: "text", text: formatTranscript(result) }] };
    } else {
      const a = args as { sources: ContextSource[]; focus?: string[]; rounds?: number; models?: string[] };
      const acquired = await acquireContext(a.sources);
      context = acquired.content;
      positions = reviewPositions(a.focus, scenario);
      const result = await runScenario({
        context,
        positions,
        models: a.models,
        rounds: a.rounds,
        availableModels: available,
        scenario,
      });
      return { content: [{ type: "text", text: formatTranscript(result) }] };
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
    };
  }
}

export async function runMcpServer(
  scenarios: Record<string, ScenarioConfig>,
  version: string,
): Promise<void> {
  const server = new Server(
    { name: "arena", version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: buildToolsForScenarios(scenarios),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    return handleMcpCall(name, args, scenarios);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`arena MCP server v${version} started\n`);
}
