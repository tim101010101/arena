import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "./base";
import { agentEnv, withTimeout, readStderr, whichBinary } from "../utils";
import { ARENA_TIMEOUT_MS, AGENT_MODELS, HEALTH_CHECK_TIMEOUT_MS } from "../constants";

export class ClaudeAdapter implements AgentAdapter {
  readonly id = "claude";
  readonly name = "Claude (claude -p)";

  async healthCheck(): Promise<HealthResult> {
    const t0 = Date.now();
    try {
      const found = await whichBinary("claude");
      if (!found) return { ok: false, error: '"claude" not found in PATH', latency_ms: Date.now() - t0 };
      return { ok: true, latency_ms: Date.now() - t0 };
    } catch (err) {
      return { ok: false, error: String(err), latency_ms: Date.now() - t0 };
    }
  }

  buildArgs(req: AgentRequest): string[] {
    const model = AGENT_MODELS.claude;
    const args = ["claude", "-p", "--output-format", "text", "--no-session-persistence"];
    if (model) args.push("--model", model);
    args.push("--allowedTools", "Read,Glob,Grep,Bash(git:*)");
    if (req.system) args.push("--system-prompt", req.system);

    let prompt = req.prompt;
    if (req.context) prompt = `Context:\n${req.context}\n\n${prompt}`;
    if (req.history?.length) {
      const hist = req.history.map((h) => `[${h.agent ?? h.role}]: ${h.content}`).join("\n");
      prompt = `${prompt}\n\nPrevious discussion:\n${hist}`;
    }
    args.push(prompt);
    return args;
  }

  async execute(req: AgentRequest): Promise<AgentResponse> {
    const t0 = Date.now();
    const timeout = req.timeout_ms || ARENA_TIMEOUT_MS;
    const args = this.buildArgs(req);

    const proc = Bun.spawn(args, {
      cwd: req.cwd || process.cwd(),
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      env: agentEnv(),
    });

    try {
      await withTimeout(proc.exited, timeout, "claude");
    } catch (err) {
      proc.kill(9);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: String(err) };
    }

    if (proc.exitCode !== 0) {
      const stderr = await readStderr(proc);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: `claude exited ${proc.exitCode}: ${stderr.slice(0, 200)}` };
    }

    const content = await new Response(proc.stdout).text();
    if (!content.trim()) {
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: "claude returned empty response" };
    }

    return {
      content: content.trim(),
      agent: this.id,
      model: AGENT_MODELS.claude ?? "default",
      latency_ms: Date.now() - t0,
    };
  }
}
