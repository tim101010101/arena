import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { JudgedReportSchema, RunSummarySchema, type JudgedReport, type RunSummary } from "./schema";
import { reportRunDir, summaryPath } from "./paths";
import { loadManifest } from "./load";

async function readJudged(dir: string): Promise<JudgedReport[]> {
  const entries = await readdir(dir);
  const reports: JudgedReport[] = [];
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    if (name.endsWith(".raw.json")) continue;
    if (name === "summary.json") continue;
    const raw = await readFile(resolve(dir, name), "utf8");
    const parsed = JudgedReportSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(`Invalid judged report ${name}: ${parsed.error.message}`);
    }
    reports.push(parsed.data);
  }
  return reports;
}

export async function aggregate(runId: string): Promise<RunSummary> {
  const dir = reportRunDir(runId);
  await stat(dir);
  const reports = await readJudged(dir);
  if (reports.length === 0) {
    throw new Error(`No judged reports found in ${dir}`);
  }

  const manifest = await loadManifest();
  const tagsByCase = new Map(
    manifest.cases.map((c) => {
      const id = c.path.replace(/^.*\//, "").replace(/\.ts$/, "");
      return [id, c.tags];
    }),
  );

  const passed = reports.filter((r) => r.verdict === "pass").length;
  const failed = reports.length - passed;

  const rubricSum = new Map<string, { sum: number; n: number }>();
  for (const r of reports) {
    for (const dim of r.rubric) {
      const cur = rubricSum.get(dim.dim) ?? { sum: 0, n: 0 };
      cur.sum += dim.score;
      cur.n += 1;
      rubricSum.set(dim.dim, cur);
    }
  }
  const rubric_means: Record<string, number> = {};
  for (const [dim, { sum, n }] of rubricSum) {
    rubric_means[dim] = Number((sum / n).toFixed(2));
  }

  const by_tag: Record<string, { total: number; passed: number }> = {};
  for (const r of reports) {
    const tags = findTags(r.case_id, tagsByCase);
    for (const tag of tags) {
      const cur = by_tag[tag] ?? { total: 0, passed: 0 };
      cur.total += 1;
      if (r.verdict === "pass") cur.passed += 1;
      by_tag[tag] = cur;
    }
  }

  const failures = reports
    .filter((r) => r.verdict === "fail")
    .map((r) => ({ case_id: r.case_id, reasons: r.fail_reasons }));

  const judgeRubricHash = reports[0].judge_rubric_hash;

  const summary: RunSummary = {
    run_id: runId,
    generated_at: new Date().toISOString(),
    judge_rubric_hash: judgeRubricHash,
    total_cases: reports.length,
    passed,
    failed,
    pass_rate: Number((passed / reports.length).toFixed(3)),
    rubric_means,
    by_tag,
    failures,
    case_reports: reports.map((r) => `${r.case_id}.json`),
  };

  const validated = RunSummarySchema.parse(summary);
  await writeFile(summaryPath(runId), JSON.stringify(validated, null, 2), "utf8");
  return validated;
}

function findTags(caseId: string, tagsByCase: Map<string, string[]>): string[] {
  for (const [k, v] of tagsByCase) {
    if (k === caseId) return v;
  }
  return [];
}

export function renderSummaryTable(summary: RunSummary): string {
  const lines: string[] = [];
  lines.push(`Run: ${summary.run_id}`);
  lines.push(
    `Cases: ${summary.total_cases}  Passed: ${summary.passed}  Failed: ${summary.failed}  Pass rate: ${(summary.pass_rate * 100).toFixed(1)}%`,
  );
  lines.push("");
  lines.push("Rubric means:");
  for (const [dim, mean] of Object.entries(summary.rubric_means)) {
    lines.push(`  ${dim.padEnd(20)} ${mean.toFixed(2)}`);
  }
  lines.push("");
  lines.push("By tag:");
  for (const [tag, { total, passed }] of Object.entries(summary.by_tag)) {
    lines.push(`  ${tag.padEnd(16)} ${passed}/${total}`);
  }
  if (summary.failures.length) {
    lines.push("");
    lines.push("Failures:");
    for (const f of summary.failures) {
      lines.push(`  - ${f.case_id}`);
      for (const r of f.reasons) lines.push(`      ${r}`);
    }
  }
  lines.push("");
  lines.push(`Reports dir: evals/reports/${summary.run_id}/`);
  return lines.join("\n");
}
