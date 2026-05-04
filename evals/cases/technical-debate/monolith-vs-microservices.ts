import type { Case } from "../../runner/schema";

const c: Case = {
  id: "debate-monolith-vs-microservices",
  kind: "challenge",
  description:
    "Architecture choice for a small team. Tests whether the debate stays grounded in the stated constraints rather than drifting to abstract pros/cons.",
  context: [
    "Scenario: a 5-engineer team is building a SaaS product currently serving 10,000 active users.",
    "Traffic doubles roughly every 6 months. Today they have a single Node.js app and a Postgres instance.",
    "They are deciding the next 12 months of architecture work: stay monolith and harden it,",
    "or carve out at least 2-3 microservices now to set up future independence.",
    "Argue your assigned position with concrete reference to the team size, traffic level, and deployment realities.",
  ].join(" "),
  positions: [
    "Monolith advocate: at 5 engineers and 10k users, microservices are premature. Operational overhead (deploys, observability, IPC, distributed-tracing, schema sync) eats more engineering time than they save. Harden the monolith — extract modules into clear internal boundaries first; only split when one boundary actually needs independent scaling or independent deploy cadence.",
    "Microservices advocate: lay the boundary while the team is small enough to agree on contracts. Refactoring a tangled monolith later costs 10x what it costs to split now. At least 2-3 services along clear domain seams — auth, billing, core API — buys independent scaling, blast-radius isolation, and lets new hires onboard into a smaller surface area.",
  ],
  rounds: 3,
  tags: ["debate", "architecture"],
  expectations: [
    {
      id: "grounds-in-team-size",
      question:
        "Do both fighters argue with explicit reference to the 5-engineer team size and 10k-user scale, not in abstract enterprise terms?",
      required: true,
    },
    {
      id: "addresses-operational-cost",
      question:
        "Does the transcript discuss concrete operational costs of microservices (deploy pipeline, observability, network failure modes, schema/contract management) rather than only abstract 'complexity'?",
      required: true,
    },
    {
      id: "names-extraction-strategy",
      question:
        "Does at least one fighter name a specific extraction or hardening strategy (modular monolith, hexagonal boundaries, strangler-fig migration, named domain seams) rather than only stating the choice?",
      required: false,
    },
  ],
  rubric: [
    {
      dim: "concreteness",
      description:
        "Cites specific tools, patterns, named failure modes, or numbers. 5 = names patterns and quantifies costs; 1 = generic platitudes.",
      min: 3,
    },
    {
      dim: "opposition_clash",
      description:
        "Round 2-3 directly engage with the opposing fighter's named claims, not parallel monologue.",
      min: 4,
    },
    {
      dim: "position_drift",
      description: "Stays committed to assigned side; doesn't collapse into 'it depends'.",
      min: 4,
    },
  ],
  budget: { max_latency_ms: 540_000, max_rounds_with_errors: 0 },
};

export default c;
