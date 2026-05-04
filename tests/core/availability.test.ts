import { describe, test, expect } from "bun:test";
import { availableModels } from "../../src/core/availability";
import type { HealthResult } from "../../src/adapters/base";

describe("availableModels", () => {
  test("should return only models with ok health", () => {
    const checks: Record<string, HealthResult> = {
      claude: { ok: true, latency_ms: 1 },
      codex: { ok: false, error: "not found", latency_ms: 1 },
      gemini: { ok: true, latency_ms: 1 },
    };
    expect(availableModels(checks).sort()).toEqual(["claude", "gemini"]);
  });

  test("should return empty when none are healthy", () => {
    const checks: Record<string, HealthResult> = {
      claude: { ok: false, error: "x", latency_ms: 1 },
    };
    expect(availableModels(checks)).toEqual([]);
  });
});
