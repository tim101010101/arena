---
name: arena-eval
description: Run the local arena evaluation suite. Trigger when the user asks to "eval arena", "evaluate arena", "test arena quality", "score arena", "run arena evals", or anything semantically equivalent. Fans out parallel subagents to execute cases through the arena CLI and judge the resulting transcripts against per-case rubrics, then aggregates a summary report.
---

# arena-eval

Local-only evaluation harness for the arena project. The host agent (you, when triggered)
orchestrates the run by calling the eval CLI for planning and aggregation, and dispatches
parallel subagents to execute and judge cases.

## When to use

Trigger when the user asks to evaluate, benchmark, or score the arena project — phrases like
"eval arena", "run arena evals", "score the latest arena changes", "regression-test arena".

Do NOT trigger for the unit/integration test suite (`bun test`); those are different.

## Inputs you accept from the user

- Tag filter: "eval the open ones", "only run code cases", "skip smoke" → translate to
  `--tags <list>` / `--exclude-tags <list>` flags on the planner.
- Models filter: "only use claude", "skip codex", "claude vs openai" → translate to
  `--only-models <list>` on the runner (passed in each subagent's `bun evals/runner run`).
  Default: empty (use every healthy adapter).
- Run id: optional. Default: planner generates one.
- Repeats: optional. Default: 1. Bump only if the user asks for variance ("run each 3 times").

If the user gives no qualifier, run the full manifest at default settings.

## Procedure

Follow these steps in order. Do not skip the planner — it generates the run id and reports
directory that subagents must write into.

### 1. Pre-flight

Run a health check first. If no adapters are healthy, abort with a clear message:

```
bun src/index.ts health
```

If the JSON shows zero `ok: true` adapters, stop and tell the user no agent CLIs are
available; suggest installing `claude` / `codex` / etc.

### 2. Plan

Call the planner. It generates the run id, creates the reports directory, and returns the
shard layout you will fan out:

```
bun evals/runner plan [--tags ...] [--exclude-tags ...]
```

Capture the JSON output. You will use:

- `run_id`
- `judge_rubric_path`
- `judge_rubric_hash`
- `reports_dir`
- `shards[]` — each shard is a list of cases for one subagent

### 3. Read the rubric once

Read the judge rubric file at `judge_rubric_path` so you can pass its full content to each
subagent. Do not paraphrase it. Subagents must judge against the literal rubric.

### 4. Fan out subagents in parallel

For each shard in `shards`, spawn one `general-purpose` subagent. Send all subagent calls in
a **single message** with multiple `Agent` tool uses so they execute concurrently. Cap
parallelism at `run_defaults.max_parallel_subagents` (planner returns this); if there are
more shards than that cap, run them in batches of that size.

Each subagent receives:

- The run id
- Its assigned shard's case list (paths + raw_out targets)
- The full text of `judge-rubric.md` (inlined)
- The `judge_rubric_hash` to record in each report
- The `<MODEL_FLAGS>` slot — set to `--only-models <list>` if the user supplied a models
  filter, otherwise empty
- A reminder that it must NOT read other subagents' reports, must NOT modify source code,
  and must NOT re-run a case to "improve" the score

Use the prompt template in **Subagent prompt** below.

### 5. Wait for all subagents, then aggregate

When every subagent has reported back, run:

```
bun evals/runner aggregate --run-id <run_id>
```

This reads every `<case-id>.json` in the reports dir and writes `summary.json`.

### 6. Surface the summary to the user

Print the aggregator's table output. Then add a 2-3 sentence interpretive read on the
results, calling out:

- Whether overall pass rate is meaningful or noisy (single-run results are noisy by nature).
- The single biggest failure cluster (by tag) if any.
- Where the user can look for transcripts: `evals/reports/<run_id>/`.

Do not promote any specific case as "the new baseline". This eval has no committed baselines
by design.

## Subagent prompt

Use this template verbatim, filling in the bracketed slots. Pass it as the `prompt` field of
the `Agent` tool call. Use `subagent_type: "general-purpose"`.

```
You are an arena-eval judging subagent. You own a shard of cases. For each case in your
shard you will (1) execute it through the arena runner CLI, (2) read the resulting raw
transcript, (3) judge it against the rubric below, and (4) write a JudgedReport JSON file.

Run id: <RUN_ID>
Reports dir: <REPORTS_DIR>
Judge rubric hash (record this verbatim in every report): <RUBRIC_HASH>

Your shard:
<JSON list of { path, case_abs, tags, raw_out } from the planner>

For each case in the shard, in sequence:

1. Execute the case:
     bun evals/runner run --case <path> --run-id <RUN_ID> --out <raw_out> <MODEL_FLAGS>
   This may take 5-10 minutes per case (3 rounds × 2 fighters × ~70s/call for local
   claude/codex CLIs). Use Bash with timeout 900000ms (15 min) and WAIT for the command
   to fully finish before moving on — do NOT report "still in progress" and exit early.
   If it exits non-zero, capture stderr and continue to step 2 with whatever raw output
   exists. Do NOT retry on success — one execution per case.

2. Read <raw_out>. Parse the JSON. The relevant fields are: case_id, fighters, rounds,
   formatted_transcript, structural.

3. Re-read the case file at <case_abs> to obtain its `expectations[]` and `rubric[]` arrays.

4. Judge using the rubric below. For each expectation, output { id, verdict, evidence }
   where verdict is one of "yes" | "partial" | "no" and evidence is a short quote or close
   paraphrase from the transcript. For each rubric dim, output { dim, score, rationale }
   where score is an integer 1-5 and rationale is one sentence. NEVER use string matching
   or regex; judge by reading.

5. Compute verdict:
     - "fail" if any expectation marked `required: true` has verdict != "yes"
     - "fail" if any rubric dim score < its `min`
     - "fail" if structural.errors.length > (case.budget.max_rounds_with_errors ?? 0)
     - "fail" if case.budget.max_latency_ms is set and structural.total_latency_ms exceeds it
     - otherwise "pass"
   Populate fail_reasons[] with short strings naming each failed check.

6. Write the report to <REPORTS_DIR>/<case_id>.json. Schema:
     {
       "case_id": "<from raw>",
       "run_id": "<RUN_ID>",
       "judge_agent_id": "<your subagent id, e.g. 'shard-2-judge'>",
       "judge_rubric_hash": "<RUBRIC_HASH>",
       "fighters": <copy from raw>,
       "expectations": [...],
       "rubric": [...],
       "structural": <copy from raw>,
       "verdict": "pass" | "fail",
       "fail_reasons": [...],
       "raw_transcript_path": "<raw_out>"
     }
   Use the Write tool. Pretty-print with 2-space indent.

Constraints — these are absolute:
  - Do NOT read judged reports from other shards.
  - Do NOT modify any source code in src/ or evals/cases/.
  - Do NOT re-run a case after seeing its transcript.
  - Output a one-line status to me per case: "<case_id>: <verdict>".
  - At the end, print "shard complete: N pass / M fail".

Begin.

--- BEGIN judge-rubric.md ---
<INLINE FULL CONTENT OF judge-rubric.md HERE>
--- END judge-rubric.md ---
```

## Failure modes to handle

- **Planner returns zero shards** → tag filter too narrow. Tell the user, list available tags
  by reading `evals/cases/manifest.ts` mentally and offering corrections.
- **A subagent's case execution fails** (e.g. arena timeout) → the subagent still writes a
  judged report with `verdict: "fail"` and `fail_reasons: ["execution-error: ..."]`.
  Aggregator includes it. Do not retry.
- **Aggregator complains about missing reports** → at least one subagent never wrote its
  output. Re-dispatch only the missing shard; do not re-dispatch shards that succeeded.

## Ground rules

- Do not run subagents in series when they can run in parallel.
- Do not write a "fixed" baseline anywhere. Reports are ephemeral by design.
- Do not edit `judge-rubric.md` in the same session as running an eval — that invalidates
  the rubric hash and makes the run uncomparable to anything.
- Do not use the eval to "validate" a change you just made; eval results have meaningful
  variance on a single run. Prefer a before/after pair on the same machine.
