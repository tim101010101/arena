import { test, expect } from "bun:test";
import { registry } from "../../src/adapters/registry";
import { registerAllAdapters } from "../../src/adapters/register-all";
import { setActiveModels, BUILTIN_DEFAULTS } from "../../src/config/defaults";

test("register-all registers one entry per active profile (incl. user-defined)", () => {
  setActiveModels({ ...BUILTIN_DEFAULTS, custom: BUILTIN_DEFAULTS.codex });
  registerAllAdapters({ force: true });
  expect(registry.has("custom")).toBe(true);
  expect(registry.has("claude")).toBe(true);
  expect(registry.has("codex")).toBe(true);
});

test("two profiles sharing bin=codex both register independently", () => {
  registerAllAdapters({ force: true });
  expect(registry.has("codex")).toBe(true);
  expect(registry.has("openai")).toBe(true);
});

test("registers custom model with unknown bin using a dynamic adapter", () => {
  setActiveModels({
    ...BUILTIN_DEFAULTS,
    custom_model: { ...BUILTIN_DEFAULTS.gemini, bin: "custom-cli" },
  });
  registerAllAdapters({ force: true });
  // Custom models with any bin name should be registered; health check surfaces availability
  expect(registry.has("custom_model")).toBe(true);
});
