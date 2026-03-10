import { describe, test, expect } from "bun:test";
import { parseStructuredOutput, formatDebateTranscript, formatReviewOutput } from "../src/output";
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

  test("should fallback to prose", () => {
    const raw = "This is just plain text review";
    const result = parseStructuredOutput(raw);
    expect(result.findings).toEqual([]);
    expect(result.summary).toBe(raw);
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

  test("should handle error responses", () => {
    const responses = [
      { content: "", agent: "gemini", latency_ms: 0, error: "CLI not found" },
    ];
    const output = formatReviewOutput(responses, "prose");
    expect(output).toContain("**Error**: CLI not found");
  });
});
