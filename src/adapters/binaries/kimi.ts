import type { BinaryAdapter, AgentRequest, AgentResponse, HealthResult } from "../base";
import { makeStdoutBinary } from "./_stdout";

const _impl = makeStdoutBinary("kimi");

export class KimiBinary implements BinaryAdapter {
  readonly bin = "kimi";
  healthCheck(): Promise<HealthResult> { return _impl.healthCheck(); }
  execute(profileId: string, req: AgentRequest): Promise<AgentResponse> { return _impl.execute(profileId, req); }
}
