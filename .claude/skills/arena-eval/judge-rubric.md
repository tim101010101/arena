# Arena Eval — Judge Rubric

This file is the authoritative scoring contract for arena-eval subagents. It is hashed
into every report; a hash mismatch invalidates cross-run comparisons. Do not edit
casually.

## What you are scoring

You are scoring an **adversarial transcript** produced by the arena tool. Two or more
fighters were each assigned a position and argued it across N rounds. You are NOT
deciding which side is right. You are deciding whether the arena produced a high-quality
adversarial exchange against this case's expectations.

## What you must produce

For each case, produce one JudgedReport JSON file. Two arrays carry the actual scoring:

### `expectations[]` — yes / partial / no

One entry per `expectation` in the case file. Each entry:

```json
{ "id": "<from case>", "verdict": "yes" | "partial" | "no", "evidence": "<short quote or close paraphrase from the transcript>" }
```

Verdict rules:

- **yes** — The transcript clearly satisfies the expectation. You can point to specific
  text that demonstrates it.
- **partial** — The transcript hints at the concept but does not make it explicit, OR it
  is mentioned by one fighter only when the expectation implies the exchange should
  surface it. Use `partial` sparingly; do not use it as a hedge when you are simply
  unsure.
- **no** — The transcript does not satisfy the expectation. Default to `no` when
  evidence is absent rather than charitable.

Evidence rules:

- Always provide an evidence string. If the verdict is `no`, evidence describes what is
  missing (e.g. `"no fighter discussed parameterized queries; both proposed only input
  validation"`).
- Quotes should be short (1-2 sentences) and represent the strongest supporting line.
- Paraphrase only if a literal quote would be too long. Stay faithful.

### `rubric[]` — integer 1-5 with rationale

One entry per `rubric` dim in the case file. Each entry:

```json
{ "dim": "<from case>", "score": <1-5 integer>, "rationale": "<one sentence>" }
```

Score anchors (apply the case's per-dim description on top of these):

- **5** — Exemplary. Could be used as a positive reference example.
- **4** — Solid. Meets the dim well; minor gaps only.
- **3** — Adequate. The dim is present but uneven across fighters or rounds.
- **2** — Weak. The dim is barely present; mostly absent.
- **1** — Absent. The transcript fails this dim entirely.

Common dims you will encounter (case files override the description; these are the
defaults):

- **concreteness** — Cites specific lines, inputs, named patterns, named thinkers,
  numbers, fix snippets. The opposite is generic platitudes.
- **opposition_clash** — Later rounds explicitly engage with the opponent's prior
  arguments. The opposite is parallel monologue.
- **position_drift** — Fighters hold their assigned position across all rounds. The
  opposite is collapsing into agreement or hedging into a hybrid view. Higher score =
  less drift.

## Verdict computation

The case **fails** if any of:

- An expectation with `required: true` has verdict ≠ `"yes"`.
- A rubric dim score is below the case's `min` for that dim.
- `structural.errors.length` exceeds `budget.max_rounds_with_errors` (default 0).
- `structural.total_latency_ms` exceeds `budget.max_latency_ms` if set.

Otherwise the case **passes**.

Populate `fail_reasons[]` with short strings naming each failed check, e.g.:

- `"required expectation 'identifies-injection-get' returned partial"`
- `"rubric dim 'concreteness' scored 2 (min 3)"`
- `"3 round errors exceeded budget of 0"`

## Hard rules

1. **No string matching.** Do not grep for keywords. Read the transcript and judge.
2. **No regex.** Anywhere.
3. **No bias toward the "correct" answer** in open-ended cases. The trolley problem has
   no winner; you are scoring whether each side argued its assigned position well, not
   which philosophy is right.
4. **No reading peer reports.** Each subagent judges its shard independently. Cross-shard
   reading creates score drift.
5. **No re-running a case to improve a score.** One execution per case per run.
6. **Evidence is mandatory.** A verdict without evidence is invalid; mark it `no`.
7. **No prose outside JSON** in the final report file. Status lines to the orchestrator
   are fine; the report file itself is strict JSON.

## Edge cases

- **Fighter errored mid-round** (the entry has an `error` field) — for expectations,
  judge from what is present; if a required expectation cannot be evaluated because the
  responsible side never spoke, mark `no`. For rubric, score the surviving content; if
  there is essentially nothing to judge, score 1.
- **Both sides agree** — if the case is a debate and both fighters end up agreeing,
  `position_drift` is at most 2 regardless of how well-argued the agreement is.
- **Empty transcript** — verdict is `fail` with reason `"empty transcript"`.
- **Repeats > 1 disagree across runs** — you only judge your one transcript. The
  aggregator handles cross-run comparison.

## What you are NOT doing

- Not editing the case file.
- Not editing the rubric.
- Not deciding the case is "bad" because the topic is hard. Difficulty is captured in the
  case's `min` thresholds; if the transcript misses, that is the signal.
- Not summarizing the transcript prose. Your output is structured verdicts.
