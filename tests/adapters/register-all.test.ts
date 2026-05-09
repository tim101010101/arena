import { test, expect, spyOn } from "bun:test";
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

test("warns when a profile references unknown bin", () => {
  const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
  setActiveModels({
    ...BUILTIN_DEFAULTS,
    typo: { ...BUILTIN_DEFAULTS.codex, bin: "opencod" },
  });
  registerAllAdapters({ force: true });
  expect(registry.has("typo")).toBe(false);
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining(`profile "typo"`),
  );
  expect(warnSpy.mock.calls[0][0]).toContain('unknown bin "opencod"');
  warnSpy.mockRestore();
});
