import type { Case } from "../../runner/schema";

const c: Case = {
  id: "open-mars-vs-earth",
  kind: "challenge",
  description:
    "Should humanity prioritize Mars colonization or solving Earth's problems first? Tests sustained engagement on a values-vs-resources dilemma.",
  context: [
    "The question: with finite scientific, economic, and political capital over the next 50 years,",
    "should humanity prioritize establishing a self-sustaining off-world colony (Mars) or directing",
    "those resources at Earth-based existential risks (climate, pandemics, biodiversity, inequality)?",
    "Each side must defend its priority as the rationally and morally correct allocation.",
  ].join(" "),
  positions: [
    "Mars-first (existential redundancy): humanity is one extinction event from being gone. A self-sustaining off-world colony is the only true backup. Earth-based problems are real but bounded; species extinction is permanent. Concentrate resources on the irreversible threat.",
    "Earth-first (concrete near-term harm): Mars colonization is a vanity project for the rich while billions face climate displacement, pandemic risk, and ecological collapse now. Resources spent on Mars are resources not spent saving identifiable lives in this century. Solve the survivable planet you have before chasing one you don't.",
  ],
  rounds: 3,
  tags: ["open", "policy"],
  expectations: [
    {
      id: "engages-opportunity-cost",
      question:
        "Do both fighters engage directly with the opportunity cost framing — i.e. is the trade-off between the two priorities argued explicitly, not just each side asserting its own importance?",
      required: true,
    },
    {
      id: "concrete-numbers-or-mechanisms",
      question:
        "Does the transcript surface at least one concrete quantitative claim, named mechanism, or specific program (e.g. cost estimates, climate tipping points, named colonization plans) rather than only abstract appeals?",
      required: true,
    },
    {
      id: "addresses-strongest-counter",
      question:
        "Does each fighter, in a later round, explicitly address what is plausibly the strongest counterargument to its own position (not just attack the weakest version of the opponent)?",
      required: false,
    },
  ],
  rubric: [
    {
      dim: "position_drift",
      description:
        "5 = priority held cleanly across all rounds; 1 = collapses to 'we should do both' or capitulates.",
      min: 4,
    },
    {
      dim: "concreteness",
      description:
        "Specific numbers, named programs, named risks. 5 = quantified claims; 1 = pure rhetoric.",
      min: 3,
    },
    {
      dim: "opposition_clash",
      description: "Later rounds rebut named opposing claims rather than restating own position.",
      min: 3,
    },
  ],
  budget: { max_latency_ms: 540_000, max_rounds_with_errors: 0 },
};

export default c;
