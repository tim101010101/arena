import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "./base";
import {
  agentEnv,
  withTimeout,
  makeTempFile,
  cleanupTempFile,
  readStdout,
  readStderr,
  readFileText,
  probeBinary,
  spawnProcess,
} from "../utils";
import { ARENA_TIMEOUT_MS, HEALTH_CHECK_TIMEOUT_MS } from "../constants";
import { getModelConfig } from "../config/defaults";
import { assembleCommand } from "../config/assemble";

export class GenericAdapter implements AgentAdapter {
  readonly id: string;
  readonly name: string;
  private readonly bin: string;

  constructor(id: string, bin: string) {
    this.id = id;
    this.name = `${id} (${bin})`;
    this.bin = bin;
  }

  async healthCheck(): Promise<HealthResult> {
    return probeBinary(this.bin, ["--version"], HEALTH_CHECK_TIMEOUT_MS);
  }

  async execute(req: AgentRequest): Promise<AgentResponse> {
    const t0 = Date.now();
    const cfg = getModelConfig(this.id);
    const timeout = req.timeout_ms || ARENA_TIMEOUT_MS;
    const isFile = cfg.command.output.via === "file";
    const tmpFile = isFile
      ? await makeTempFile(
          cfg.command.output.via === "file" ? (cfg.command.output.tmp_prefix ?? this.id) : this.id,
        )
      : undefined;

    const { args } = assembleCommand(cfg, req, tmpFile);
    const controller = new AbortController();
    const proc = spawnProcess(args, {
      cwd: req.cwd || process.cwd(),
      stdout: isFile ? "ignore" : "pipe",
      stderr: "pipe",
      env: agentEnv(),
      signal: controller.signal,
    });

    const stdoutPromise = isFile ? null : readStdout(proc);
    const stderrPromise = readStderr(proc);

    try {
      await withTimeout(proc.exited, timeout, this.id);
    } catch (err) {
      controller.abort();
      await proc.exited;
      if (tmpFile) await cleanupTempFile(tmpFile);
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: String(err) };
    }

    if (proc.exitCode !== 0) {
      const stderr = await stderrPromise;
      if (tmpFile) await cleanupTempFile(tmpFile);
      return {
        content: "",
        agent: this.id,
        latency_ms: Date.now() - t0,
        error: `${this.id} exited ${proc.exitCode}: ${stderr.slice(0, 200)}`,
      };
    }

    let content = "";
    if (isFile && tmpFile) {
      try {
        content = await readFileText(tmpFile);
      } catch {
        /* ignore */
      }
      await cleanupTempFile(tmpFile);
    } else if (stdoutPromise) {
      content = await stdoutPromise;
    }

    if (!content.trim()) {
      return { content: "", agent: this.id, latency_ms: Date.now() - t0, error: `${this.id} returned empty response` };
    }

    return { content: content.trim(), agent: this.id, model: cfg.model, latency_ms: Date.now() - t0 };
  }
}
