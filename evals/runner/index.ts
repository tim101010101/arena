import { mkdir, readdir, readFile, rm, stat, symlink, lstat, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { loadCase, loadManifest, filterByTags, shard } from "./load";
import { executeCase } from "./execute";
import { generateRunId } from "./run-id";
import { aggregate, renderSummaryTable } from "./aggregate";
import {
  CASES_DIR,
  REPORTS_DIR,
  RUBRIC_PATH,
  rawPath,
  reportRunDir,
  summaryPath,
} from "./paths";

interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          flags[a.slice(2)] = next;
          i++;
        } else {
          flags[a.slice(2)] = true;
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function csv(value: string | boolean | undefined): string[] | undefined {
  if (typeof value !== "string") return undefined;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

async function rubricHash(): Promise<string> {
  try {
    const buf = await readFile(RUBRIC_PATH);
    const h = createHash("sha256").update(buf).digest("hex");
    return `sha256:${h.slice(0, 16)}`;
  } catch {
    return "sha256:missing";
  }
}

async function updateLatestSymlink(runId: string): Promise<void> {
  const link = resolve(REPORTS_DIR, "latest");
  try {
    const s = await lstat(link);
    if (s.isSymbolicLink() || s.isFile() || s.isDirectory()) await unlink(link);
  } catch {
    // ignore
  }
  try {
    await symlink(runId, link, "dir");
  } catch {
    // best-effort; symlinks may fail on some filesystems
  }
}

const HELP = `arena-eval — local evaluation harness for arena

Usage:
  bun evals/runner plan       [--tags a,b] [--exclude-tags x,y] [--run-id ID]
  bun evals/runner run        --case <relpath> --run-id ID --out <path>
                              [--only-models a,b]
  bun evals/runner run-all    [--tags ...] [--exclude-tags ...] [--run-id ID]
                              [--only-models a,b]
                              # executes all matching cases inline (single-process,
                              # no judging — useful for smoke tests). Subagents
                              # invoked via the skill normally call \`run\` per case.
  bun evals/runner aggregate  --run-id ID
  bun evals/runner list                          # list available runs
  bun evals/runner show       --run-id ID        # print summary table
  bun evals/runner prune      --keep N           # keep N most-recent runs
  bun evals/runner rubric-hash                   # print rubric hash + path

Notes:
  - Cases live under evals/cases/, manifest at evals/cases/manifest.ts
  - Reports land in evals/reports/<run-id>/ (gitignored)
  - The judging step is performed by Claude Code subagents via the
    \`arena-eval\` skill, not this CLI.
`;

async function cmdPlan(args: ParsedArgs): Promise<void> {
  const manifest = await loadManifest();
  const include = csv(args.flags["tags"]);
  const exclude = csv(args.flags["exclude-tags"]);
  const filtered = filterByTags(manifest.cases, include, exclude);
  const runId = (args.flags["run-id"] as string | undefined) ?? (await generateRunId()).runId;
  const shards = shard(filtered, manifest.run_defaults.shard_size);
  const rh = await rubricHash();

  const plan = {
    run_id: runId,
    judge_rubric_hash: rh,
    judge_rubric_path: RUBRIC_PATH,
    cases_dir: CASES_DIR,
    reports_dir: reportRunDir(runId),
    run_defaults: manifest.run_defaults,
    shards: shards.map((s, i) => ({
      shard_index: i,
      cases: s.map((c) => ({
        path: c.path,
        case_abs: resolve(CASES_DIR, c.path),
        tags: c.tags,
        raw_out: rawPath(runId, basenameNoExt(c.path)),
      })),
    })),
  };

  await mkdir(reportRunDir(runId), { recursive: true });
  console.log(JSON.stringify(plan, null, 2));
}

function basenameNoExt(p: string): string {
  return p.replace(/^.*\//, "").replace(/\.ts$/, "");
}

async function cmdRun(args: ParsedArgs): Promise<void> {
  const caseRel = args.flags["case"] as string | undefined;
  const runId = args.flags["run-id"] as string | undefined;
  const out = args.flags["out"] as string | undefined;
  if (!caseRel || !runId || !out) {
    throw new Error("`run` requires --case, --run-id, and --out");
  }
  const onlyModels = csv(args.flags["only-models"]);
  const { case: c } = await loadCase(caseRel);
  await mkdir(reportRunDir(runId), { recursive: true });
  const raw = await executeCase({ case: c, caseRelPath: caseRel, runId, outPath: out, onlyModels });
  console.log(
    JSON.stringify(
      {
        case_id: raw.case_id,
        out: out,
        rounds_completed: raw.structural.rounds_completed,
        errors: raw.structural.errors.length,
        total_latency_ms: raw.structural.total_latency_ms,
      },
      null,
      2,
    ),
  );
}

async function cmdRunAll(args: ParsedArgs): Promise<void> {
  const manifest = await loadManifest();
  const include = csv(args.flags["tags"]);
  const exclude = csv(args.flags["exclude-tags"]);
  const filtered = filterByTags(manifest.cases, include, exclude);
  const runId = (args.flags["run-id"] as string | undefined) ?? (await generateRunId()).runId;
  const onlyModels = csv(args.flags["only-models"]);
  await mkdir(reportRunDir(runId), { recursive: true });

  for (const entry of filtered) {
    const { case: c } = await loadCase(entry.path);
    const id = basenameNoExt(entry.path);
    const out = rawPath(runId, id);
    process.stderr.write(`[run-all] ${id}\n`);
    await executeCase({ case: c, caseRelPath: entry.path, runId, outPath: out, onlyModels });
  }
  await updateLatestSymlink(runId);
  console.log(JSON.stringify({ run_id: runId, count: filtered.length }, null, 2));
}

async function cmdAggregate(args: ParsedArgs): Promise<void> {
  const runId = args.flags["run-id"] as string | undefined;
  if (!runId) throw new Error("`aggregate` requires --run-id");
  const summary = await aggregate(runId);
  await updateLatestSymlink(runId);
  console.log(renderSummaryTable(summary));
  console.log(`\nSummary written to ${summaryPath(runId)}`);
}

async function cmdList(): Promise<void> {
  try {
    await stat(REPORTS_DIR);
  } catch {
    console.log("(no runs yet)");
    return;
  }
  const entries = await readdir(REPORTS_DIR);
  const dirs: string[] = [];
  for (const e of entries) {
    if (e === "latest") continue;
    const s = await stat(resolve(REPORTS_DIR, e));
    if (s.isDirectory()) dirs.push(e);
  }
  dirs.sort().reverse();
  for (const d of dirs) console.log(d);
}

async function cmdShow(args: ParsedArgs): Promise<void> {
  const runId = args.flags["run-id"] as string | undefined;
  if (!runId) throw new Error("`show` requires --run-id");
  const path = summaryPath(runId);
  const raw = await readFile(path, "utf8");
  const summary = JSON.parse(raw);
  console.log(renderSummaryTable(summary));
}

async function cmdPrune(args: ParsedArgs): Promise<void> {
  const keepRaw = args.flags["keep"];
  const keep = typeof keepRaw === "string" ? Number(keepRaw) : 10;
  if (!Number.isFinite(keep) || keep < 0) throw new Error("--keep must be a non-negative integer");
  try {
    await stat(REPORTS_DIR);
  } catch {
    console.log("(nothing to prune)");
    return;
  }
  const entries = await readdir(REPORTS_DIR);
  const dirs: string[] = [];
  for (const e of entries) {
    if (e === "latest") continue;
    const s = await stat(resolve(REPORTS_DIR, e));
    if (s.isDirectory()) dirs.push(e);
  }
  dirs.sort().reverse();
  const drop = dirs.slice(keep);
  for (const d of drop) {
    await rm(resolve(REPORTS_DIR, d), { recursive: true, force: true });
    console.log(`removed ${d}`);
  }
  // clear dangling `latest` symlink if it points at a deleted run
  const link = resolve(REPORTS_DIR, "latest");
  try {
    const s = await lstat(link);
    if (s.isSymbolicLink()) {
      try {
        await stat(link); // dereferences symlink — throws if dangling
      } catch {
        await unlink(link);
        console.log("cleared dangling latest symlink");
      }
    }
  } catch {
    // no symlink or not accessible — ignore
  }
  console.log(`kept ${Math.min(keep, dirs.length)} of ${dirs.length} runs`);
}

async function cmdRubricHash(): Promise<void> {
  const h = await rubricHash();
  console.log(JSON.stringify({ path: RUBRIC_PATH, hash: h }, null, 2));
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    console.log(HELP);
    return 0;
  }
  const [sub, ...rest] = argv;
  const args = parseArgs(rest);

  switch (sub) {
    case "plan":
      await cmdPlan(args);
      return 0;
    case "run":
      await cmdRun(args);
      return 0;
    case "run-all":
      await cmdRunAll(args);
      return 0;
    case "aggregate":
      await cmdAggregate(args);
      return 0;
    case "list":
      await cmdList();
      return 0;
    case "show":
      await cmdShow(args);
      return 0;
    case "prune":
      await cmdPrune(args);
      return 0;
    case "rubric-hash":
      await cmdRubricHash();
      return 0;
    default:
      console.error(`Unknown subcommand: ${sub}\n`);
      console.error(HELP);
      return 1;
  }
}

if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    });
}
