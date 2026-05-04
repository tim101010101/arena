import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const RUNNER_DIR = dirname(fileURLToPath(import.meta.url));
export const EVALS_DIR = resolve(RUNNER_DIR, "..");
export const CASES_DIR = resolve(EVALS_DIR, "cases");
export const REPORTS_DIR = resolve(EVALS_DIR, "reports");
export const SKILL_DIR = resolve(EVALS_DIR, "..", ".claude", "skills", "arena-eval");
export const RUBRIC_PATH = resolve(SKILL_DIR, "judge-rubric.md");

export function reportRunDir(runId: string): string {
  return resolve(REPORTS_DIR, runId);
}

export function rawPath(runId: string, caseId: string): string {
  return resolve(reportRunDir(runId), `${caseId}.raw.json`);
}

export function judgedPath(runId: string, caseId: string): string {
  return resolve(reportRunDir(runId), `${caseId}.json`);
}

export function summaryPath(runId: string): string {
  return resolve(reportRunDir(runId), "summary.json");
}
