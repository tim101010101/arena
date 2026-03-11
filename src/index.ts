import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  DebateInputSchema, ReviewInputSchema, ChallengeInputSchema,
  JudgeInputSchema, HealthInputSchema,
} from "./types";
import type { HistoryEntry } from "./types";
import type { AgentResponse } from "./adapters/base";
import { registry } from "./adapters/registry";
import { ClaudeAdapter } from "./adapters/claude";
import { CodexAdapter } from "./adapters/codex";
import { GeminiAdapter } from "./adapters/gemini";
import { OpenAIAdapter } from "./adapters/openai";
import { orchestrateRounds, orchestrate } from "./orchestrator";
import { sessions } from "./session";
import { acquireContext } from "./context";
import { errorResult } from "./utils";
import { ARENA_TIMEOUT_MS, DEFAULT_ROUNDS, DEFAULT_MODE } from "./constants";
import {
  debateSystemPrompt, debateRoundPrompt,
  reviewSystemPrompt, reviewPrompt,
  challengeSystemPrompt, challengeRoundPrompt,
  judgeSystemPrompt, judgePrompt,
} from "./prompts";
import {
  formatDebateTranscript, formatReviewOutput, formatChallengeTranscript,
} from "./output";

// Register all adapters
registry.register(new ClaudeAdapter());
registry.register(new CodexAdapter());
registry.register(new GeminiAdapter());
registry.register(new OpenAIAdapter());

const server = new McpServer({ name: "arena", version: "0.1.0" });

// --- arena_health ---
server.tool(
  "arena_health",
  "Check all registered agents' CLI availability.",
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

// --- arena_debate ---
server.tool(
  "arena_debate",
  "Multi-agent debate with assigned positions. Agents argue across rounds, seeing each other's previous responses.",
  DebateInputSchema.shape,
  async (input) => {
    try {
      const rounds = input.rounds ?? DEFAULT_ROUNDS;
      const mode = input.mode ?? DEFAULT_MODE;
      const session = sessions.create("debate", input.agents, {
        topic: input.topic,
        positions: input.positions,
      });

      await orchestrateRounds(
        input.agents,
        rounds,
        mode,
        (agentId, round, history) => ({
          system: debateSystemPrompt(agentId, input.positions?.[agentId]),
          prompt: debateRoundPrompt(
            input.topic,
            round,
            history.map((r): HistoryEntry => ({ role: "agent", agent: r.agent, content: r.content })),
            input.context,
          ),
          timeout_ms: ARENA_TIMEOUT_MS,
        }),
        (round, responses) => sessions.addRound(session.id, responses),
      );

      const updated = sessions.get(session.id);
      return { content: [{ type: "text", text: formatDebateTranscript(updated) }] };
    } catch (err) {
      return errorResult(err);
    }
  },
);

// --- arena_review ---
server.tool(
  "arena_review",
  "Multiple agents review the same code in parallel. Findings aggregated per agent.",
  ReviewInputSchema.shape,
  async (input) => {
    try {
      const focus = input.focus ?? "all";
      const format = input.output_format ?? "prose";

      // Acquire context once, share to all agents
      let contextContent = input.context ?? "";
      if (input.sources?.length) {
        const acquired = await acquireContext(input.sources);
        contextContent = acquired.content + (contextContent ? `\n\n${contextContent}` : "");
      }

      const result = await orchestrate({
        agents: input.agents,
        mode: "parallel",
        buildRequest: (agentId) => ({
          system: reviewSystemPrompt(agentId, focus),
          prompt: reviewPrompt(contextContent, undefined, format === "json"),
          timeout_ms: ARENA_TIMEOUT_MS,
        }),
      });

      return { content: [{ type: "text", text: formatReviewOutput(result.responses, format) }] };
    } catch (err) {
      return errorResult(err);
    }
  },
);

// --- arena_challenge ---
server.tool(
  "arena_challenge",
  "One assertion, multiple challengers red-team it. Optional defender.",
  ChallengeInputSchema.shape,
  async (input) => {
    try {
      const rounds = input.rounds ?? DEFAULT_ROUNDS;
      const allAgents = input.defender
        ? [input.defender, ...input.challengers]
        : input.challengers;

      const session = sessions.create("challenge", allAgents, {
        assertion: input.assertion,
        defender: input.defender,
        challengers: input.challengers,
      });

      await orchestrateRounds(
        allAgents,
        rounds,
        "sequential",
        (agentId, round, history) => {
          const role = agentId === input.defender ? "defender" as const : "challenger" as const;
          return {
            system: challengeSystemPrompt(agentId, role),
            prompt: challengeRoundPrompt(
              input.assertion,
              input.evidence,
              round,
              history.map((r): HistoryEntry => ({ role: "agent", agent: r.agent, content: r.content })),
              input.context,
            ),
            timeout_ms: ARENA_TIMEOUT_MS,
          };
        },
        (round, responses) => sessions.addRound(session.id, responses),
      );

      const updated = sessions.get(session.id);
      return { content: [{ type: "text", text: formatChallengeTranscript(updated) }] };
    } catch (err) {
      return errorResult(err);
    }
  },
);

// --- arena_judge ---
server.tool(
  "arena_judge",
  "Neutral agent evaluates a completed arena session.",
  JudgeInputSchema.shape,
  async (input) => {
    try {
      const session = sessions.get(input.session_id);
      const adapter = registry.get(input.judge);

      // Build transcript from session
      let transcript: string;
      if (session.tool === "debate") {
        transcript = formatDebateTranscript(session);
      } else if (session.tool === "challenge") {
        transcript = formatChallengeTranscript(session);
      } else {
        transcript = JSON.stringify(session, null, 2);
      }

      const response = await adapter.execute({
        system: judgeSystemPrompt(input.judge),
        prompt: judgePrompt(transcript, input.criteria),
        timeout_ms: ARENA_TIMEOUT_MS,
      });

      if (response.error) {
        return errorResult(new Error(response.error));
      }

      return { content: [{ type: "text", text: response.content }] };
    } catch (err) {
      return errorResult(err);
    }
  },
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[arena] server running on stdio (v0.1.0)");
