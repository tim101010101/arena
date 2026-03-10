import { describe, test, expect, beforeAll } from "bun:test";
import { registry } from "../src/adapters/registry";
import { ClaudeAdapter } from "../src/adapters/claude";
import { CodexAdapter } from "../src/adapters/codex";
import { GeminiAdapter } from "../src/adapters/gemini";
import { OpenAIAdapter } from "../src/adapters/openai";
import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "../src/adapters/base";

class MockAdapter implements AgentAdapter {
  readonly id: string;
  readonly name: string;
  private healthy: boolean;

  constructor(id: string, healthy = true) {
    this.id = id;
    this.name = `Mock ${id}`;
    this.healthy = healthy;
  }

  async healthCheck(): Promise<HealthResult> {
    return { ok: this.healthy, latency_ms: 1, error: this.healthy ? undefined : "mock error" };
  }

  async execute(req: AgentRequest): Promise<AgentResponse> {
    return { content: `mock response from ${this.id}`, agent: this.id, latency_ms: 1 };
  }
}

// Register adapters (normally done in index.ts)
beforeAll(() => {
  if (!registry.has("claude")) registry.register(new ClaudeAdapter());
  if (!registry.has("codex")) registry.register(new CodexAdapter());
  if (!registry.has("gemini")) registry.register(new GeminiAdapter());
  if (!registry.has("openai")) registry.register(new OpenAIAdapter());
});

describe("AdapterRegistry", () => {
  test("should register and retrieve adapters", () => {
    expect(registry.has("claude")).toBe(true);
    expect(registry.has("codex")).toBe(true);
    expect(registry.has("gemini")).toBe(true);
    expect(registry.has("openai")).toBe(true);
  });

  test("should throw on unknown agent", () => {
    expect(() => registry.get("nonexistent")).toThrow('Unknown agent: "nonexistent"');
  });

  test("should list all registered agents", () => {
    const list = registry.list();
    expect(list).toContain("claude");
    expect(list).toContain("codex");
    expect(list).toContain("gemini");
    expect(list).toContain("openai");
  });

  test("should register and use mock adapter", () => {
    const mock = new MockAdapter("mock-test");
    registry.register(mock);
    expect(registry.has("mock-test")).toBe(true);
    expect(registry.get("mock-test").name).toBe("Mock mock-test");
  });
});
