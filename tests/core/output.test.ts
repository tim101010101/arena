import { describe, test, expect } from "bun:test";
import { formatChallengeTranscript } from "../../src/core/output";
import type { ChallengeResult } from "../../src/core/challenge";

const sample: ChallengeResult = {
  fighters: [
    { id: "claude#0", model: "claude", position: "微服务派" },
    { id: "codex#1", model: "codex", position: "单体派" },
  ],
  rounds: [
    [
      { content: "解耦优势...", agent: "claude#0", latency_ms: 1200 },
      { content: "运维成本...", agent: "codex#1", latency_ms: 900 },
    ],
    [
      { content: "回应运维...", agent: "claude#0", latency_ms: 1100 },
      { content: "回应解耦...", agent: "codex#1", latency_ms: 950 },
    ],
  ],
};

describe("formatChallengeTranscript", () => {
  test("should include each fighter's position in a roster header", () => {
    const out = formatChallengeTranscript(sample);
    expect(out).toContain("微服务派");
    expect(out).toContain("单体派");
  });

  test("should include each round in order", () => {
    const out = formatChallengeTranscript(sample);
    expect(out.indexOf("Round 1")).toBeLessThan(out.indexOf("Round 2"));
  });

  test("should include all response content", () => {
    const out = formatChallengeTranscript(sample);
    expect(out).toContain("解耦优势");
    expect(out).toContain("运维成本");
    expect(out).toContain("回应运维");
    expect(out).toContain("回应解耦");
  });

  test("should label each response with its position (not raw fighter id)", () => {
    const out = formatChallengeTranscript(sample);
    expect(out).toContain("微服务派");
    expect(out).toContain("单体派");
  });

  test("should render error messages when a response failed", () => {
    const broken: ChallengeResult = {
      fighters: [
        { id: "a#0", model: "a", position: "p1" },
        { id: "b#1", model: "b", position: "p2" },
      ],
      rounds: [[
        { content: "ok", agent: "a#0", latency_ms: 5 },
        { content: "", agent: "b#1", latency_ms: 0, error: "boom" },
      ]],
    };
    const out = formatChallengeTranscript(broken);
    expect(out).toContain("boom");
  });
});
