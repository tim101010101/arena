import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import { buildToolsForScenarios, handleMcpCall } from "../../src/core/mcp";
import { registry } from "../../src/adapters/registry";
import { MockAdapter } from "../integration/helpers/mock-adapter";
import type { ScenarioConfig } from "../../src/config/scenarios";
import { BUILTIN_SCENARIOS } from "../../src/config/scenarios";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ARGS_SCENARIO: ScenarioConfig = {
  positions_from: "args",
  default_rounds: 2,
  prompts: { system: "{{position}}", round: "{{context}}", history_entry: "[{{agent}}]: {{content}}" },
};

const FOCUS_SCENARIO_WITH_POSITIONS: ScenarioConfig = {
  positions_from: "focus",
  default_focus: ["bugs", "security"],
  focus_positions: {
    bugs: "Hostile reviewer hunting for bugs.",
    security: "Adversarial security auditor.",
  },
  prompts: { system: "{{position}}", round: "{{context}}", history_entry: "[{{agent}}]: {{content}}" },
};

const FOCUS_SCENARIO_NO_POSITIONS: ScenarioConfig = {
  positions_from: "focus",
  prompts: { system: "{{position}}", round: "{{context}}", history_entry: "[{{agent}}]: {{content}}" },
};

// ---------------------------------------------------------------------------
// buildToolsForScenarios
// ---------------------------------------------------------------------------

describe("buildToolsForScenarios", () => {
  test("empty scenarios produces only health tool", () => {
    const tools = buildToolsForScenarios({});
    expect(tools).toHaveLength(1);
    expect((tools[0] as { name: string }).name).toBe("health");
  });

  test("health tool has empty inputSchema properties", () => {
    const tools = buildToolsForScenarios({});
    const health = tools[0] as { name: string; inputSchema: { type: string; properties: object } };
    expect(health.inputSchema.type).toBe("object");
    expect(health.inputSchema.properties).toEqual({});
  });

  test("args scenario produces correct schema shape", () => {
    const tools = buildToolsForScenarios({ challenge: ARGS_SCENARIO });
    const tool = tools[0] as {
      name: string;
      description: string;
      inputSchema: { required: string[]; properties: Record<string, unknown> };
    };
    expect(tool.name).toBe("challenge");
    expect(tool.description).toContain('"challenge"');
    expect(tool.inputSchema.required).toEqual(["context", "positions"]);
    expect(tool.inputSchema.properties.context).toBeDefined();
    expect(tool.inputSchema.properties.positions).toBeDefined();
    expect(tool.inputSchema.properties.rounds).toBeDefined();
    expect(tool.inputSchema.properties.models).toBeDefined();
  });

  test("args scenario positions schema has minItems 2", () => {
    const tools = buildToolsForScenarios({ challenge: ARGS_SCENARIO });
    const tool = tools[0] as { inputSchema: { properties: { positions: { minItems: number } } } };
    expect(tool.inputSchema.properties.positions.minItems).toBe(2);
  });

  test("focus scenario produces correct schema shape", () => {
    const tools = buildToolsForScenarios({ review: FOCUS_SCENARIO_WITH_POSITIONS });
    const tool = tools[0] as {
      name: string;
      description: string;
      inputSchema: { required: string[]; properties: Record<string, unknown> };
    };
    expect(tool.name).toBe("review");
    expect(tool.description).toContain('"review"');
    expect(tool.inputSchema.required).toEqual(["sources"]);
    expect(tool.inputSchema.properties.sources).toBeDefined();
    expect(tool.inputSchema.properties.focus).toBeDefined();
    expect(tool.inputSchema.properties.rounds).toBeDefined();
    expect(tool.inputSchema.properties.models).toBeDefined();
  });

  test("focus scenario with focus_positions emits enum in focus items", () => {
    const tools = buildToolsForScenarios({ review: FOCUS_SCENARIO_WITH_POSITIONS });
    const tool = tools[0] as {
      inputSchema: { properties: { focus: { items: { enum: string[] } } } };
    };
    expect(tool.inputSchema.properties.focus.items.enum).toEqual(["bugs", "security"]);
  });

  test("focus scenario without focus_positions emits undefined enum", () => {
    const tools = buildToolsForScenarios({ review: FOCUS_SCENARIO_NO_POSITIONS });
    const tool = tools[0] as {
      inputSchema: { properties: { focus: { items: { enum: undefined } } } };
    };
    expect(tool.inputSchema.properties.focus.items.enum).toBeUndefined();
  });

  test("focus description includes focus key names when present", () => {
    const tools = buildToolsForScenarios({ review: FOCUS_SCENARIO_WITH_POSITIONS });
    const tool = tools[0] as {
      inputSchema: { properties: { focus: { description: string } } };
    };
    expect(tool.inputSchema.properties.focus.description).toContain("bugs");
    expect(tool.inputSchema.properties.focus.description).toContain("security");
  });

  test("sources schema includes all five oneOf variants", () => {
    const tools = buildToolsForScenarios({ review: FOCUS_SCENARIO_WITH_POSITIONS });
    const tool = tools[0] as {
      inputSchema: { properties: { sources: { items: { oneOf: unknown[] } } } };
    };
    expect(tool.inputSchema.properties.sources.items.oneOf).toHaveLength(5);
  });

  test("multiple scenarios produce N + 1 tools (health appended last)", () => {
    const tools = buildToolsForScenarios({
      challenge: ARGS_SCENARIO,
      review: FOCUS_SCENARIO_WITH_POSITIONS,
    });
    expect(tools).toHaveLength(3);
    expect((tools[tools.length - 1] as { name: string }).name).toBe("health");
  });

  test("builtin scenarios produce challenge, review, health tools", () => {
    const tools = buildToolsForScenarios(BUILTIN_SCENARIOS);
    const names = tools.map((t) => (t as { name: string }).name);
    expect(names).toContain("challenge");
    expect(names).toContain("review");
    expect(names).toContain("health");
  });
});

// ---------------------------------------------------------------------------
// handleMcpCall — unit-level with MockAdapters in registry
// ---------------------------------------------------------------------------

describe("handleMcpCall", () => {
  beforeAll(() => {
    registry.register(new MockAdapter({ id: "mcp-a", response: "response from mcp-a" }));
    registry.register(new MockAdapter({ id: "mcp-b", response: "response from mcp-b" }));
  });

  // --- health ---

  test("health returns JSON of health check results", async () => {
    const result = await handleMcpCall("health", {}, {});
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveProperty("mcp-a");
    expect(parsed["mcp-a"].ok).toBe(true);
  });

  // --- unknown scenario ---

  test("unknown scenario name returns isError", async () => {
    const result = await handleMcpCall("does-not-exist", {}, BUILTIN_SCENARIOS);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown scenario");
  });

  // --- no available models ---

  test("returns isError when no models are available", async () => {
    registry.register(new MockAdapter({ id: "dead-model", healthy: false }));
    // use a scenarios map that ONLY has dead-model visible — but actually
    // registry.healthCheckAll will return all registered adapters.
    // We need a scenario but all adapters are healthy except dead-model.
    // Simplest: register a temporarily-unhealthy-only registry isn't
    // possible without isolation, so we test via a separate registry approach.
    // Instead, directly test the error path by passing an empty registry state
    // via mocking — or verify via the thrown error message text.
    const unhealthyRegistry = {
      healthCheckAll: async () => ({ "dead-model": { ok: false, latency_ms: 1 } }),
    };
    // Patch registry temporarily
    const original = registry.healthCheckAll.bind(registry);
    (registry as unknown as { healthCheckAll: () => Promise<Record<string, unknown>> }).healthCheckAll =
      unhealthyRegistry.healthCheckAll;
    try {
      const result = await handleMcpCall("challenge", {}, { challenge: ARGS_SCENARIO });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("no agent CLIs available");
    } finally {
      (registry as unknown as { healthCheckAll: () => unknown }).healthCheckAll = original;
    }
  });

  // --- args scenario ---

  test("args scenario runs and returns transcript", async () => {
    const result = await handleMcpCall(
      "challenge",
      {
        context: "REST vs GraphQL",
        positions: ["REST supporter", "GraphQL supporter"],
        rounds: 1,
        models: ["mcp-a", "mcp-b"],
      },
      { challenge: ARGS_SCENARIO },
    );
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text.length).toBeGreaterThan(0);
  });

  test("args scenario transcript contains position labels", async () => {
    const result = await handleMcpCall(
      "challenge",
      {
        context: "monolith vs microservices",
        positions: ["Monolith派", "微服务派"],
        rounds: 1,
      },
      { challenge: ARGS_SCENARIO },
    );
    expect(result.content[0].text).toContain("Monolith派");
    expect(result.content[0].text).toContain("微服务派");
  });

  test("args scenario respects optional rounds and models", async () => {
    const result = await handleMcpCall(
      "challenge",
      {
        context: "tabs vs spaces",
        positions: ["tabs", "spaces"],
        rounds: 2,
        models: ["mcp-a"],
      },
      { challenge: ARGS_SCENARIO },
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text.length).toBeGreaterThan(0);
  });

  // --- focus scenario ---

  test("focus scenario runs with raw source and returns transcript", async () => {
    const result = await handleMcpCall(
      "review",
      {
        sources: [{ type: "raw", code: "function add(a,b){return a+b}" }],
        focus: ["bugs", "security"],
        rounds: 1,
      },
      { review: FOCUS_SCENARIO_WITH_POSITIONS },
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text.length).toBeGreaterThan(0);
  });

  test("focus scenario uses default focus when focus omitted", async () => {
    const result = await handleMcpCall(
      "review",
      {
        sources: [{ type: "raw", code: "const x = 1" }],
      },
      { review: FOCUS_SCENARIO_WITH_POSITIONS },
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text.length).toBeGreaterThan(0);
  });

  // --- error propagation ---

  test("exception during run is caught and returned as isError", async () => {
    // reviewPositions throws when an unknown focus key is supplied
    const result = await handleMcpCall(
      "review",
      {
        sources: [{ type: "raw", code: "x" }],
        focus: ["unknown_focus_key", "another_unknown"],
      },
      { review: FOCUS_SCENARIO_WITH_POSITIONS },
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("unknown focus");
  });

  test("non-Error exception is stringified in error response", async () => {
    const original = registry.healthCheckAll.bind(registry);
    (registry as unknown as { healthCheckAll: () => unknown }).healthCheckAll = async () => {
      throw "string error";
    };
    try {
      const result = await handleMcpCall("challenge", {}, { challenge: ARGS_SCENARIO });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("string error");
    } finally {
      (registry as unknown as { healthCheckAll: () => unknown }).healthCheckAll = original;
    }
  });
});
