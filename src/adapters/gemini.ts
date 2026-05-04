import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "./base";
import { agentEnv, withTimeout, readStdout, readStderr, probeBinary, spawnProcess } from "../utils";
import { ARENA_TIMEOUT_MS, AGENT_MODELS, HEALTH_CHECK_TIMEOUT_MS } from "../constants";

export class GeminiAdapter implements AgentAdapter {
  readonly id = "gemini";
  readonly name = "Gemini (gemini CLI)";

  async healthCheck(): Promise<HealthResult> {
    return probeBinary("gemini", ["--version"], HEALTH_CHECK_TIMEOUT_MS);
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

    const controller = new AbortController();
    const proc = spawnProcess(args, {
      cwd: req.cwd || process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
      env: agentEnv(),
      signal: controller.signal,
    });

    const stdoutPromise = readStdout(proc);
    const stderrPromise = readStderr(proc);

    try {
      await withTimeout(proc.exited, timeout, "gemini");
    } catch (err) {
      controller.abort();
      await proc.exited;
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: String(err) };
    }

    if (proc.exitCode !== 0) {
      const stderr = await stderrPromise;
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: `gemini exited ${proc.exitCode}: ${stderr.slice(0, 200)}` };
    }

    const content = await stdoutPromise;
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
