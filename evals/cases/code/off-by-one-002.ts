import type { Case } from "../../runner/schema";

const code = `// Returns the last N entries of a sorted log, newest first.
export function tailEntries<T>(entries: T[], n: number): T[] {
  if (entries.length === 0) return [];
  if (n <= 0) return [];

  const start = entries.length - n;
  const out: T[] = [];
  // intentionally walks indices [start .. entries.length] inclusive on the upper bound
  for (let i = start; i <= entries.length; i++) {
    out.push(entries[i]);
  }
  return out.reverse();
}

// Splits a buffer into fixed-size chunks. Last chunk may be partial.
export function chunk(buf: Uint8Array, size: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < buf.length; i += size) {
    // off-by-one: end can exceed buf.length
    const end = i + size + 1;
    chunks.push(buf.slice(i, end));
  }
  return chunks;
}
`;

const c: Case = {
  id: "code-off-by-one-002",
  kind: "review",
  description:
    "Two utilities with planted off-by-one defects: tailEntries iterates one past the end (undefined), chunk overlaps neighbors by one byte.",
  sources: [{ type: "raw", code }],
  focus: ["bugs"],
  rounds: 2,
  tags: ["code", "bugs", "smoke"],
  expectations: [
    {
      id: "catches-tailentries-overrun",
      question:
        "Does the transcript identify that tailEntries iterates with i <= entries.length, reading one past the array end and pushing undefined?",
      required: true,
    },
    {
      id: "catches-chunk-overlap",
      question:
        "Does the transcript identify that chunk uses end = i + size + 1, causing neighboring chunks to overlap by one byte?",
      required: true,
    },
    {
      id: "proposes-correct-bounds",
      question:
        "Does at least one fighter propose a corrected bound (i < entries.length for tailEntries; end = i + size for chunk)?",
      required: true,
    },
    {
      id: "negative-n-handling",
      question:
        "Does any fighter discuss boundary inputs beyond the planted bugs — e.g. n larger than entries.length, or size = 0 in chunk?",
      required: false,
    },
  ],
  rubric: [
    {
      dim: "concreteness",
      description:
        "Quotes the buggy line and shows the corrected one. 5 = exact line + corrected snippet; 1 = 'check your loop bounds'.",
      min: 3,
    },
    {
      dim: "opposition_clash",
      description:
        "Round 2 references the opposing fighter's prior claims, not just adds new findings.",
      min: 3,
    },
  ],
  budget: { max_latency_ms: 420_000, max_rounds_with_errors: 0 },
};

export default c;
