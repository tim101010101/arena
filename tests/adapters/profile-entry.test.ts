import { test, expect } from "bun:test";
import { ProfileEntry } from "../../src/adapters/profile-entry";
import type { BinaryAdapter, AgentRequest, AgentResponse, HealthResult } from "../../src/adapters/base";

class FakeBinary implements BinaryAdapter {
  readonly bin = "fake";
  calls: Array<[string, AgentRequest]> = [];
  async healthCheck(): Promise<HealthResult> { return { ok: true, latency_ms: 1 }; }
  async execute(profileId: string, req: AgentRequest): Promise<AgentResponse> {
    this.calls.push([profileId, req]);
    return { content: profileId, agent: profileId, latency_ms: 1 };
  }
}

test("ProfileEntry forwards execute with its profile id", async () => {
  const bin = new FakeBinary();
  const entry = new ProfileEntry("glm", "GLM (opencode)", bin);
  const r = await entry.execute({ prompt: "x", timeout_ms: 1000 });
  expect(r.agent).toBe("glm");
  expect(bin.calls[0][0]).toBe("glm");
});

test("ProfileEntry delegates healthCheck to binary", async () => {
  const bin = new FakeBinary();
  const entry = new ProfileEntry("glm", "GLM (opencode)", bin);
  const r = await entry.healthCheck();
  expect(r.ok).toBe(true);
  expect(r.latency_ms).toBe(1);
});
