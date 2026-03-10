import type { AgentResponse } from "./adapters/base";

export interface SessionRound {
  round: number;
  responses: AgentResponse[];
}

export interface Session {
  id: string;
  tool: string;
  agents: string[];
  rounds: SessionRound[];
  created_at: number;
  metadata?: Record<string, unknown>;
}

class SessionManager {
  private sessions = new Map<string, Session>();

  create(tool: string, agents: string[], metadata?: Record<string, unknown>): Session {
    const id = `arena-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: Session = { id, tool, agents, rounds: [], created_at: Date.now(), metadata };
    this.sessions.set(id, session);
    return session;
  }

  get(id: string): Session {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    return session;
  }

  addRound(id: string, responses: AgentResponse[]): void {
    const session = this.get(id);
    session.rounds.push({ round: session.rounds.length + 1, responses });
  }

  list(): Session[] {
    return [...this.sessions.values()];
  }
}

export const sessions = new SessionManager();
