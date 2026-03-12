import { unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function agentEnv(): Record<string, string> {
  return { ...process.env, DISABLE_AUTOUPDATER: "1" } as Record<string, string>;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export async function makeTempFile(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `arena-${prefix}-`));
  return join(dir, `output-${Date.now()}.txt`);
}

export async function cleanupTempFile(path: string): Promise<void> {
  try { await unlink(path); } catch { /* ignore */ }
}

export function errorResult(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

export async function whichBinary(name: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", name], { stdout: "pipe", stderr: "ignore" });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

export async function readStderr(proc: { stderr: ReadableStream<Uint8Array> }): Promise<string> {
  const decoder = new TextDecoder();
  const reader = proc.stderr.getReader();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}
