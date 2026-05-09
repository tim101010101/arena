import { describe, test, expect } from "bun:test";
import { stripJsoncComments, parseJsonc } from "../../src/config/jsonc";

describe("stripJsoncComments", () => {
  test("should_strip_line_comments", () => {
    expect(stripJsoncComments("// comment\n{\"a\": 1}")).toBe("\n{\"a\": 1}");
  });

  test("should_strip_block_comments", () => {
    expect(stripJsoncComments("{/* hi */\"a\": 1}")).toBe("{\"a\": 1}");
  });

  test("should_strip_trailing_inline_comment", () => {
    expect(stripJsoncComments("{\"a\": 1} // trailing")).toBe("{\"a\": 1} ");
  });

  test("should_keep_double_slashes_inside_strings", () => {
    const src = '{"url": "http://example.com/a"}';
    expect(stripJsoncComments(src)).toBe(src);
  });

  test("should_keep_block_comment_markers_inside_strings", () => {
    const src = '{"a": "/* not a comment */"}';
    expect(stripJsoncComments(src)).toBe(src);
  });

  test("should_handle_escaped_quotes_in_strings", () => {
    const src = '{"a": "say \\"hi\\""}';
    expect(stripJsoncComments(src)).toBe(src);
  });

  test("should_handle_unterminated_block_comment_gracefully", () => {
    expect(stripJsoncComments("{/* never ends")).toBe("{");
  });
});

describe("parseJsonc", () => {
  test("should_parse_with_comments", () => {
    expect(parseJsonc('{ // inline\n"a": 1 /* block */ }')).toEqual({ a: 1 });
  });

  test("should_throw_with_source_path_in_error", () => {
    expect(() => parseJsonc("{not json", "/tmp/x.json")).toThrow(/\/tmp\/x\.json/);
  });
});
