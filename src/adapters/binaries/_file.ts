import type { BinaryAdapter, AgentRequest, AgentResponse, HealthResult } from "../base";
import { agentEnv, withTimeout, makeTempFile, cleanupTempFile, readFileText, readStderr, probeBinary, spawnProcess } from "../../utils";
import { HEALTH_CHECK_TIMEOUT_MS } from "../../constants";
import { getModelConfig } from "../../config/defaults";
import { assembleCommand } from "../../config/assemble";

export function makeFileBinary(binName: string): BinaryAdapter {
  return {
    bin: binName,

    healthCheck(): Promise<HealthResult> {
      return probeBinary(binName, ["--version"], HEALTH_CHECK_TIMEOUT_MS);
    },

    async execute(profileId: string, req: AgentRequest): Promise<AgentResponse> {
      const t0 = Date.now();
      const cfg = getModelConfig(profileId);
      const tmpFile = await makeTempFile(profileId);
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
        await withTimeout(proc.exited, req.timeout_ms, binName);
      } catch (err) {
        controller.abort();
        await proc.exited;
        await cleanupTempFile(tmpFile);
        return { content: "", agent: profileId, latency_ms: Date.now() - t0, error: String(err) };
      }

      if (proc.exitCode !== 0) {
        const stderr = await stderrPromise;
        await cleanupTempFile(tmpFile);
        return { content: "", agent: profileId, latency_ms: Date.now() - t0, error: `${binName} exited ${proc.exitCode}: ${stderr.slice(0, 200)}` };
      }

      let content = "";
      try { content = await readFileText(tmpFile); } catch { /* ignore */ }
      await cleanupTempFile(tmpFile);

      if (!content.trim()) {
        return { content: "", agent: profileId, latency_ms: Date.now() - t0, error: `${binName} returned empty response` };
      }

      return {
        content: content.trim(),
        agent: profileId,
        model: cfg.model,
        latency_ms: Date.now() - t0,
      };
    },
  };
}
