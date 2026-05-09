import { describe, test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configSearchPaths, loadUserConfig } from "../../src/config/loader";

function withDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "arena-loader-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("configSearchPaths", () => {
  test("should_put_ARENA_CONFIG_first_when_set", () => {
    const paths = configSearchPaths({ ARENA_CONFIG: "/custom/x.json" }, "/work");
    expect(paths[0]).toBe("/custom/x.json");
  });

  test("should_include_cwd_jsonc_then_json", () => {
    const paths = configSearchPaths({}, "/work");
    expect(paths).toContain("/work/.arena.jsonc");
    expect(paths).toContain("/work/.arena.json");
    const jsoncIdx = paths.indexOf("/work/.arena.jsonc");
    const jsonIdx = paths.indexOf("/work/.arena.json");
    expect(jsoncIdx).toBeLessThan(jsonIdx);
  });

  test("should_use_XDG_CONFIG_HOME_when_set", () => {
    const paths = configSearchPaths({ XDG_CONFIG_HOME: "/x" }, "/work");
    expect(paths).toContain("/x/arena/config.jsonc");
    expect(paths).toContain("/x/arena/config.json");
  });
});

describe("loadUserConfig", () => {
  test("should_return_null_when_no_file_exists", () => {
    withDir((dir) => {
      const out = loadUserConfig({ HOME: dir, XDG_CONFIG_HOME: join(dir, "missing") }, dir);
      expect(out.config).toBeNull();
      expect(out.path).toBeNull();
    });
  });

  test("should_load_and_validate_a_minimal_config", () => {
    withDir((dir) => {
      writeFileSync(
        join(dir, ".arena.json"),
        JSON.stringify({ version: 1 }),
      );
      const out = loadUserConfig({}, dir);
      expect(out.config).toEqual({ version: 1 });
      expect(out.path).toBe(join(dir, ".arena.json"));
    });
  });

  test("should_strip_jsonc_comments", () => {
    withDir((dir) => {
      writeFileSync(
        join(dir, ".arena.jsonc"),
        "// header\n{ \"version\": 1 /* trailing */ }",
      );
      const out = loadUserConfig({}, dir);
      expect(out.config).toEqual({ version: 1 });
    });
  });

  test("should_prefer_jsonc_over_json_when_both_present", () => {
    withDir((dir) => {
      writeFileSync(join(dir, ".arena.jsonc"), '{"version":1}');
      writeFileSync(join(dir, ".arena.json"), '{"version":1}');
      const out = loadUserConfig({}, dir);
      expect(out.path).toBe(join(dir, ".arena.jsonc"));
    });
  });

  test("should_hard_error_on_parse_failure", () => {
    withDir((dir) => {
      writeFileSync(join(dir, ".arena.json"), "{not json");
      expect(() => loadUserConfig({}, dir)).toThrow(/failed to parse JSONC/);
    });
  });

  test("should_hard_error_on_schema_violation", () => {
    withDir((dir) => {
      writeFileSync(join(dir, ".arena.json"), '{"version": 2}');
      expect(() => loadUserConfig({}, dir)).toThrow(/invalid config/);
    });
  });

  test("should_reject_reserved_scenario_names", () => {
    withDir((dir) => {
      writeFileSync(
        join(dir, ".arena.json"),
        JSON.stringify({
          version: 1,
          scenarios: {
            health: {
              positions_from: "args",
              prompts: { system: "{{position}}", round: "{{context}}" },
            },
          },
        }),
      );
      expect(() => loadUserConfig({}, dir)).toThrow(/reserved/);
    });
  });

  test("should_use_ARENA_CONFIG_when_set", () => {
    withDir((dir) => {
      const sub = join(dir, "sub");
      mkdirSync(sub);
      const path = join(sub, "custom.json");
      writeFileSync(path, '{"version": 1}');
      const out = loadUserConfig({ ARENA_CONFIG: path }, dir);
      expect(out.path).toBe(path);
    });
  });
});
