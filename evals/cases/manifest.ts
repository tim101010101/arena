import type { Manifest } from "../runner/schema";

const manifest: Manifest = {
  run_defaults: {
    repeats: 1,
    shard_size: 1,
    max_parallel_subagents: 4,
  },
  cases: [
    { path: "code/sql-injection-001.ts", tags: ["code", "security", "smoke"] },
    { path: "code/off-by-one-002.ts", tags: ["code", "bugs", "smoke"] },
    { path: "open/trolley-problem.ts", tags: ["open", "ethics"] },
    { path: "open/mars-vs-earth.ts", tags: ["open", "policy"] },
    { path: "technical-debate/monolith-vs-microservices.ts", tags: ["debate", "architecture"] },
    { path: "technical-debate/rust-rewrite.ts", tags: ["debate", "engineering"] },
  ],
};

export default manifest;
