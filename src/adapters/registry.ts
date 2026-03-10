import type { AgentAdapter, HealthResult } from "./base";

class AdapterRegistry {
  private adapters = new Map<string, AgentAdapter>();

  register(adapter: AgentAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): AgentAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`Unknown agent: "${id}". Available: ${this.list().join(", ")}`);
    return adapter;
  }

  has(id: string): boolean {
    return this.adapters.has(id);
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }

  async healthCheckAll(): Promise<Record<string, HealthResult>> {
    const results: Record<string, HealthResult> = {};
    const checks = this.list().map(async (id) => {
      results[id] = await this.get(id).healthCheck();
    });
    await Promise.all(checks);
    return results;
  }
}

export const registry = new AdapterRegistry();
