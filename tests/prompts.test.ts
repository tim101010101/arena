import { describe, test, expect } from "bun:test";
import {
  debateSystemPrompt,
  debateRoundPrompt,
  reviewSystemPrompt,
  reviewPrompt,
  challengeSystemPrompt,
  challengeRoundPrompt,
  judgeSystemPrompt,
  judgePrompt,
} from "../src/prompts";

describe("debateSystemPrompt", () => {
  test("should include agent name", () => {
    const prompt = debateSystemPrompt("claude");
    expect(prompt).toContain('"claude"');
    expect(prompt).toContain("multi-agent debate arena");
  });

  test("should include position when provided", () => {
    const prompt = debateSystemPrompt("codex", "tabs are better");
    expect(prompt).toContain("Your assigned position: tabs are better");
  });

  test("should not mention assigned position when not provided", () => {
    const prompt = debateSystemPrompt("claude");
    expect(prompt).not.toContain("Your assigned position");
  });
});

describe("debateRoundPrompt", () => {
  test("should include topic and round number", () => {
    const prompt = debateRoundPrompt("tabs vs spaces", 2, []);
    expect(prompt).toContain("Topic: tabs vs spaces");
    expect(prompt).toContain("Round: 2");
  });

  test("should include context when provided", () => {
    const prompt = debateRoundPrompt("topic", 1, [], "additional context");
    expect(prompt).toContain("Context:\nadditional context");
  });

  test("should include history when provided", () => {
    const history = [
      { role: "agent" as const, agent: "claude", content: "I think tabs" },
      { role: "agent" as const, agent: "codex", content: "I prefer spaces" },
    ];
    const prompt = debateRoundPrompt("topic", 2, history);
    expect(prompt).toContain("Previous responses:");
    expect(prompt).toContain("[claude]: I think tabs");
    expect(prompt).toContain("[codex]: I prefer spaces");
    expect(prompt).toContain("Build on previous points");
  });

  test("should not mention history when empty", () => {
    const prompt = debateRoundPrompt("topic", 1, []);
    expect(prompt).not.toContain("Previous");
  });
});

describe("reviewSystemPrompt", () => {
  test("should include agent name and focus", () => {
    const prompt = reviewSystemPrompt("claude", "security");
    expect(prompt).toContain('"claude"');
    expect(prompt).toContain("Focus on: security");
  });

  test("should expand 'all' focus", () => {
    const prompt = reviewSystemPrompt("codex", "all");
    expect(prompt).toContain("bugs, security issues, performance problems, and readability");
  });
});

describe("reviewPrompt", () => {
  test("should include code", () => {
    const prompt = reviewPrompt("const x = 1;");
    expect(prompt).toContain("Review the following code:");
    expect(prompt).toContain("const x = 1;");
  });

  test("should include context when provided", () => {
    const prompt = reviewPrompt("code", "this is legacy code");
    expect(prompt).toContain("Additional context: this is legacy code");
  });

  test("should include JSON schema when jsonOutput is true", () => {
    const prompt = reviewPrompt("code", undefined, true);
    expect(prompt).toContain("Return findings as JSON:");
    expect(prompt).toContain('"severity"');
    expect(prompt).toContain('"category"');
  });

  test("should not mention JSON when jsonOutput is false", () => {
    const prompt = reviewPrompt("code", undefined, false);
    expect(prompt).not.toContain("JSON");
  });
});

describe("challengeSystemPrompt", () => {
  test("should create defender prompt", () => {
    const prompt = challengeSystemPrompt("claude", "defender");
    expect(prompt).toContain('"claude"');
    expect(prompt).toContain("defending an assertion");
    expect(prompt).toContain("Defend the assertion");
  });

  test("should create challenger prompt", () => {
    const prompt = challengeSystemPrompt("codex", "challenger");
    expect(prompt).toContain('"codex"');
    expect(prompt).toContain("challenging an assertion");
    expect(prompt).toContain("Find counterexamples");
  });
});

describe("challengeRoundPrompt", () => {
  test("should include assertion and round", () => {
    const prompt = challengeRoundPrompt("tabs are better", undefined, 1, []);
    expect(prompt).toContain("Assertion: tabs are better");
    expect(prompt).toContain("Round: 1");
  });

  test("should include evidence when provided", () => {
    const prompt = challengeRoundPrompt("assertion", "Linux uses tabs", 1, []);
    expect(prompt).toContain("Supporting evidence: Linux uses tabs");
  });

  test("should include context when provided", () => {
    const prompt = challengeRoundPrompt("assertion", undefined, 1, [], "context info");
    expect(prompt).toContain("Context: context info");
  });

  test("should include history", () => {
    const history = [
      { role: "agent" as const, agent: "defender", content: "tabs are semantic" },
      { role: "agent" as const, agent: "challenger", content: "but spaces are consistent" },
    ];
    const prompt = challengeRoundPrompt("assertion", undefined, 2, history);
    expect(prompt).toContain("Previous arguments:");
    expect(prompt).toContain("[defender]: tabs are semantic");
    expect(prompt).toContain("[challenger]: but spaces are consistent");
  });
});

describe("judgeSystemPrompt", () => {
  test("should include agent name and evaluation criteria", () => {
    const prompt = judgeSystemPrompt("claude");
    expect(prompt).toContain('"claude"');
    expect(prompt).toContain("impartial judge");
    expect(prompt).toContain("evidence quality");
  });
});

describe("judgePrompt", () => {
  test("should include transcript", () => {
    const prompt = judgePrompt("Round 1: claude said...");
    expect(prompt).toContain("Evaluate this arena session:");
    expect(prompt).toContain("Round 1: claude said...");
  });

  test("should include custom criteria when provided", () => {
    const prompt = judgePrompt("transcript", ["originality", "depth"]);
    expect(prompt).toContain("Additional evaluation criteria: originality, depth");
  });

  test("should include evaluation structure", () => {
    const prompt = judgePrompt("transcript");
    expect(prompt).toContain("Per-agent scores");
    expect(prompt).toContain("Overall winner");
  });
});
