import type { AgentAdapter, AgentRequest, AgentResponse } from "./adapters/base";
import { registry } from "./adapters/registry";

export type ExecutionMode = "sequential" | "parallel";

export interface AgentSlot {
  id: string;
  model: string;
}

export interface OrchestratorRequest {
  slots: AgentSlot[];
  buildRequest: (slot: AgentSlot) => AgentRequest;
  mode: ExecutionMode;
}

export interface OrchestratorResult {
  responses: AgentResponse[];
  failed: string[];
}

async function executeSlot(
  slot: AgentSlot,
  adapter: AgentAdapter,
  req: AgentRequest,
): Promise<AgentResponse> {
  try {
    const resp = await adapter.execute(req);
    return { ...resp, agent: slot.id };
  } catch (err) {
    return {
      content: "",
      agent: slot.id,
      latency_ms: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function orchestrate(request: OrchestratorRequest): Promise<OrchestratorResult> {
  const pairs = request.slots.map((slot) => ({ slot, adapter: registry.get(slot.model) }));
  let responses: AgentResponse[];

  if (request.mode === "parallel") {
    responses = await Promise.all(
      pairs.map(({ slot, adapter }) => executeSlot(slot, adapter, request.buildRequest(slot))),
    );
  } else {
    responses = [];
    for (const { slot, adapter } of pairs) {
      responses.push(await executeSlot(slot, adapter, request.buildRequest(slot)));
    }
  }

  const failed = responses.filter((r) => r.error).map((r) => r.agent);
  return { responses, failed };
}

export async function orchestrateRounds(
  slots: AgentSlot[],
  rounds: number,
  mode: ExecutionMode,
  buildRequest: (slot: AgentSlot, round: number, history: AgentResponse[]) => AgentRequest,
  onRound?: (round: number, responses: AgentResponse[]) => void,
): Promise<AgentResponse[][]> {
  const allRounds: AgentResponse[][] = [];
  const history: AgentResponse[] = [];

  for (let round = 1; round <= rounds; round++) {
    const result = await orchestrate({
      slots,
      mode,
      buildRequest: (slot) => buildRequest(slot, round, history),
    });
    allRounds.push(result.responses);
    history.push(...result.responses);
    onRound?.(round, result.responses);
  }

  return allRounds;
}
