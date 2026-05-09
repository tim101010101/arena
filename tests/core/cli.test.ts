import { describe, test, expect } from "bun:test";
import { parseArgs } from "../../src/core/cli";

describe("parseArgs", () => {
  test("should default to help when no args", () => {
    expect(parseArgs([]).kind).toBe("help");
  });

  test("should parse 'health' subcommand", () => {
    expect(parseArgs(["health"])).toEqual({ kind: "health" });
  });

  test("should parse '--help' flag", () => {
    expect(parseArgs(["--help"]).kind).toBe("help");
    expect(parseArgs(["-h"]).kind).toBe("help");
  });

  test("should parse '--version' flag", () => {
    expect(parseArgs(["--version"]).kind).toBe("version");
  });

  test("should parse challenge with required flags", () => {
    const cmd = parseArgs([
      "challenge",
      "--context", "decision X",
      "--position", "pro",
      "--position", "con",
    ]);
    expect(cmd.kind).toBe("scenario");
    if (cmd.kind === "scenario") {
      expect(cmd.input.scenario).toBe("challenge");
      expect(cmd.input.context).toBe("decision X");
      expect(cmd.input.positions).toEqual(["pro", "con"]);
    }
  });

  test("should parse challenge --rounds and --models", () => {
    const cmd = parseArgs([
      "challenge",
      "--context", "x",
      "--position", "a",
      "--position", "b",
      "--rounds", "4",
      "--models", "claude,codex",
    ]);
    if (cmd.kind !== "scenario") throw new Error("expected scenario");
    expect(cmd.input.scenario).toBe("challenge");
    expect(cmd.input.rounds).toBe(4);
    expect(cmd.input.models).toEqual(["claude", "codex"]);
  });

  test("should error when challenge has fewer than 2 positions", () => {
    const cmd = parseArgs(["challenge", "--context", "x", "--position", "only"]);
    expect(cmd.kind).toBe("error");
  });

  test("should error when challenge missing --context", () => {
    const cmd = parseArgs(["challenge", "--position", "a", "--position", "b"]);
    expect(cmd.kind).toBe("error");
  });

  test("should parse review with --focus and --code", () => {
    const cmd = parseArgs([
      "review",
      "--code", "function f(){}",
      "--focus", "bugs,security",
    ]);
    expect(cmd.kind).toBe("scenario");
    if (cmd.kind === "scenario") {
      expect(cmd.input.scenario).toBe("review");
      expect(cmd.input.code).toBe("function f(){}");
      expect(cmd.input.focus).toEqual(["bugs", "security"]);
    }
  });

  test("should parse review with --git-ref", () => {
    const cmd = parseArgs(["review", "--git-ref", "feature/auth"]);
    if (cmd.kind !== "scenario") throw new Error("expected scenario");
    expect(cmd.input.scenario).toBe("review");
    expect(cmd.input.gitRef).toBe("feature/auth");
  });

  test("should error on unknown subcommand", () => {
    const cmd = parseArgs(["bogus"]);
    expect(cmd.kind).toBe("error");
  });

  test("should reject --position on a focus-driven scenario", () => {
    const cmd = parseArgs(["review", "--position", "x"]);
    expect(cmd.kind).toBe("error");
  });

  test("should reject --focus on an args-driven scenario", () => {
    const cmd = parseArgs(["challenge", "--context", "x", "--focus", "bugs"]);
    expect(cmd.kind).toBe("error");
  });

  test("should accept user-defined scenarios via override map", () => {
    const cmd = parseArgs(
      ["mydiscuss", "--context", "x", "--position", "a", "--position", "b"],
      {
        mydiscuss: {
          positions_from: "args",
          prompts: { system: "{{position}}", round: "{{context}}", history_entry: "" },
        },
      },
    );
    if (cmd.kind !== "scenario") throw new Error(`expected scenario, got ${cmd.kind}`);
    expect(cmd.input.scenario).toBe("mydiscuss");
  });
});
