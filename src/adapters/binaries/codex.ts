import type { BinaryAdapter, AgentRequest, AgentResponse, HealthResult } from "../base";
import { makeFileBinary } from "./_file";

const _impl = makeFileBinary("codex");

export class CodexBinary implements BinaryAdapter {
  readonly bin = "codex";
  healthCheck(): Promise<HealthResult> { return _impl.healthCheck(); }
  execute(profileId: string, req: AgentRequest): Promise<AgentResponse> { return _impl.execute(profileId, req); }
}
