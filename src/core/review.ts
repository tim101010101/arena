export type ReviewFocus = "bugs" | "security" | "performance" | "readability";

const POSITION_BY_FOCUS: Record<ReviewFocus, string> = {
  bugs: "Hostile reviewer hunting for bugs and logic errors. Find concrete failure cases the author missed.",
  security: "Adversarial security auditor. Attack the code from a threat model: injection, auth bypass, data leaks, supply chain.",
  performance: "Performance critic. Find hot paths, allocations, blocking calls, and complexity surprises that will hurt at scale.",
  readability: "Maintainer two years from now. Find naming, structure, and coupling that will break the next reader.",
};

const DEFAULT_FOCUS: ReviewFocus[] = ["bugs", "security"];

export function reviewPositions(focus?: ReviewFocus[]): string[] {
  const requested = focus?.length ? focus : DEFAULT_FOCUS;
  const positions = requested.map((f) => POSITION_BY_FOCUS[f]);

  if (positions.length < 2) {
    const fallback: ReviewFocus = requested[0] === "bugs" ? "security" : "bugs";
    positions.push(POSITION_BY_FOCUS[fallback]);
  }
  return positions;
}
