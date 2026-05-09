import { describe, test, expect } from "bun:test";
import { buildArgsFor } from "../src/adapters/build-args";

describe("buildArgsFor", () => {
  test("claude profile: prompt at the end", () => {
    const args = buildArgsFor("claude", { prompt: "hi", timeout_ms: 5_000 });
    expect(args[0]).toBe("claude");
    expect(args).toContain("-p");
    expect(args[args.length - 1]).toBe("hi");
  });

  test("codex profile: includes -o output file when provided", () => {
    const args = buildArgsFor("codex", { prompt: "p", timeout_ms: 5_000 }, "/tmp/o.txt");
    expect(args).toContain("-o");
    expect(args).toContain("/tmp/o.txt");
  });
});
