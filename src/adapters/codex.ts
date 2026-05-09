import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "./base";
import { agentEnv, withTimeout, makeTempFile, cleanupTempFile, readStderr, readFileText, probeBinary, spawnProcess } from "../utils";
import { ARENA_TIMEOUT_MS, AGENT_MODELS, HEALTH_CHECK_TIMEOUT_MS } from "../constants";
import { getModelConfig } from "../config/defaults";
import { assembleCommand } from "../config/assemble";
import { renderCommand } from "../config/template";

export class CodexAdapter implements AgentAdapter {
  readonly id = "codex";
  readonly name = "Codex (codex exec)";

  async healthCheck(): Promise<HealthResult> {
    return probeBinary("codex", ["--version"], HEALTH_CHECK_TIMEOUT_MS);
  }

  buildArgs(model: string | undefined, outputFile: string, prompt: string): string[] {
    const cfg = getModelConfig(this.id);
    return renderCommand(cfg.command, {
      bin: cfg.bin,
      model,
      prompt,
      output_file: outputFile,
    });
  }

  async execute(req: AgentRequest): Promise<AgentResponse> {
    const t0 = Date.now();
    const timeout = req.timeout_ms || ARENA_TIMEOUT_MS;
    const tmpFile = await makeTempFile("codex");
    const cfg = { ...getModelConfig(this.id), model: AGENT_MODELS.codex };
    const { args } = assembleCommand(cfg, req, tmpFile);

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
      await withTimeout(proc.exited, timeout, "codex");
    } catch (err) {
      controller.abort();
      await proc.exited;
      await cleanupTempFile(tmpFile);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: String(err) };
    }

    if (proc.exitCode !== 0) {
      const stderr = await stderrPromise;
      await cleanupTempFile(tmpFile);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: `codex exited ${proc.exitCode}: ${stderr.slice(0, 200)}` };
    }

    let content = "";
    try { content = await readFileText(tmpFile); } catch { /* ignore */ }
    await cleanupTempFile(tmpFile);

    if (!content.trim()) {
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: "codex returned empty response" };
    }

    return {
      content: content.trim(),
      agent: this.id,
      model: AGENT_MODELS.codex,
      latency_ms: Date.now() - t0,
    };
  }
}
