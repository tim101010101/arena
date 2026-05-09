import { describe, test, expect } from "bun:test";
import { renderString, renderArgs, renderCommand } from "../../src/config/template";
import type { RenderContext, ModelCommand } from "../../src/config/schema";

describe("renderString", () => {
  test("should_substitute_simple_variable", () => {
    expect(renderString("hello {{name}}", { prompt: "x", name: "world" })).toBe("hello world");
  });

  test("should_render_empty_string_for_undefined_variable", () => {
    expect(renderString("a{{missing}}b", { prompt: "x" })).toBe("ab");
  });

  test("should_strip_if_block_when_var_undefined", () => {
    expect(renderString("a{{#if x}}YES{{/if}}b", { prompt: "p" })).toBe("ab");
  });

  test("should_strip_if_block_when_var_empty_string", () => {
    expect(renderString("a{{#if x}}YES{{/if}}b", { prompt: "p", x: "" })).toBe("ab");
  });

  test("should_keep_if_block_when_var_truthy", () => {
    expect(renderString("a{{#if x}}YES{{/if}}b", { prompt: "p", x: "v" })).toBe("aYESb");
  });

  test("should_render_variable_inside_if_block", () => {
    expect(renderString("{{#if x}}got={{x}}{{/if}}", { prompt: "p", x: "v" })).toBe("got=v");
  });

  test("should_handle_nested_if_blocks", () => {
    const t = "{{#if a}}A{{#if b}}B{{/if}}A{{/if}}";
    expect(renderString(t, { prompt: "p", a: "1", b: "1" })).toBe("ABA");
    expect(renderString(t, { prompt: "p", a: "1" })).toBe("AA");
    expect(renderString(t, { prompt: "p" })).toBe("");
  });

  test("should_throw_on_unterminated_braces", () => {
    expect(() => renderString("hi {{name", { prompt: "p" })).toThrow(/unterminated/);
  });

  test("should_throw_on_dangling_end_if", () => {
    expect(() => renderString("hi {{/if}}", { prompt: "p" })).toThrow(/unexpected/);
  });

  test("should_pass_through_text_with_no_tags", () => {
    expect(renderString("plain text", { prompt: "p" })).toBe("plain text");
  });
});

describe("renderArgs", () => {
  const ctx: RenderContext = { bin: "claude", prompt: "hi", model: "m1" };

  test("should_substitute_strings_in_array", () => {
    expect(renderArgs(["{{bin}}", "-p", "{{prompt}}"], ctx)).toEqual(["claude", "-p", "hi"]);
  });

  test("should_expand_if_branch_when_var_truthy", () => {
    const out = renderArgs(["x", { if: "model", then: ["--model", "{{model}}"] }, "y"], ctx);
    expect(out).toEqual(["x", "--model", "m1", "y"]);
  });

  test("should_skip_if_branch_when_var_undefined", () => {
    const out = renderArgs(
      ["x", { if: "system", then: ["--system-prompt", "{{system}}"] }, "y"],
      ctx,
    );
    expect(out).toEqual(["x", "y"]);
  });

  test("should_skip_if_branch_when_var_empty_string", () => {
    const out = renderArgs(
      ["x", { if: "system", then: ["--system-prompt", "{{system}}"] }, "y"],
      { ...ctx, system: "" },
    );
    expect(out).toEqual(["x", "y"]);
  });

  test("should_recurse_into_nested_if_branches", () => {
    const out = renderArgs(
      [{ if: "model", then: ["a", { if: "system", then: ["b", "{{system}}"] }, "c"] }],
      { ...ctx, system: "s" },
    );
    expect(out).toEqual(["a", "b", "s", "c"]);
  });

  test("should_throw_on_invalid_token_shape", () => {
    expect(() => renderArgs([{ foo: "bar" } as unknown as string], ctx)).toThrow();
  });
});

describe("renderCommand", () => {
  test("should_render_full_command_template", () => {
    const cmd: ModelCommand = {
      args: [
        "{{bin}}", "-p",
        { if: "model", then: ["--model", "{{model}}"] },
        "{{prompt}}",
      ],
      output: { via: "stdout" },
    };
    expect(renderCommand(cmd, { bin: "claude", prompt: "hi", model: "m1" }))
      .toEqual(["claude", "-p", "--model", "m1", "hi"]);
  });
});
