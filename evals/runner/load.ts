import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CaseSchema, ManifestSchema, type Case, type Manifest } from "./schema";
import { CASES_DIR } from "./paths";

export async function loadCase(caseRelPath: string): Promise<{ case: Case; absPath: string }> {
  const abs = resolve(CASES_DIR, caseRelPath);
  const mod = await import(pathToFileURL(abs).href);
  const raw = mod.default ?? mod.case ?? mod;
  const parsed = CaseSchema.safeParse(raw);
  if (!parsed.success) {
    const errs = parsed.error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`Invalid case at ${caseRelPath}:\n${errs}`);
  }
  return { case: parsed.data, absPath: abs };
}

export async function loadManifest(): Promise<Manifest> {
  const abs = resolve(CASES_DIR, "manifest.ts");
  const mod = await import(pathToFileURL(abs).href);
  const raw = mod.default ?? mod;
  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) {
    const errs = parsed.error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`Invalid manifest:\n${errs}`);
  }
  return parsed.data;
}

export interface PlannedCase {
  path: string;
  tags: string[];
}

export function filterByTags(
  cases: PlannedCase[],
  include?: string[],
  exclude?: string[],
): PlannedCase[] {
  let out = cases;
  if (include?.length) {
    out = out.filter((c) => include.some((t) => c.tags.includes(t)));
  }
  if (exclude?.length) {
    out = out.filter((c) => !exclude.some((t) => c.tags.includes(t)));
  }
  return out;
}

export function shard<T>(items: T[], shardSize: number): T[][] {
  if (shardSize <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += shardSize) {
    out.push(items.slice(i, i + shardSize));
  }
  return out;
}
