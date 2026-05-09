import { test, expect } from "bun:test";
import { ProfileEntry } from "../../src/adapters/profile-entry";
import type { AgentAdapter, BinaryAdapter, AgentRequest, AgentResponse, HealthResult } from "../../src/adapters/base";

class FakeBinary implements BinaryAdapter {
  readonly bin = "fake";
  calls: Array<[string, AgentRequest]> = [];
  async healthCheck(): Promise<HealthResult> { return { ok: true, latency_ms: 1 }; }
  async execute(profileId: string, req: AgentRequest): Promise<AgentResponse> {
    this.calls.push([profileId, req]);
    return { content: profileId, agent: profileId, latency_ms: 1 };
  }
}

test("AgentAdapter interface no longer requires name", () => {
  const a: AgentAdapter = {
    id: "x",
    healthCheck: async () => ({ ok: true, latency_ms: 0 }),
    execute: async () => ({ content: "", agent: "x", latency_ms: 0 }),
  };
  expect(a.id).toBe("x");
  // @ts-expect-error  name is no longer a member
  a.name;
});

test("ProfileEntry forwards execute with its profile id", async () => {
  const bin = new FakeBinary();
  const entry = new ProfileEntry("glm", bin);
  const r = await entry.execute({ prompt: "x", timeout_ms: 1000 });
  expect(r.agent).toBe("glm");
  expect(bin.calls[0][0]).toBe("glm");
});

test("ProfileEntry delegates healthCheck to binary", async () => {
  const bin = new FakeBinary();
  const entry = new ProfileEntry("glm", bin);
  const r = await entry.healthCheck();
  expect(r.ok).toBe(true);
  expect(r.latency_ms).toBe(1);
});

test("ProfileEntry exposes bin via readonly getter", () => {
  const bin = new FakeBinary();
  const entry = new ProfileEntry("glm", bin);
  expect(entry.bin).toBe("fake");
});
