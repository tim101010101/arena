import type { AgentAdapter, AgentRequest, AgentResponse } from "./adapters/base";
import type { OnProgress } from "./types";
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
  onProgress?: OnProgress;
  round?: number;
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
  const fireProgress = (slot: AgentSlot, response: AgentResponse) => {
    try {
      request.onProgress?.({ round: request.round ?? 0, fighter: slot.id, response });
    } catch {}
  };
  let responses: AgentResponse[];

  if (request.mode === "parallel") {
    const promises = pairs.map(({ slot, adapter }) =>
      executeSlot(slot, adapter, request.buildRequest(slot)).then((r) => {
        fireProgress(slot, r);
        return r;
      }),
    );
    responses = await Promise.all(promises);
  } else {
    responses = [];
    for (const { slot, adapter } of pairs) {
      const r = await executeSlot(slot, adapter, request.buildRequest(slot));
      fireProgress(slot, r);
      responses.push(r);
    }
  }

  const failed = responses.filter((r) => r.error).map((r) => r.agent);
  return { responses, failed };
}

export interface OrchestrationOptions {
  onRound?: (round: number, responses: AgentResponse[]) => void;
  history_window?: number | null;
  onProgress?: OnProgress;
}

export async function orchestrateRounds(
  slots: AgentSlot[],
  rounds: number,
  mode: ExecutionMode,
  buildRequest: (slot: AgentSlot, round: number, history: AgentResponse[]) => AgentRequest,
  onRound?: (round: number, responses: AgentResponse[]) => void,
  options?: { history_window?: number | null; onProgress?: OnProgress },
): Promise<AgentResponse[][]> {
  const allRounds: AgentResponse[][] = [];
  const history: AgentResponse[] = [];

  for (let round = 1; round <= rounds; round++) {
    const window = options?.history_window;
    const visibleHistory = window ? history.slice(-(window * slots.length)) : history;
    const result = await orchestrate({
      slots,
      mode,
      round,
      onProgress: options?.onProgress,
      buildRequest: (slot) => buildRequest(slot, round, visibleHistory),
    });
    allRounds.push(result.responses);
    history.push(...result.responses);
    onRound?.(round, result.responses);
  }

  return allRounds;
}
