import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "./base";
import { agentEnv, withTimeout, makeTempFile, cleanupTempFile, readStderr, readFileText, probeBinary, spawnProcess } from "../utils";
import { ARENA_TIMEOUT_MS, AGENT_MODELS, HEALTH_CHECK_TIMEOUT_MS } from "../constants";

export class OpenAIAdapter implements AgentAdapter {
  readonly id = "openai";
  readonly name = "OpenAI (via codex exec)";

  async healthCheck(): Promise<HealthResult> {
    return probeBinary("codex", ["--version"], HEALTH_CHECK_TIMEOUT_MS);
  }

  buildArgs(model: string, outputFile: string, prompt: string): string[] {
    return [
      "codex", "exec",
      "--full-auto",
      "--skip-git-repo-check",
      "-s", "read-only",
      "-c", 'model_provider="openai"',
      "-m", model,
      "-o", outputFile,
      prompt,
    ];
  }

  async execute(req: AgentRequest): Promise<AgentResponse> {
    const t0 = Date.now();
    const model = AGENT_MODELS.openai || "gpt-4.1";
    const timeout = req.timeout_ms || ARENA_TIMEOUT_MS;
    const tmpFile = await makeTempFile("openai");

    let prompt = req.prompt;
    if (req.system) prompt = `${req.system}\n\n${prompt}`;
    if (req.context) prompt = `Context:\n${req.context}\n\n${prompt}`;
    if (req.history?.length) {
      const hist = req.history.map((h) => `[${h.agent ?? h.role}]: ${h.content}`).join("\n");
      prompt = `${prompt}\n\nPrevious discussion:\n${hist}`;
    }

    const args = this.buildArgs(model, tmpFile, prompt);

    const controller = new AbortController();
    const proc = spawnProcess(args, {
      cwd: req.cwd || process.cwd(),
      stdout: "ignore",
      stderr: "pipe",
      env: agentEnv(),
      signal: controller.signal,
    });

    const stderrPromise = readStderr(proc);

    try {
      await withTimeout(proc.exited, timeout, "openai");
    } catch (err) {
      controller.abort();
      await proc.exited;
      await cleanupTempFile(tmpFile);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: String(err) };
    }

    if (proc.exitCode !== 0) {
      const stderr = await stderrPromise;
      await cleanupTempFile(tmpFile);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: `codex (openai) exited ${proc.exitCode}: ${stderr.slice(0, 200)}` };
    }

    let content = "";
    try { content = await readFileText(tmpFile); } catch { /* ignore */ }
    await cleanupTempFile(tmpFile);

    if (!content.trim()) {
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: "openai returned empty response" };
    }

    return {
      content: content.trim(),
      agent: this.id,
      model,
      latency_ms: Date.now() - t0,
    };
  }
}
