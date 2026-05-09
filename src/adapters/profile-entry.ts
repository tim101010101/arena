import type { AgentAdapter, BinaryAdapter, AgentRequest, AgentResponse, HealthResult } from "./base";

export class ProfileEntry implements AgentAdapter {
  constructor(
    readonly id: string,
    private binary: BinaryAdapter,
  ) {}

  get bin(): string { return this.binary.bin; }

  healthCheck(): Promise<HealthResult> {
    return this.binary.healthCheck();
  }

  execute(req: AgentRequest): Promise<AgentResponse> {
    return this.binary.execute(this.id, req);
  }
}
