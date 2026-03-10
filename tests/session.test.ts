import { describe, test, expect } from "bun:test";
import { sessions } from "../src/session";

describe("SessionManager", () => {
  test("should create session with unique id", () => {
    const s = sessions.create("debate", ["claude", "codex"], { topic: "test" });
    expect(s.id).toMatch(/^arena-/);
    expect(s.tool).toBe("debate");
    expect(s.agents).toEqual(["claude", "codex"]);
    expect(s.rounds).toEqual([]);
    expect(s.metadata?.topic).toBe("test");
  });

  test("should get session by id", () => {
    const s = sessions.create("review", ["claude"]);
    const found = sessions.get(s.id);
    expect(found.id).toBe(s.id);
  });

  test("should throw on unknown session", () => {
    expect(() => sessions.get("nonexistent")).toThrow("Session not found");
  });

  test("should add rounds", () => {
    const s = sessions.create("debate", ["claude", "codex"]);
    sessions.addRound(s.id, [
      { content: "hello", agent: "claude", latency_ms: 100 },
      { content: "world", agent: "codex", latency_ms: 200 },
    ]);
    const updated = sessions.get(s.id);
    expect(updated.rounds).toHaveLength(1);
    expect(updated.rounds[0].round).toBe(1);
    expect(updated.rounds[0].responses).toHaveLength(2);
  });

  test("should auto-increment round numbers", () => {
    const s = sessions.create("debate", ["a", "b"]);
    sessions.addRound(s.id, [{ content: "r1", agent: "a", latency_ms: 10 }]);
    sessions.addRound(s.id, [{ content: "r2", agent: "a", latency_ms: 10 }]);
    const updated = sessions.get(s.id);
    expect(updated.rounds[0].round).toBe(1);
    expect(updated.rounds[1].round).toBe(2);
  });

  test("should list all sessions", () => {
    const before = sessions.list().length;
    sessions.create("test", ["x"]);
    expect(sessions.list().length).toBe(before + 1);
  });
});
