import { unlink, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn as nodeSpawn } from "node:child_process";

export interface SpawnedProcess {
  exited: Promise<void>;
  exitCode: number | null;
  stdout: NodeJS.ReadableStream | null;
  stderr: NodeJS.ReadableStream | null;
  kill(signal?: number): void;
}

export function spawnProcess(
  args: string[],
  options: {
    cwd?: string;
    env?: Record<string, string>;
    stdout?: "pipe" | "ignore";
    stderr?: "pipe" | "ignore";
    signal?: AbortSignal;
  },
): SpawnedProcess {
  const [cmd, ...rest] = args;
  const proc = nodeSpawn(cmd, rest, {
    cwd: options.cwd,
    env: options.env,
    signal: options.signal,
    killSignal: "SIGKILL",
    stdio: [
      "ignore",
      options.stdout === "ignore" ? "ignore" : "pipe",
      options.stderr === "ignore" ? "ignore" : "pipe",
    ],
  });

  // Swallow the AbortError node emits when `signal` aborts; callers learn the
  // outcome via `exited` + `exitCode` instead.
  proc.on("error", () => {});

  let exitCode: number | null = null;
  const exited = new Promise<void>((resolve) => {
    proc.on("close", (code) => {
      exitCode = code;
      resolve();
    });
  });

  return {
    exited,
    get exitCode() { return exitCode; },
    stdout: proc.stdout,
    stderr: proc.stderr,
    kill: (signal?: number) => { proc.kill(signal ?? 9); },
  };
}

function collectStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString("utf8"));
    };
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", finish);
    stream.on("close", finish);
    stream.on("error", finish);
  });
}

export async function readStdout(proc: SpawnedProcess): Promise<string> {
  if (!proc.stdout) return "";
  return collectStream(proc.stdout);
}

export async function readStderr(proc: SpawnedProcess): Promise<string> {
  if (!proc.stderr) return "";
  return collectStream(proc.stderr);
}

export async function readFileText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export function agentEnv(): Record<string, string> {
  const env = { ...process.env, DISABLE_AUTOUPDATER: "1" } as Record<string, string>;
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
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
    const proc = spawnProcess(["which", name], { stdout: "ignore", stderr: "ignore" });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

export async function probeBinary(
  name: string,
  args: string[],
  timeoutMs: number,
): Promise<{ ok: boolean; error?: string; latency_ms: number }> {
  const t0 = Date.now();
  const found = await whichBinary(name);
  if (!found) {
    return { ok: false, error: `"${name}" not found in PATH`, latency_ms: Date.now() - t0 };
  }

  const controller = new AbortController();
  const proc = spawnProcess([name, ...args], {
    stdout: "ignore",
    stderr: "pipe",
    signal: controller.signal,
  });
  const stderrPromise = readStderr(proc);

  try {
    await withTimeout(proc.exited, timeoutMs, `${name} probe`);
  } catch (err) {
    controller.abort();
    await proc.exited;
    return { ok: false, error: String(err), latency_ms: Date.now() - t0 };
  }

  if (proc.exitCode !== 0) {
    const stderr = await stderrPromise;
    return {
      ok: false,
      error: `${name} probe exited ${proc.exitCode}: ${stderr.slice(0, 200)}`,
      latency_ms: Date.now() - t0,
    };
  }
  return { ok: true, latency_ms: Date.now() - t0 };
}
