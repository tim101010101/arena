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

  test("should include the round number", () => {
    const p = scenarioRoundPrompt("ctx", 3, []);
    expect(p).toMatch(/round[\s:]+3/i);
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
});
