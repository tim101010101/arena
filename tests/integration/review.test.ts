import { describe, test, expect, beforeAll, afterEach } from "bun:test";
import { orchestrate } from "../../src/orchestrator";
import { registry } from "../../src/adapters/registry";
import { acquireContext } from "../../src/context";
import { formatReviewOutput } from "../../src/output";
import { MockAdapter } from "./helpers/mock-adapter";
import { SAMPLE_CODE } from "./helpers/fixtures";

describe("arena_review integration", () => {
  beforeAll(() => {
    registry.register(new MockAdapter({ id: "reviewer1", response: "No issues found" }));
    registry.register(new MockAdapter({ id: "reviewer2", response: "Consider adding error handling" }));
  });

  test("should_orchestrate_multiple_reviewers", async () => {
    const result = await orchestrate({
      agents: ["reviewer1", "reviewer2"],
      mode: "parallel",
      buildRequest: (agentId) => ({
        prompt: `Review this code: ${SAMPLE_CODE}`,
        timeout_ms: 5000,
      }),
    });

    expect(result.responses).toHaveLength(2);
    expect(result.responses[0].content).toBe("No issues found");
    expect(result.responses[1].content).toBe("Consider adding error handling");
    expect(result.failed).toEqual([]);
  });

  test("should_acquire_context_from_raw_code", async () => {
    const context = await acquireContext([
      { type: "raw", code: SAMPLE_CODE },
    ]);

    expect(context.content).toBe(SAMPLE_CODE);
    expect(context.metadata.source_type).toBe("raw");
    expect(context.metadata.size_bytes).toBe(SAMPLE_CODE.length);
  });

  test("should_format_review_output_as_prose", () => {
    const responses = [
      { agent: "reviewer1", content: "Looks good", latency_ms: 100 },
      { agent: "reviewer2", content: "Add tests", latency_ms: 150 },
    ];

    const output = formatReviewOutput(responses, "prose");

    expect(output).toContain("# Arena Code Review");
    expect(output).toContain("reviewer1");
    expect(output).toContain("Looks good");
    expect(output).toContain("reviewer2");
    expect(output).toContain("Add tests");
  });

  test("should_format_review_output_as_json", () => {
    const responses = [
      { agent: "reviewer1", content: "No issues", latency_ms: 100 },
    ];

    const output = formatReviewOutput(responses, "json");
    const parsed = JSON.parse(output);

    expect(parsed.agents).toHaveLength(1);
    expect(parsed.agents[0].agent).toBe("reviewer1");
  });
});
