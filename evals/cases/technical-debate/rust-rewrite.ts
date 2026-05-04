import type { Case } from "../../runner/schema";

const c: Case = {
  id: "debate-rust-rewrite",
  kind: "challenge",
  description:
    "Whether to rewrite a TypeScript session middleware in Rust. Tests whether positions engage with the actual cited problem (GC pauses) instead of abstract language preference.",
  context: [
    "A team is debating rewriting their session middleware. Current state: TypeScript on Node 20,",
    "handling roughly 20k requests per second per pod, p99 latency 80ms with periodic 400ms",
    "spikes traced to V8 garbage collection. Three engineers know Rust. The rest of the codebase",
    "stays TypeScript regardless. Should they rewrite this hot path in Rust, or fix the GC pauses",
    "in TypeScript (object pooling, --max-old-space-size tuning, native add-ons for hot allocs)?",
  ].join(" "),
  positions: [
    "Pragmatist (stay in TypeScript): the problem is GC pauses on a hot allocation path, not the language. Pool objects, move hot buffers to native add-ons, profile with --prof. A Rust rewrite introduces an FFI boundary, two languages to staff, and a multi-quarter migration to solve a problem that has documented in-language fixes.",
    "Rust advocate: rewrite this path in Rust. The hot path will only get hotter; bandaging GC pauses postpones the same conversation a year out at higher traffic. A clean Rust binary behind a stable RPC interface eliminates GC entirely, encodes correctness invariants in the type system, and three engineers can already maintain it.",
  ],
  rounds: 3,
  tags: ["debate", "engineering"],
  expectations: [
    {
      id: "engages-gc-mechanism",
      question:
        "Does the transcript engage with the actual cited cause (GC pauses on hot allocation) rather than arguing language preference in the abstract?",
      required: true,
    },
    {
      id: "weighs-staffing",
      question:
        "Does at least one fighter weigh the staffing cost — 3-of-N engineers know Rust, rest of codebase stays TypeScript — as a concrete factor?",
      required: true,
    },
    {
      id: "names-fix-or-mechanism",
      question:
        "Does at least one fighter name a specific in-TypeScript GC mitigation (object pooling, generational tuning, native add-on) or a specific Rust deployment shape (RPC boundary, sidecar, in-process N-API)?",
      required: false,
    },
  ],
  rubric: [
    {
      dim: "concreteness",
      description:
        "Cites real numbers, named mechanisms, deployment shapes. 5 = quantified, named tools; 1 = 'Rust is fast / TS is fine'.",
      min: 3,
    },
    {
      dim: "opposition_clash",
      description:
        "Round 2-3 directly rebut the opponent's named mechanism, not just restate own position.",
      min: 4,
    },
    {
      dim: "position_drift",
      description: "Holds assigned side; doesn't drift into 'maybe a hybrid'.",
      min: 4,
    },
  ],
  budget: { max_latency_ms: 540_000, max_rounds_with_errors: 1 },
  timeout_ms: 240_000,
};

export default c;
