import { describe, test, expect, beforeAll } from "bun:test";
import { buildArgsFor } from "../src/adapters/build-args";
import { registry } from "../src/adapters/registry";
import { registerAllAdapters } from "../src/adapters/register-all";
import { setActiveModels, BUILTIN_DEFAULTS } from "../src/config/defaults";

beforeAll(() => {
  setActiveModels({ ...BUILTIN_DEFAULTS });
  registerAllAdapters({ force: true });
});

describe("buildArgsFor — codex profile", () => {
  test("should include model when provided via config", () => {
    const args = buildArgsFor("codex", { prompt: "test prompt", timeout_ms: 5000 }, "/tmp/out.txt");
    expect(args).toContain("codex");
    expect(args).toContain("exec");
    expect(args).toContain("-o");
    expect(args).toContain("/tmp/out.txt");
    expect(args).toContain("test prompt");
  });

  test("should include standard flags", () => {
    const args = buildArgsFor("codex", { prompt: "prompt", timeout_ms: 5000 }, "/tmp/out.txt");
    expect(args).toContain("--full-auto");
    expect(args).toContain("--skip-git-repo-check");
    expect(args).toContain("-s");
    expect(args).toContain("read-only");
  });
});

describe("buildArgsFor — claude profile", () => {
  test("should include -p and standard flags", () => {
    const args = buildArgsFor("claude", { prompt: "test", timeout_ms: 5000 });
    expect(args).toContain("claude");
    expect(args).toContain("-p");
    expect(args).toContain("--output-format");
    expect(args).toContain("text");
    expect(args).toContain("--no-session-persistence");
  });

  test("should include system prompt when provided", () => {
    const args = buildArgsFor("claude", { prompt: "test", system: "You are a helper", timeout_ms: 5000 });
    expect(args).toContain("--system-prompt");
    expect(args).toContain("You are a helper");
  });

  test("should include context in prompt", () => {
    const args = buildArgsFor("claude", { prompt: "question", context: "background info", timeout_ms: 5000 });
    const promptArg = args[args.length - 1];
    expect(promptArg).toContain("Context:");
    expect(promptArg).toContain("background info");
    expect(promptArg).toContain("question");
  });

  test("should include history in prompt", () => {
    const args = buildArgsFor("claude", {
      prompt: "question",
      history: [{ role: "agent" as const, agent: "claude", content: "previous response" }],
      timeout_ms: 5000,
    });
    const promptArg = args[args.length - 1];
    expect(promptArg).toContain("Previous discussion:");
    expect(promptArg).toContain("[claude]: previous response");
  });

  test("should include allowed tools", () => {
    const args = buildArgsFor("claude", { prompt: "test", timeout_ms: 5000 });
    expect(args).toContain("--allowedTools");
    expect(args).toContain("Read,Glob,Grep,Bash(git:*)");
  });
});

describe("buildArgsFor — openai profile", () => {
  test("should set model_provider to openai via codex binary", () => {
    const args = buildArgsFor("openai", { prompt: "p", timeout_ms: 5_000 }, "/tmp/o.txt");
    expect(args[0]).toBe("codex");
    expect(args).toContain('model_provider="openai"');
  });

  test("should include model flag", () => {
    const args = buildArgsFor("openai", { prompt: "p", timeout_ms: 5_000 }, "/tmp/out.txt");
    expect(args).toContain("-m");
    expect(args).toContain("gpt-4.1");
  });
});

describe("buildArgsFor — gemini profile", () => {
  test("should start with gemini and end with prompt", () => {
    const args = buildArgsFor("gemini", { prompt: "test", timeout_ms: 5000 });
    expect(args).toContain("gemini");
    expect(args[args.length - 1]).toBe("test");
  });

  test("should combine system, context, and history into prompt", () => {
    const args = buildArgsFor("gemini", {
      prompt: "question",
      system: "system prompt",
      context: "context info",
      history: [{ role: "agent" as const, agent: "gemini", content: "prev" }],
      timeout_ms: 5000,
    });
    const finalPrompt = args[args.length - 1];
    expect(finalPrompt).toContain("system prompt");
    expect(finalPrompt).toContain("Context:");
    expect(finalPrompt).toContain("context info");
    expect(finalPrompt).toContain("Previous discussion:");
    expect(finalPrompt).toContain("[gemini]: prev");
    expect(finalPrompt).toContain("question");
  });
});

describe("buildArgsFor — kimi profile", () => {
  test("should include quiet, yolo flags and pass prompt via -p", () => {
    const args = buildArgsFor("kimi", { prompt: "test", timeout_ms: 5000 });
    expect(args[0]).toBe("kimi");
    expect(args).toContain("--quiet");
    expect(args).toContain("--yolo");
    expect(args).toContain("-p");
    expect(args[args.length - 1]).toBe("test");
  });
});

describe("registry — profile sharing", () => {
  test("openai profile argv contains model_provider=\"openai\" via codex binary", () => {
    const args = buildArgsFor("openai", { prompt: "p", timeout_ms: 5_000 }, "/tmp/o.txt");
    expect(args[0]).toBe("codex");
    expect(args).toContain('model_provider="openai"');
  });

  test("openai and codex are distinct profiles sharing the codex binary", () => {
    const a = registry.get("openai");
    const b = registry.get("codex");
    expect(a).not.toBe(b);
    expect((a as any).binary.bin).toBe("codex");
    expect((b as any).binary.bin).toBe("codex");
  });
});

describe("Adapter healthCheck", () => {
  test("should check for binary existence", async () => {
    const result = await registry.get("claude").healthCheck();
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("latency_ms");
    expect(typeof result.latency_ms).toBe("number");
  });
});
