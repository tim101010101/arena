import type { AgentAdapter, BinaryAdapter, AgentRequest, AgentResponse, HealthResult } from "./base";

export class ProfileEntry implements AgentAdapter {
  constructor(
    readonly id: string,
    readonly name: string,
    private binary: BinaryAdapter,
  ) {}

  healthCheck(): Promise<HealthResult> {
    return this.binary.healthCheck();
  }

  execute(req: AgentRequest): Promise<AgentResponse> {
    return this.binary.execute(this.id, req);
  }
}
