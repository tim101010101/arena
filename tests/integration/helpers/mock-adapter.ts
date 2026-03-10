import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "../../../src/adapters/base";

export interface MockAdapterConfig {
  id: string;
  response?: string;
  delay_ms?: number;
  shouldFail?: boolean;
  errorMessage?: string;
  healthy?: boolean;
}

export class MockAdapter implements AgentAdapter {
  readonly id: string;
  readonly name: string;
  public callHistory: AgentRequest[] = [];

  private response: string;
  private delay: number;
  private shouldFail: boolean;
  private errorMessage: string;
  private healthy: boolean;

  constructor(config: MockAdapterConfig) {
    this.id = config.id;
    this.name = `Mock ${config.id}`;
    this.response = config.response || `Response from ${config.id}`;
    this.delay = config.delay_ms || 0;
    this.shouldFail = config.shouldFail || false;
    this.errorMessage = config.errorMessage || "mock failure";
    this.healthy = config.healthy !== undefined ? config.healthy : true;
  }

  async healthCheck(): Promise<HealthResult> {
    if (!this.healthy) {
      return { ok: false, error: "mock unhealthy", latency_ms: 1 };
    }
    return { ok: true, latency_ms: 1 };
  }

  async execute(req: AgentRequest): Promise<AgentResponse> {
    this.callHistory.push(req);

    if (this.delay) {
      await new Promise((r) => setTimeout(r, this.delay));
    }

    if (this.shouldFail) {
      return {
        content: "",
        agent: this.id,
        latency_ms: this.delay,
        error: this.errorMessage,
      };
    }

    return {
      content: this.response,
      agent: this.id,
      latency_ms: this.delay,
    };
  }
}
