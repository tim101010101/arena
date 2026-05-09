import type { BinaryAdapter, AgentRequest, AgentResponse, HealthResult } from "../base";
import { makeStdoutBinary } from "./_stdout";

const _impl = makeStdoutBinary("gemini");

export class GeminiBinary implements BinaryAdapter {
  readonly bin = "gemini";
  healthCheck(): Promise<HealthResult> { return _impl.healthCheck(); }
  execute(profileId: string, req: AgentRequest): Promise<AgentResponse> { return _impl.execute(profileId, req); }
}
