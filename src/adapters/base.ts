import type { HistoryEntry } from "../types";

export interface AgentRequest {
  system?: string;
  prompt: string;
  context?: string;
  cwd?: string;
  history?: HistoryEntry[];
  timeout_ms: number;
}

export interface AgentResponse {
  content: string;
  agent: string;
  model?: string;
  latency_ms: number;
  error?: string;
}

export interface HealthResult {
  ok: boolean;
  error?: string;
  latency_ms: number;
}

export interface AgentAdapter {
  readonly id: string;
  readonly name: string;
  healthCheck(): Promise<HealthResult>;
  execute(req: AgentRequest): Promise<AgentResponse>;
}
