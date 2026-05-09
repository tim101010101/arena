import { test, expect } from "bun:test";
import { BUILTIN_DEFAULTS, setActiveModels } from "../../src/config/defaults";
import { buildArgsFor } from "../../src/adapters/build-args";
import { registry } from "../../src/adapters/registry";
import { registerAllAdapters } from "../../src/adapters/register-all";

test("glm profile uses opencode binary, stdout output", () => {
  expect(BUILTIN_DEFAULTS.glm.bin).toBe("opencode");
  expect(BUILTIN_DEFAULTS.glm.command.output.via).toBe("stdout");
  expect(BUILTIN_DEFAULTS.glm.model).toBe("zhipuai/glm-5.1");
});

test("acw profile uses codex binary with model_provider=acw", () => {
  expect(BUILTIN_DEFAULTS.acw.bin).toBe("codex");
  expect(BUILTIN_DEFAULTS.acw.command.output.via).toBe("file");
  expect(BUILTIN_DEFAULTS.acw.model).toBe("gpt-5.5");
});

test("glm argv shape: opencode run -m zhipuai/glm-5.1 <prompt>", () => {
  const args = buildArgsFor("glm", { prompt: "hi", timeout_ms: 5_000 });
  expect(args[0]).toBe("opencode");
  expect(args).toContain("run");
  expect(args).toContain("-m");
  expect(args).toContain("zhipuai/glm-5.1");
  expect(args[args.length - 1]).toBe("hi");
});

test("acw argv contains model_provider=\"acw\"", () => {
  const args = buildArgsFor("acw", { prompt: "p", timeout_ms: 5_000 }, "/tmp/o.txt");
  expect(args[0]).toBe("codex");
  expect(args).toContain("-c");
  expect(args).toContain('model_provider="acw"');
  expect(args).toContain("-m");
  expect(args).toContain("gpt-5.5");
});

test("glm and acw register through profile-driven flow", () => {
  setActiveModels({ ...BUILTIN_DEFAULTS });
  registerAllAdapters({ force: true });
  expect(registry.has("glm")).toBe(true);
  expect(registry.has("acw")).toBe(true);
});
