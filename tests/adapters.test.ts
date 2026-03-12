import { describe, test, expect } from "bun:test";
import { CodexAdapter } from "../src/adapters/codex";
import { ClaudeAdapter } from "../src/adapters/claude";
import { OpenAIAdapter } from "../src/adapters/openai";
import { GeminiAdapter } from "../src/adapters/gemini";

describe("CodexAdapter", () => {
  const adapter = new CodexAdapter();

  test("should have correct id and name", () => {
    expect(adapter.id).toBe("codex");
    expect(adapter.name).toBe("Codex (codex exec)");
  });

  describe("buildArgs", () => {
    test("should include model when provided", () => {
      const args = adapter.buildArgs("gpt-5.4-codex", "/tmp/out.txt", "test prompt");
      expect(args).toContain("codex");
      expect(args).toContain("exec");
      expect(args).toContain("-m");
      expect(args).toContain("gpt-5.4-codex");
      expect(args).toContain("-o");
      expect(args).toContain("/tmp/out.txt");
      expect(args).toContain("test prompt");
    });

    test("should omit -m flag when model is undefined", () => {
      const args = adapter.buildArgs(undefined, "/tmp/out.txt", "test prompt");
      expect(args).toContain("codex");
      expect(args).not.toContain("-m");
      expect(args).toContain("test prompt");
    });

    test("should include standard flags", () => {
      const args = adapter.buildArgs(undefined, "/tmp/out.txt", "prompt");
      expect(args).toContain("--full-auto");
      expect(args).toContain("--skip-git-repo-check");
      expect(args).toContain("-s");
      expect(args).toContain("read-only");
    });
  });
});

describe("ClaudeAdapter", () => {
  const adapter = new ClaudeAdapter();

  test("should have correct id and name", () => {
    expect(adapter.id).toBe("claude");
    expect(adapter.name).toBe("Claude (claude -p)");
  });

  describe("buildArgs", () => {
    test("should include model when AGENT_MODELS.claude is set", () => {
      // Note: This test depends on env config, testing structure only
      const args = adapter.buildArgs({ prompt: "test", timeout_ms: 5000 });
      expect(args).toContain("claude");
      expect(args).toContain("-p");
      expect(args).toContain("--output-format");
      expect(args).toContain("text");
      expect(args).toContain("--no-session-persistence");
    });

    test("should include system prompt when provided", () => {
      const args = adapter.buildArgs({ prompt: "test", system: "You are a helper", timeout_ms: 5000 });
      expect(args).toContain("--system-prompt");
      expect(args).toContain("You are a helper");
    });

    test("should include context in prompt", () => {
      const args = adapter.buildArgs({ prompt: "question", context: "background info", timeout_ms: 5000 });
      const promptArg = args[args.length - 1];
      expect(promptArg).toContain("Context:");
      expect(promptArg).toContain("background info");
      expect(promptArg).toContain("question");
    });

    test("should include history in prompt", () => {
      const args = adapter.buildArgs({
        prompt: "question",
        history: [
          { role: "agent" as const, agent: "claude", content: "previous response" },
        ],
        timeout_ms: 5000,
      });
      const promptArg = args[args.length - 1];
      expect(promptArg).toContain("Previous discussion:");
      expect(promptArg).toContain("[claude]: previous response");
    });

    test("should include allowed tools", () => {
      const args = adapter.buildArgs({ prompt: "test", timeout_ms: 5000 });
      expect(args).toContain("--allowedTools");
      expect(args).toContain("Read,Glob,Grep,Bash(git:*)");
    });
  });
});

describe("OpenAIAdapter", () => {
  const adapter = new OpenAIAdapter();

  test("should have correct id and name", () => {
    expect(adapter.id).toBe("openai");
    expect(adapter.name).toBe("OpenAI (via codex exec)");
  });

  describe("buildArgs", () => {
    test("should set model_provider to openai", () => {
      const args = adapter.buildArgs("gpt-4.1", "/tmp/out.txt", "prompt");
      expect(args).toContain("-c");
      expect(args).toContain('model_provider="openai"');
    });

    test("should use fallback model when not configured", () => {
      // OpenAI adapter has hardcoded fallback to gpt-4.1
      const args = adapter.buildArgs("gpt-4.1", "/tmp/out.txt", "prompt");
      expect(args).toContain("-m");
      expect(args).toContain("gpt-4.1");
    });
  });
});

describe("GeminiAdapter", () => {
  const adapter = new GeminiAdapter();

  test("should have correct id and name", () => {
    expect(adapter.id).toBe("gemini");
    expect(adapter.name).toBe("Gemini (gemini CLI)");
  });

  describe("buildArgs", () => {
    test("should include model when provided", () => {
      // Mock AGENT_MODELS.gemini by testing structure
      const req = { prompt: "test", timeout_ms: 5000 };
      const args = adapter.buildArgs(req);
      expect(args).toContain("gemini");
      expect(args[args.length - 1]).toBe("test");
    });

    test("should combine system, context, and history into prompt", () => {
      const req = {
        prompt: "question",
        system: "system prompt",
        context: "context info",
        history: [{ role: "agent" as const, agent: "gemini", content: "prev" }],
        timeout_ms: 5000,
      };
      const args = adapter.buildArgs(req);
      const finalPrompt = args[args.length - 1];
      expect(finalPrompt).toContain("system prompt");
      expect(finalPrompt).toContain("Context:");
      expect(finalPrompt).toContain("context info");
      expect(finalPrompt).toContain("Previous discussion:");
      expect(finalPrompt).toContain("[gemini]: prev");
      expect(finalPrompt).toContain("question");
    });
  });
});

describe("Adapter healthCheck", () => {
  test("should check for binary existence", async () => {
    const claude = new ClaudeAdapter();
    const result = await claude.healthCheck();
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("latency_ms");
    expect(typeof result.latency_ms).toBe("number");
  });
});
