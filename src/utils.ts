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
  },
): SpawnedProcess {
  const [cmd, ...rest] = args;
  const proc = nodeSpawn(cmd, rest, {
    cwd: options.cwd,
    env: options.env,
    stdio: [
      "ignore",
      options.stdout === "ignore" ? "ignore" : "pipe",
      options.stderr === "ignore" ? "ignore" : "pipe",
    ],
  });

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
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
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
