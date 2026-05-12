import { describe, test, expect } from "bun:test";
import { AdapterRegistry } from "../../src/adapters/registry";
import { registerAdaptersFromModels } from "../../src/adapters/register-all";
import type { ModelConfig } from "../../src/config/schema";

const BASE_CMD: ModelConfig["command"] = {
  args: ["{{bin}}", "{{prompt}}"],
  output: { via: "stdout" },
};

function makeModel(overrides: Partial<ModelConfig> = {}): ModelConfig {
  return {
    enabled: true,
    bin: "some-cli",
    env: {},
    command: BASE_CMD,
    prompt_assembly: "{{prompt}}",
    history_entry: "[{{agent}}]: {{content}}",
    ...overrides,
  };
}

describe("registerAdaptersFromModels", () => {
  test("should_skip_disabled_models", () => {
    const reg = new AdapterRegistry();
    registerAdaptersFromModels(
      {
        claude: makeModel({ enabled: true, bin: "claude" }),
        openai: makeModel({ enabled: false, bin: "codex" }),
      },
      reg,
    );
    expect(reg.has("claude")).toBe(true);
    expect(reg.has("openai")).toBe(false);
  });

  test("should_register_custom_user_defined_model", () => {
    const reg = new AdapterRegistry();
    registerAdaptersFromModels(
      { glm: makeModel({ enabled: true, bin: "glm-cli" }) },
      reg,
    );
    expect(reg.has("glm")).toBe(true);
  });

  test("should_register_all_enabled_builtin_models", () => {
    const reg = new AdapterRegistry();
    registerAdaptersFromModels(
      {
        claude: makeModel({ enabled: true, bin: "claude" }),
        codex: makeModel({ enabled: true, bin: "codex" }),
        gemini: makeModel({ enabled: true, bin: "gemini" }),
        openai: makeModel({ enabled: true, bin: "codex" }),
        kimi: makeModel({ enabled: true, bin: "kimi" }),
      },
      reg,
    );
    expect(reg.list().sort()).toEqual(["claude", "codex", "gemini", "kimi", "openai"]);
  });

  test("should_register_no_adapters_when_all_disabled", () => {
    const reg = new AdapterRegistry();
    registerAdaptersFromModels(
      {
        claude: makeModel({ enabled: false }),
        openai: makeModel({ enabled: false }),
      },
      reg,
    );
    expect(reg.list()).toHaveLength(0);
  });

  test("should_assign_correct_id_to_custom_adapter", () => {
    const reg = new AdapterRegistry();
    registerAdaptersFromModels(
      { glm: makeModel({ enabled: true, bin: "glm-cli" }) },
      reg,
    );
    const adapter = reg.get("glm");
    expect(adapter.id).toBe("glm");
  });

  test("should_register_both_builtin_and_custom_models_when_all_enabled", () => {
    const reg = new AdapterRegistry();
    registerAdaptersFromModels(
      {
        claude: makeModel({ enabled: true, bin: "claude" }),
        glm: makeModel({ enabled: true, bin: "glm-cli" }),
      },
      reg,
    );
    expect(reg.has("claude")).toBe(true);
    expect(reg.has("glm")).toBe(true);
  });
});
