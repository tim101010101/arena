import { describe, test, expect, beforeAll } from "bun:test";
import { registry } from "../../src/adapters/registry";
import { MockAdapter } from "./helpers/mock-adapter";

describe("arena_health integration", () => {
  beforeAll(() => {
    registry.register(new MockAdapter({ id: "healthy1", healthy: true }));
    registry.register(new MockAdapter({ id: "healthy2", healthy: true }));
    registry.register(new MockAdapter({ id: "unhealthy1", healthy: false }));
  });

  test("should_check_all_agents_when_healthy", async () => {
    const results = await registry.healthCheckAll();

    expect(results.healthy1.ok).toBe(true);
    expect(results.healthy2.ok).toBe(true);
  });

  test("should_report_unhealthy_agents", async () => {
    const results = await registry.healthCheckAll();

    expect(results.unhealthy1.ok).toBe(false);
    expect(results.unhealthy1.error).toBe("mock unhealthy");
  });

  test("should_return_results_for_all_registered_agents", async () => {
    const results = await registry.healthCheckAll();

    expect(Object.keys(results).length).toBeGreaterThanOrEqual(3);
    expect(results.healthy1).toBeDefined();
    expect(results.healthy2).toBeDefined();
    expect(results.unhealthy1).toBeDefined();
  });
});
