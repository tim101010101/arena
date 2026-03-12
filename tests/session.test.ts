import { describe, test, expect, beforeEach } from "bun:test";
import { sessions } from "../src/session";

function clearSessions() {
  // @ts-ignore
  sessions["sessions"].clear();
}

describe("SessionManager", () => {
  beforeEach(clearSessions);

  describe("create", () => {
    test("should create session with correct shape", () => {
      const s = sessions.create("debate", ["claude", "codex"], { topic: "test" });
      expect(s.id).toMatch(/^arena-\d+-[a-z0-9]+$/);
      expect(s.tool).toBe("debate");
      expect(s.agents).toEqual(["claude", "codex"]);
      expect(s.rounds).toEqual([]);
      expect(s.metadata?.topic).toBe("test");
    });

    test("should generate unique ids", () => {
      const ids = Array.from({ length: 5 }, () => sessions.create("debate", ["a"]).id);
      expect(new Set(ids).size).toBe(5);
    });

    test("should set created_at timestamp", () => {
      const before = Date.now();
      const s = sessions.create("debate", ["a"]);
      expect(s.created_at).toBeGreaterThanOrEqual(before);
      expect(s.created_at).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("get", () => {
    test("should retrieve existing session", () => {
      const s = sessions.create("review", ["claude"]);
      expect(sessions.get(s.id)).toBe(s);
    });

    test("should throw on unknown session id", () => {
      expect(() => sessions.get("nonexistent")).toThrow("Session not found: nonexistent");
    });
  });

  describe("addRound", () => {
    test("should add round with auto-incremented number", () => {
      const s = sessions.create("debate", ["claude", "codex"]);
      sessions.addRound(s.id, [
        { content: "hello", agent: "claude", latency_ms: 100 },
        { content: "world", agent: "codex", latency_ms: 200 },
      ]);
      expect(s.rounds).toHaveLength(1);
      expect(s.rounds[0].round).toBe(1);
      expect(s.rounds[0].responses).toHaveLength(2);
    });

    test("should increment round numbers across multiple calls", () => {
      const s = sessions.create("debate", ["a", "b"]);
      sessions.addRound(s.id, [{ content: "r1", agent: "a", latency_ms: 10 }]);
      sessions.addRound(s.id, [{ content: "r2", agent: "a", latency_ms: 10 }]);
      expect(s.rounds[0].round).toBe(1);
      expect(s.rounds[1].round).toBe(2);
    });

    test("should throw when adding to non-existent session", () => {
      expect(() => sessions.addRound("bad-id", [])).toThrow("Session not found: bad-id");
    });
  });

  describe("list", () => {
    test("should return empty array initially", () => {
      expect(sessions.list()).toEqual([]);
    });

    test("should return all created sessions", () => {
      const s1 = sessions.create("debate", ["a"]);
      const s2 = sessions.create("review", ["b"]);
      const list = sessions.list();
      expect(list).toHaveLength(2);
      expect(list).toContain(s1);
      expect(list).toContain(s2);
    });
  });
});
