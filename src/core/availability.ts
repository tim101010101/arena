import type { HealthResult } from "../adapters/base";

export function availableModels(checks: Record<string, HealthResult>): string[] {
  return Object.entries(checks)
    .filter(([, h]) => h.ok)
    .map(([id]) => id);
}
