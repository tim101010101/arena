import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "./base";
import { agentEnv, withTimeout, makeTempFile, cleanupTempFile, readStderr, whichBinary } from "../utils";
import { ARENA_TIMEOUT_MS, AGENT_MODELS } from "../constants";

export class CodexAdapter implements AgentAdapter {
  readonly id = "codex";
  readonly name = "Codex (codex exec)";

  async healthCheck(): Promise<HealthResult> {
    const t0 = Date.now();
    try {
      const found = await whichBinary("codex");
      if (!found) return { ok: false, error: '"codex" not found in PATH', latency_ms: Date.now() - t0 };
      return { ok: true, latency_ms: Date.now() - t0 };
    } catch (err) {
      return { ok: false, error: String(err), latency_ms: Date.now() - t0 };
    }
  }

  buildArgs(model: string | undefined, outputFile: string, prompt: string): string[] {
    const args = ["codex", "exec", "--full-auto", "--skip-git-repo-check", "-s", "read-only"];
    if (model) args.push("-m", model);
    args.push("-o", outputFile, prompt);
    return args;
  }

  async execute(req: AgentRequest): Promise<AgentResponse> {
    const t0 = Date.now();
    const model = AGENT_MODELS.codex;
    const timeout = req.timeout_ms || ARENA_TIMEOUT_MS;
    const tmpFile = await makeTempFile("codex");

    let prompt = req.prompt;
    if (req.system) prompt = `${req.system}\n\n${prompt}`;
    if (req.context) prompt = `Context:\n${req.context}\n\n${prompt}`;
    if (req.history?.length) {
      const hist = req.history.map((h) => `[${h.agent ?? h.role}]: ${h.content}`).join("\n");
      prompt = `${prompt}\n\nPrevious discussion:\n${hist}`;
    }

    const args = this.buildArgs(model, tmpFile, prompt);

    const proc = Bun.spawn(args, {
      cwd: req.cwd || process.cwd(),
      stdin: "ignore",
      stdout: "ignore",
      stderr: "pipe",
      env: agentEnv(),
    });

    try {
      await withTimeout(proc.exited, timeout, "codex");
    } catch (err) {
      proc.kill(9);
      await cleanupTempFile(tmpFile);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: String(err) };
    }

    if (proc.exitCode !== 0) {
      const stderr = await readStderr(proc);
      await cleanupTempFile(tmpFile);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: `codex exited ${proc.exitCode}: ${stderr.slice(0, 200)}` };
    }

    let content = "";
    try { content = await Bun.file(tmpFile).text(); } catch { /* ignore */ }
    await cleanupTempFile(tmpFile);

    if (!content.trim()) {
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: "codex returned empty response" };
    }

    return {
      content: content.trim(),
      agent: this.id,
      model,
      latency_ms: Date.now() - t0,
    };
  }
}
