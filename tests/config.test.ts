import { describe, test, expect } from "bun:test";
import { spawnSync } from "bun";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";

describe("config validation", () => {
  const testScript = join(process.cwd(), "test-config-temp.js");

  function runConfigTest(code: string, env: Record<string, string> = {}) {
    writeFileSync(testScript, code);
    const result = spawnSync({
      cmd: ["bun", testScript],
      cwd: process.cwd(),
      env: { ...process.env, ...env },
    });
    unlinkSync(testScript);
    return result;
  }

  test("should_parse_valid_config_with_defaults", () => {
    const result = runConfigTest(`
      const { config } = require("./src/config");
      console.log(JSON.stringify(config));
    `);

    expect(result.exitCode).toBe(0);
    const config = JSON.parse(result.stdout.toString());
    expect(config.timeout_ms).toBe(120_000);
    expect(config.health_check_timeout_ms).toBe(15_000);
    expect(config.default_rounds).toBe(3);
    expect(config.default_mode).toBe("parallel");
    expect(config.max_context_size).toBe(1_000_000);
  });

  test("should_parse_custom_env_values", () => {
    const result = runConfigTest(
      `
      const { config } = require("./src/config");
      console.log(JSON.stringify(config));
    `,
      {
        ARENA_TIMEOUT_MS: "60000",
        ARENA_DEFAULT_ROUNDS: "5",
        ARENA_DEFAULT_MODE: "sequential",
        ARENA_MAX_CONTEXT_SIZE: "500000",
        ARENA_CLAUDE_MODEL: "claude-opus-4",
      }
    );

    expect(result.exitCode).toBe(0);
    const config = JSON.parse(result.stdout.toString());
    expect(config.timeout_ms).toBe(60_000);
    expect(config.default_rounds).toBe(5);
    expect(config.default_mode).toBe("sequential");
    expect(config.max_context_size).toBe(500_000);
    expect(config.models.claude).toBe("claude-opus-4");
  });

  test("should_reject_negative_timeout", () => {
    const result = runConfigTest(`require("./src/config");`, {
      ARENA_TIMEOUT_MS: "-1000",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Invalid config");
  });

  test("should_reject_timeout_too_large", () => {
    const result = runConfigTest(`require("./src/config");`, {
      ARENA_TIMEOUT_MS: "700000",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Invalid config");
  });

  test("should_reject_invalid_mode", () => {
    const result = runConfigTest(`require("./src/config");`, {
      ARENA_DEFAULT_MODE: "invalid",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Invalid config");
  });

  test("should_reject_rounds_zero", () => {
    const result = runConfigTest(`require("./src/config");`, {
      ARENA_DEFAULT_ROUNDS: "0",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Invalid config");
  });

  test("should_reject_rounds_too_large", () => {
    const result = runConfigTest(`require("./src/config");`, {
      ARENA_DEFAULT_ROUNDS: "11",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Invalid config");
  });

  test("should_accept_undefined_model", () => {
    const result = runConfigTest(`
      const { config } = require("./src/config");
      console.log(JSON.stringify(config.models));
    `);

    expect(result.exitCode).toBe(0);
    const models = JSON.parse(result.stdout.toString());
    expect(models.claude).toBeUndefined();
    expect(models.codex).toBeUndefined();
  });

  test("should_reject_empty_string_model", () => {
    const result = runConfigTest(`require("./src/config");`, {
      ARENA_CLAUDE_MODEL: "",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Invalid config");
  });
});
