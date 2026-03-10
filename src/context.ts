import { readFile } from "node:fs/promises";
import type { ContextSource } from "./types";

export interface AcquiredContext {
  content: string;
  metadata: { source_type: string; size_bytes: number; file_count?: number };
}

const MAX_CONTEXT_SIZE = 1_000_000;

export async function acquireContext(sources: ContextSource[]): Promise<AcquiredContext> {
  const parts: string[] = [];
  let totalSize = 0;
  let fileCount = 0;

  for (const source of sources) {
    let content: string;

    switch (source.type) {
      case "raw":
        content = source.code ?? "";
        break;
      case "file_list": {
        const root = source.root || process.cwd();
        const contents: string[] = [];
        for (const p of source.paths ?? []) {
          const fullPath = p.startsWith("/") ? p : `${root}/${p}`;
          try {
            const fc = await readFile(fullPath, "utf-8");
            contents.push(`=== ${p} ===\n${fc}\n`);
          } catch (err) {
            throw new Error(`Failed to read file ${p}: ${err}`);
          }
        }
        content = contents.join("\n");
        fileCount += (source.paths ?? []).length;
        break;
      }
      case "git_ref": {
        const root = source.root || process.cwd();
        const proc = Bun.spawn(["git", "show", source.ref!], { cwd: root, stdout: "pipe", stderr: "pipe" });
        const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
        if (await proc.exited !== 0) throw new Error(`git show failed: ${stderr.slice(0, 200)}`);
        content = stdout;
        break;
      }
      case "git_range": {
        const root = source.root || process.cwd();
        const proc = Bun.spawn(["git", "diff", source.from!, source.to!], { cwd: root, stdout: "pipe", stderr: "pipe" });
        const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
        if (await proc.exited !== 0) throw new Error(`git diff failed: ${stderr.slice(0, 200)}`);
        content = stdout;
        break;
      }
      case "patch_file":
        try { content = await readFile(source.path!, "utf-8"); }
        catch (err) { throw new Error(`Failed to read patch file ${source.path}: ${err}`); }
        break;
      default:
        throw new Error(`Unsupported source type: ${(source as ContextSource).type}`);
    }

    totalSize += content.length;
    if (totalSize > MAX_CONTEXT_SIZE) {
      throw new Error(`Context size ${(totalSize / 1_000_000).toFixed(2)}MB exceeds limit`);
    }
    parts.push(content);
  }

  return {
    content: parts.join("\n\n"),
    metadata: { source_type: sources.map((s) => s.type).join("+"), size_bytes: totalSize, file_count: fileCount || undefined },
  };
}
