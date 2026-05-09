import type { ScenarioConfig } from "../config/scenarios";
import { BUILTIN_SCENARIOS } from "../config/scenarios";

export type ReviewFocus = "bugs" | "security" | "performance" | "readability";

export function reviewPositions(
  focus?: string[],
  scenario: ScenarioConfig = BUILTIN_SCENARIOS.review,
): string[] {
  if (!scenario.focus_positions) {
    throw new Error("review scenario requires focus_positions");
  }
  const requested = focus?.length ? focus : (scenario.default_focus ?? []);
  if (requested.length === 0) {
    throw new Error("review requires at least one focus");
  }

  const positions: string[] = [];
  for (const f of requested) {
    const p = scenario.focus_positions[f];
    if (!p) throw new Error(`unknown focus: ${f}`);
    positions.push(p);
  }

  if (positions.length < 2) {
    throw new Error("review requires at least 2 focus values for an adversarial pair");
  }
  return positions;
}
