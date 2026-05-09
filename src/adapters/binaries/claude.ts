import type { BinaryAdapter, AgentRequest, AgentResponse, HealthResult } from "../base";
import { makeStdoutBinary } from "./_stdout";

const _impl = makeStdoutBinary("claude");

export class ClaudeBinary implements BinaryAdapter {
  readonly bin = "claude";
  healthCheck(): Promise<HealthResult> { return _impl.healthCheck(); }
  execute(profileId: string, req: AgentRequest): Promise<AgentResponse> { return _impl.execute(profileId, req); }
}
