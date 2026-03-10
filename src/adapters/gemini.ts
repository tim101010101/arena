import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "./base";
import { agentEnv, withTimeout, readStderr, whichBinary } from "../utils";
import { ARENA_TIMEOUT_MS, AGENT_MODELS } from "../constants";

export class GeminiAdapter implements AgentAdapter {
  readonly id = "gemini";
  readonly name = "Gemini (gemini CLI)";

  async healthCheck(): Promise<HealthResult> {
    const t0 = Date.now();
    try {
      const found = await whichBinary("gemini");
      if (!found) return { ok: false, error: '"gemini" not found in PATH, install it first', latency_ms: Date.now() - t0 };
      return { ok: true, latency_ms: Date.now() - t0 };
    } catch (err) {
      return { ok: false, error: String(err), latency_ms: Date.now() - t0 };
    }
  }

  buildArgs(req: AgentRequest): string[] {
    const model = AGENT_MODELS.gemini;
    const args = ["gemini"];
    if (model) args.push("--model", model);

    let prompt = req.prompt;
    if (req.system) prompt = `${req.system}\n\n${prompt}`;
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
      await withTimeout(proc.exited, timeout, "gemini");
    } catch (err) {
      proc.kill(9);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: String(err) };
    }

    if (proc.exitCode !== 0) {
      const stderr = await readStderr(proc);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: `gemini exited ${proc.exitCode}: ${stderr.slice(0, 200)}` };
    }

    const content = await new Response(proc.stdout).text();
    if (!content.trim()) {
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: "gemini returned empty response" };
    }

    return {
      content: content.trim(),
      agent: this.id,
      model: AGENT_MODELS.gemini ?? "default",
      latency_ms: Date.now() - t0,
    };
  }
}
