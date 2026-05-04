import { spawnProcess, readStdout } from "../../src/utils";

async function gitShortSha(): Promise<string | undefined> {
  try {
    const proc = spawnProcess(["git", "rev-parse", "--short", "HEAD"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const out = await readStdout(proc);
    await proc.exited;
    if (proc.exitCode !== 0) return undefined;
    return out.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function gitDirty(): Promise<boolean> {
  try {
    const proc = spawnProcess(["git", "status", "--porcelain"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const out = await readStdout(proc);
    await proc.exited;
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

export interface RunIdParts {
  runId: string;
  sha?: string;
  dirty: boolean;
  timestamp: string;
}

export async function generateRunId(): Promise<RunIdParts> {
  const now = new Date();
  // ISO: 2026-05-04T08:30:45.123Z
  // We want minute precision: 2026-05-04T0830
  const iso = now.toISOString();
  const ts = `${iso.slice(0, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}`;
  const sha = await gitShortSha();
  const dirty = await gitDirty();
  const parts = [ts];
  if (sha) parts.push(sha);
  if (dirty) parts.push("dirty");
  return { runId: parts.join("-"), sha, dirty, timestamp: now.toISOString() };
}
