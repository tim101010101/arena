import { describe, test, expect } from "bun:test";
import { scenarioSystemPrompt, scenarioRoundPrompt } from "../../src/core/prompts";

describe("scenarioSystemPrompt", () => {
  test("should include the assigned position verbatim", () => {
    const sys = scenarioSystemPrompt("微服务派");
    expect(sys).toContain("微服务派");
  });

  test("should instruct the agent to argue for its position", () => {
    const sys = scenarioSystemPrompt("X");
    expect(sys.toLowerCase()).toMatch(/argue|defend|advocate|position/);
  });

  test("should not embed defender/challenger role distinction", () => {
    const sys = scenarioSystemPrompt("X");
    expect(sys.toLowerCase()).not.toContain("defender");
    expect(sys.toLowerCase()).not.toContain("challenger");
  });
});

describe("scenarioRoundPrompt", () => {
  test("should include context", () => {
    const p = scenarioRoundPrompt("decision X", 1, []);
    expect(p).toContain("decision X");
  });

  test("should include the round number when history is present", () => {
    const p = scenarioRoundPrompt("ctx", 3, [
      { role: "agent", agent: "pro", content: "arg" },
    ]);
    expect(p).toMatch(/round[\s:()]+3/i);
  });

  test("should render history as agent-tagged transcript", () => {
    const p = scenarioRoundPrompt("ctx", 2, [
      { role: "agent", agent: "pro-side", content: "claim A" },
      { role: "agent", agent: "con-side", content: "rebuttal B" },
    ]);
    expect(p).toContain("[pro-side]");
    expect(p).toContain("claim A");
    expect(p).toContain("[con-side]");
    expect(p).toContain("rebuttal B");
  });

  test("should omit history section on first round with no prior responses", () => {
    const p = scenarioRoundPrompt("ctx", 1, []);
    expect(p.toLowerCase()).not.toContain("previous");
  });

  // #1 output_max_words
  test("includes word-limit instruction when output_max_words is set", () => {
    const p = scenarioRoundPrompt("ctx", 1, [], undefined, { output_max_words: 200 });
    expect(p).toContain("Respond in ≤200 words");
  });

  test("omits word-limit instruction when output_max_words is null", () => {
    const p = scenarioRoundPrompt("ctx", 1, [], undefined, { output_max_words: null });
    expect(p).not.toContain("Respond in ≤");
  });

  test("omits word-limit instruction when opts is omitted", () => {
    const p = scenarioRoundPrompt("ctx", 1, []);
    expect(p).not.toContain("Respond in ≤");
  });

  // #3 cache-stable prefix
  test("prefix before 'Previous responses:' is identical across rounds", () => {
    const r1 = { role: "agent" as const, agent: "f1", content: "round 1 response" };
    const r2 = { role: "agent" as const, agent: "f2", content: "round 2 response" };
    const p1 = scenarioRoundPrompt("ctx", 1, []);
    const p2 = scenarioRoundPrompt("ctx", 2, [r1]);
    const p3 = scenarioRoundPrompt("ctx", 3, [r1, r2]);
    const prefix = (s: string) => s.split("Previous responses:")[0].trim();
    expect(prefix(p1)).toBe(prefix(p2));
    expect(prefix(p2)).toBe(prefix(p3));
  });

  test("history content appears in chronological order", () => {
    const r1 = { role: "agent" as const, agent: "f1", content: "first" };
    const r2 = { role: "agent" as const, agent: "f2", content: "second" };
    const p = scenarioRoundPrompt("ctx", 2, [r1, r2]);
    expect(p.indexOf("first")).toBeLessThan(p.indexOf("second"));
  });
});
