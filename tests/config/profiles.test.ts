import { test, expect } from "bun:test";
import { BUILTIN_DEFAULTS, setActiveModels } from "../../src/config/defaults";
import { registry } from "../../src/adapters/registry";
import { registerAllAdapters } from "../../src/adapters/register-all";
import { ModelConfigSchema } from "../../src/config/user-schema";
import { assembleCommand } from "../../src/config/assemble";
import type { ModelConfig } from "../../src/config/schema";

test("glm and acw are not in built-in defaults", () => {
  expect("glm" in BUILTIN_DEFAULTS).toBe(false);
  expect("acw" in BUILTIN_DEFAULTS).toBe(false);
});

test("built-in defaults only contain official adapters", () => {
  const keys = Object.keys(BUILTIN_DEFAULTS).sort();
  expect(keys).toEqual(["claude", "codex", "gemini", "kimi", "openai"]);
});

test("ModelConfigSchema strips tmp_prefix from file output (field removed)", () => {
  const result = ModelConfigSchema.safeParse({
    bin: "codex",
    command: {
      args: ["{{bin}}"],
      output: { via: "file", tmp_prefix: "x" },
    },
    prompt_assembly: "{{prompt}}",
    history_entry: "",
  });
  expect(result.success).toBe(true);
  if (result.success) {
    expect((result.data.command.output as Record<string, unknown>).tmp_prefix).toBeUndefined();
  }
});

test("AssembledRequest no longer carries tmpPrefix", () => {
  const cfg: ModelConfig = {
    enabled: true,
    bin: "codex",
    model: "gpt-5",
    env: {},
    command: {
      args: [
        "{{bin}}", "exec", "--full-auto", "--skip-git-repo-check", "-s", "read-only",
        { if: "model", then: ["-m", "{{model}}"] },
        "-o", "{{output_file}}", "{{prompt}}",
      ],
      output: { via: "file" },
    },
    prompt_assembly: "{{prompt}}",
    history_entry: "[{{agent}}]: {{content}}",
  };
  const a = assembleCommand(cfg, { prompt: "p", timeout_ms: 1000 }, "/tmp/x");
  expect("tmpPrefix" in a).toBe(false);
});
