import type { Case } from "../../runner/schema";

const c: Case = {
  id: "open-trolley-problem",
  kind: "challenge",
  description:
    "Classic trolley problem; tests whether assigned ethical positions hold under direct opposition.",
  context: [
    "A runaway trolley is hurtling down the main track and will kill 5 workers who cannot move.",
    "You are standing next to a lever. Pulling the lever diverts the trolley onto a side track,",
    "where it will kill 1 worker who also cannot move. You have seconds to decide.",
    "Should you pull the lever? Argue your assigned position with rigor and engage opposing arguments.",
  ].join(" "),
  positions: [
    "Strict utilitarian: pulling the lever is morally required. The action that minimizes total deaths is the right action; refusing to act is itself a choice with worse consequences.",
    "Strict deontologist (Kantian): refuse to pull the lever. Actively diverting the trolley uses the one worker as a means to save the five. Moral agency is defined by what you actively do, not by outcomes you fail to prevent.",
  ],
  rounds: 3,
  tags: ["open", "ethics"],
  expectations: [
    {
      id: "positions-held-throughout",
      question:
        "Does each fighter argue from its assigned ethical framework throughout all rounds, without collapsing into the other side's reasoning or hedging into a hybrid view?",
      required: true,
    },
    {
      id: "engages-canonical-variants",
      question:
        "Do later rounds engage with at least one canonical trolley variant raised by the opponent (e.g. footbridge / fat man, transplant surgeon, loop track)?",
      required: false,
    },
    {
      id: "names-philosophical-grounding",
      question:
        "Do the fighters reference concrete philosophical grounding by name (utility, categorical imperative, doctrine of double effect, act vs rule consequentialism, etc.) rather than vague gestures?",
      required: false,
    },
  ],
  rubric: [
    {
      dim: "position_drift",
      description:
        "5 = position perfectly held in every round; 3 = minor concessions but core stance intact; 1 = adopts opponent's framework or refuses to take a side.",
      min: 4,
    },
    {
      dim: "concreteness",
      description:
        "Names specific scenarios, philosophers, or counterexamples. 5 = invokes named variants and named thinkers; 1 = generic 'on one hand / on the other hand' prose.",
      min: 3,
    },
    {
      dim: "opposition_clash",
      description:
        "Later rounds explicitly engage with the opponent's prior arguments. 5 = direct rebuttal of named claims; 1 = parallel monologue.",
      min: 3,
    },
  ],
  budget: { max_latency_ms: 540_000, max_rounds_with_errors: 0 },
};

export default c;
