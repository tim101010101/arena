import { describe, test, expect } from "bun:test";
import { PerfConfigSchema, UserConfigSchema } from "../../src/config/user-schema";

describe("PerfConfigSchema", () => {
  test("accepts positive integer for output_max_words", () => {
    const result = PerfConfigSchema.safeParse({ output_max_words: 200 });
    expect(result.success).toBe(true);
    expect(result.data?.output_max_words).toBe(200);
  });

  test("accepts null for output_max_words", () => {
    const result = PerfConfigSchema.safeParse({ output_max_words: null });
    expect(result.success).toBe(true);
    expect(result.data?.output_max_words).toBeNull();
  });

  test("rejects 0 for output_max_words", () => {
    const result = PerfConfigSchema.safeParse({ output_max_words: 0 });
    expect(result.success).toBe(false);
  });

  test("rejects negative for output_max_words", () => {
    const result = PerfConfigSchema.safeParse({ output_max_words: -1 });
    expect(result.success).toBe(false);
  });

  test("accepts positive integer for history_window", () => {
    const result = PerfConfigSchema.safeParse({ history_window: 2 });
    expect(result.success).toBe(true);
    expect(result.data?.history_window).toBe(2);
  });

  test("accepts null for history_window", () => {
    const result = PerfConfigSchema.safeParse({ history_window: null });
    expect(result.success).toBe(true);
    expect(result.data?.history_window).toBeNull();
  });

  test("rejects 0 for history_window", () => {
    const result = PerfConfigSchema.safeParse({ history_window: 0 });
    expect(result.success).toBe(false);
  });

  test("rejects negative for history_window", () => {
    const result = PerfConfigSchema.safeParse({ history_window: -1 });
    expect(result.success).toBe(false);
  });

  test("accepts stream_progress boolean", () => {
    expect(PerfConfigSchema.safeParse({ stream_progress: true }).success).toBe(true);
    expect(PerfConfigSchema.safeParse({ stream_progress: false }).success).toBe(true);
  });

  test("defaults output_max_words to null when omitted", () => {
    const result = PerfConfigSchema.parse({});
    expect(result.output_max_words).toBeNull();
  });

  test("defaults history_window to null when omitted", () => {
    const result = PerfConfigSchema.parse({});
    expect(result.history_window).toBeNull();
  });

  test("defaults stream_progress to false when omitted", () => {
    const result = PerfConfigSchema.parse({});
    expect(result.stream_progress).toBe(false);
  });
});

describe("UserConfigSchema perf field", () => {
  const base = {
    version: 1 as const,
    defaults: {},
  };

  test("accepts defaults.perf with output_max_words", () => {
    const result = UserConfigSchema.safeParse({
      ...base,
      defaults: { perf: { output_max_words: 300 } },
    });
    expect(result.success).toBe(true);
  });

  test("accepts defaults.perf with history_window", () => {
    const result = UserConfigSchema.safeParse({
      ...base,
      defaults: { perf: { history_window: 2 } },
    });
    expect(result.success).toBe(true);
  });

  test("rejects defaults.perf with invalid output_max_words", () => {
    const result = UserConfigSchema.safeParse({
      ...base,
      defaults: { perf: { output_max_words: -5 } },
    });
    expect(result.success).toBe(false);
  });
});
