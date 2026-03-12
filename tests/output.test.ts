import { describe, test, expect } from "bun:test";
import { parseStructuredOutput, formatDebateTranscript, formatReviewOutput, formatChallengeTranscript } from "../src/output";
import type { Session } from "../src/session";

describe("parseStructuredOutput", () => {
  test("should parse JSON from markdown code block", () => {
    const raw = 'Some text\n```json\n{"findings":[{"severity":"high","category":"bug","evidence":"test","suggestion":"fix"}],"summary":"found bugs"}\n```\nMore text';
    const result = parseStructuredOutput(raw);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe("high");
    expect(result.summary).toBe("found bugs");
  });

  test("should parse direct JSON", () => {
    const raw = '{"findings":[{"severity":"low","category":"readability","evidence":"e","suggestion":"s"}]}';
    const result = parseStructuredOutput(raw);
    expect(result.findings).toHaveLength(1);
  });

  test("should fallback to prose on invalid JSON", () => {
    const raw = "This is just plain text review";
    const result = parseStructuredOutput(raw);
    expect(result.findings).toEqual([]);
    expect(result.summary).toBe(raw);
  });

  test("should handle malformed JSON in code block", () => {
    const raw = "```json\n{invalid}\n```";
    const result = parseStructuredOutput(raw);
    expect(result.findings).toEqual([]);
  });

  test("should handle JSON without findings array", () => {
    const raw = '{"findings":[],"summary":"no issues found"}';
    const result = parseStructuredOutput(raw);
    expect(result.findings).toEqual([]);
    expect(result.summary).toBe("no issues found");
  });
});

describe("formatDebateTranscript", () => {
  test("should format session into markdown", () => {
    const session: Session = {
      id: "arena-test-123",
      tool: "debate",
      agents: ["claude", "codex"],
      created_at: Date.now(),
      metadata: { topic: "REST vs GraphQL" },
      rounds: [{
        round: 1,
        responses: [
          { content: "REST is simpler", agent: "claude", model: "sonnet", latency_ms: 500 },
          { content: "GraphQL is flexible", agent: "codex", model: "gpt-5", latency_ms: 600 },
        ],
      }],
    };
    const output = formatDebateTranscript(session);
    expect(output).toContain("# Arena Debate: REST vs GraphQL");
    expect(output).toContain("## Round 1");
    expect(output).toContain("### claude (sonnet)");
    expect(output).toContain("REST is simpler");
    expect(output).toContain("### codex (gpt-5)");
    expect(output).toContain("GraphQL is flexible");
    expect(output).toContain("arena-test-123");
  });

  test("should show error in response", () => {
    const session: Session = {
      id: "arena-err",
      tool: "debate",
      agents: ["claude"],
      created_at: Date.now(),
      rounds: [{ round: 1, responses: [{ content: "", agent: "claude", latency_ms: 100, error: "timeout" }] }],
    };
    expect(formatDebateTranscript(session)).toContain("**Error**: timeout");
  });

  test("should omit model from header when not present", () => {
    const session: Session = {
      id: "arena-nomodel",
      tool: "debate",
      agents: ["claude"],
      created_at: Date.now(),
      rounds: [{ round: 1, responses: [{ content: "hi", agent: "claude", latency_ms: 50 }] }],
    };
    const output = formatDebateTranscript(session);
    expect(output).toContain("### claude — 50ms");
    expect(output).not.toContain("claude (");
  });
});

describe("formatReviewOutput", () => {
  test("should format prose output", () => {
    const responses = [
      { content: "Found a bug in line 5", agent: "claude", latency_ms: 100 },
      { content: "Looks good to me", agent: "codex", latency_ms: 200 },
    ];
    const output = formatReviewOutput(responses, "prose");
    expect(output).toContain("# Arena Code Review");
    expect(output).toContain("## claude");
    expect(output).toContain("Found a bug in line 5");
    expect(output).toContain("## codex");
  });

  test("should format JSON output with parsed findings", () => {
    const responses = [
      { content: '{"findings":[{"severity":"high","category":"bug","evidence":"e","suggestion":"s"}]}', agent: "claude", latency_ms: 100 },
    ];
    const output = formatReviewOutput(responses, "json");
    const parsed = JSON.parse(output);
    expect(parsed.agents).toHaveLength(1);
    expect(parsed.agents[0].findings).toHaveLength(1);
  });

  test("should handle error responses in prose", () => {
    const responses = [{ content: "", agent: "gemini", latency_ms: 0, error: "CLI not found" }];
    expect(formatReviewOutput(responses, "prose")).toContain("**Error**: CLI not found");
  });

  test("should handle error responses in JSON", () => {
    const responses = [{ content: "", agent: "gemini", latency_ms: 0, error: "CLI not found" }];
    const parsed = JSON.parse(formatReviewOutput(responses, "json"));
    expect(parsed.agents[0].findings).toEqual([]);
    expect(parsed.agents[0].raw).toBe("CLI not found");
  });
});

describe("formatChallengeTranscript", () => {
  test("should label defender and challengers", () => {
    const session: Session = {
      id: "arena-challenge-1",
      tool: "challenge",
      agents: ["claude", "codex"],
      created_at: Date.now(),
      metadata: { assertion: "TypeScript is better than JavaScript", defender: "claude", challengers: ["codex"] },
      rounds: [{
        round: 1,
        responses: [
          { content: "TS adds safety", agent: "claude", latency_ms: 1000 },
          { content: "JS is more flexible", agent: "codex", latency_ms: 1100 },
        ],
      }],
    };
    const output = formatChallengeTranscript(session);
    expect(output).toContain("# Arena Challenge: TypeScript is better than JavaScript");
    expect(output).toContain("Defender: claude");
    expect(output).toContain("Challengers: codex");
    expect(output).toContain("🛡️ Defender: claude");
    expect(output).toContain("⚔️ Challenger: codex");
    expect(output).toContain("_Session: arena-challenge-1_");
  });
});
