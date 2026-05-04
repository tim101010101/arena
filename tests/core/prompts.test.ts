import { describe, test, expect } from "bun:test";
import { challengeSystemPrompt, challengeRoundPrompt } from "../../src/core/prompts";

describe("challengeSystemPrompt", () => {
  test("should include the assigned position verbatim", () => {
    const sys = challengeSystemPrompt("微服务派");
    expect(sys).toContain("微服务派");
  });

  test("should instruct the agent to argue for its position", () => {
    const sys = challengeSystemPrompt("X");
    expect(sys.toLowerCase()).toMatch(/argue|defend|advocate|position/);
  });

  test("should not embed defender/challenger role distinction", () => {
    const sys = challengeSystemPrompt("X");
    expect(sys.toLowerCase()).not.toContain("defender");
    expect(sys.toLowerCase()).not.toContain("challenger");
  });
});

describe("challengeRoundPrompt", () => {
  test("should include context", () => {
    const p = challengeRoundPrompt("decision X", 1, []);
    expect(p).toContain("decision X");
  });

  test("should include the round number", () => {
    const p = challengeRoundPrompt("ctx", 3, []);
    expect(p).toMatch(/round[\s:]+3/i);
  });

  test("should render history as agent-tagged transcript", () => {
    const p = challengeRoundPrompt("ctx", 2, [
      { role: "agent", agent: "pro-side", content: "claim A" },
      { role: "agent", agent: "con-side", content: "rebuttal B" },
    ]);
    expect(p).toContain("[pro-side]");
    expect(p).toContain("claim A");
    expect(p).toContain("[con-side]");
    expect(p).toContain("rebuttal B");
  });

  test("should omit history section on first round with no prior responses", () => {
    const p = challengeRoundPrompt("ctx", 1, []);
    expect(p.toLowerCase()).not.toContain("previous");
  });
});
