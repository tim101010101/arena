import type { AgentAdapter, AgentRequest, AgentResponse } from "./adapters/base";
import { registry } from "./adapters/registry";
import { ARENA_TIMEOUT_MS } from "./constants";

export type ExecutionMode = "sequential" | "parallel";

export interface OrchestratorRequest {
  agents: string[];
  buildRequest: (agentId: string) => AgentRequest;
  mode: ExecutionMode;
}

export interface OrchestratorResult {
  responses: AgentResponse[];
  failed: string[];
}

function getAdapter(id: string): AgentAdapter {
  return registry.get(id);
}

async function executeOne(adapter: AgentAdapter, req: AgentRequest): Promise<AgentResponse> {
  try {
    return await adapter.execute(req);
  } catch (err) {
    return {
      content: "",
      agent: adapter.id,
      latency_ms: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function orchestrate(request: OrchestratorRequest): Promise<OrchestratorResult> {
  const adapters = request.agents.map((id) => getAdapter(id));
  let responses: AgentResponse[];

  if (request.mode === "parallel") {
    responses = await Promise.all(
      adapters.map((a) => executeOne(a, request.buildRequest(a.id))),
    );
  } else {
    responses = [];
    for (const adapter of adapters) {
      const resp = await executeOne(adapter, request.buildRequest(adapter.id));
      responses.push(resp);
    }
  }

  const failed = responses.filter((r) => r.error).map((r) => r.agent);
  return { responses, failed };
}

export async function orchestrateRounds(
  agents: string[],
  rounds: number,
  mode: ExecutionMode,
  buildRequest: (agentId: string, round: number, history: AgentResponse[]) => AgentRequest,
  onRound?: (round: number, responses: AgentResponse[]) => void,
): Promise<AgentResponse[][]> {
  const allRounds: AgentResponse[][] = [];
  const history: AgentResponse[] = [];

  for (let round = 1; round <= rounds; round++) {
    const result = await orchestrate({
      agents,
      mode,
      buildRequest: (agentId) => buildRequest(agentId, round, history),
    });
    allRounds.push(result.responses);
    history.push(...result.responses);
    onRound?.(round, result.responses);
  }

  return allRounds;
}
