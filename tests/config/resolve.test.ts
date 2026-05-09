import { describe, test, expect } from "bun:test";
import { resolveConfig } from "../../src/config/resolve";
import { BUILTIN_DEFAULTS } from "../../src/config/defaults";
import { BUILTIN_SCENARIOS } from "../../src/config/scenarios";

describe("resolveConfig", () => {
  test("should_return_builtin_models_and_scenarios_when_user_config_null", () => {
    const r = resolveConfig(null);
    expect(Object.keys(r.models)).toEqual(Object.keys(BUILTIN_DEFAULTS));
    expect(Object.keys(r.scenarios).sort()).toEqual(Object.keys(BUILTIN_SCENARIOS).sort());
  });

  test("should_replace_builtin_model_wholesale_when_user_redefines_it", () => {
    const r = resolveConfig({
      version: 1,
      defaults: {
        models: {
          claude: {
            bin: "my-claude",
            command: { args: ["{{bin}}"], output: { via: "stdout" } },
            prompt_assembly: "{{prompt}}",
            history_entry: "{{content}}",
          },
        },
      },
    });
    expect(r.models.claude.bin).toBe("my-claude");
    expect(r.models.claude.command.args).toEqual(["{{bin}}"]);
    expect(r.models.codex.bin).toBe("codex");
  });

  test("should_add_a_new_user_scenario_alongside_builtins", () => {
    const r = resolveConfig({
      version: 1,
      scenarios: {
        debate: {
          positions_from: "args",
          prompts: { system: "you: {{position}}", round: "{{context}}", history_entry: "{{content}}" },
        },
      },
    });
    expect(r.scenarios.debate.positions_from).toBe("args");
    expect(r.scenarios.challenge).toBeDefined();
  });

  test("should_resolve_inherits_chain", () => {
    const r = resolveConfig({
      version: 1,
      scenarios: {
        deep_review: {
          inherits: "review",
          default_focus: ["bugs", "security", "performance"],
        },
      },
    });
    expect(r.scenarios.deep_review.positions_from).toBe("focus");
    expect(r.scenarios.deep_review.default_focus).toEqual(["bugs", "security", "performance"]);
    expect(r.scenarios.deep_review.focus_positions?.bugs).toBeDefined();
  });

  test("should_detect_inherits_cycles", () => {
    expect(() =>
      resolveConfig({
        version: 1,
        scenarios: {
          a: { inherits: "b", positions_from: "args", prompts: { system: "s", round: "r", history_entry: "" } },
          b: { inherits: "a", positions_from: "args", prompts: { system: "s", round: "r", history_entry: "" } },
        },
      }),
    ).toThrow(/cycle/i);
  });

  test("should_throw_when_inherits_targets_unknown_scenario", () => {
    expect(() =>
      resolveConfig({
        version: 1,
        scenarios: {
          x: { inherits: "ghost" },
        },
      }),
    ).toThrow(/scenario not found: ghost/);
  });

  test("should_override_scenario_prompts_when_user_supplies_them", () => {
    const r = resolveConfig({
      version: 1,
      scenarios: {
        custom_review: {
          inherits: "review",
          prompts: { system: "OVERRIDE {{position}}", round: "{{context}}" },
        },
      },
    });
    expect(r.scenarios.custom_review.prompts.system).toBe("OVERRIDE {{position}}");
    expect(r.scenarios.custom_review.focus_positions?.bugs).toBeDefined();
  });
});
