import type { CliCommand } from "./core/cli";
import type { ContextSource } from "./types";
import { registry } from "./adapters/registry";
import { runChallenge } from "./core/challenge";
import { reviewPositions } from "./core/review";
import { availableModels } from "./core/availability";
import { formatChallengeTranscript } from "./core/output";
import { acquireContext } from "./context";

const HELP = `arena — multi-agent adversarial arena

Usage:
  arena                              Start MCP server on stdio (default)
  arena mcp                          Start MCP server on stdio
  arena health                       List available agent CLIs
  arena challenge --context <text>   Run an adversarial challenge
                  --position <text>  Position (repeat for each side, min 2)
                  [--rounds N] [--models claude,codex]
  arena review    [--code <text>]    Adversarial code review
                  [--git-ref <ref>]  Review a git ref
                  [--git-from <ref> --git-to <ref>]   Review a git range
                  [--files a,b,c]    Review specific files
                  [--focus bugs,security,performance,readability]
                  [--rounds N] [--models claude,codex]
  arena --help                       Show this help
  arena --version                    Print version
`;

async function runHealth(): Promise<void> {
  const results = await registry.healthCheckAll();
  console.log(JSON.stringify(results, null, 2));
}

async function runChallengeCmd(input: Extract<CliCommand, { kind: "challenge" }>["input"]): Promise<void> {
  const checks = await registry.healthCheckAll();
  const available = availableModels(checks);
  if (available.length === 0) throw new Error("no agent CLIs available — run `arena health` to inspect");

  const result = await runChallenge({
    context: input.context,
    positions: input.positions,
    models: input.models,
    rounds: input.rounds,
    availableModels: available,
  });
  console.log(formatChallengeTranscript(result));
}

async function runReviewCmd(input: Extract<CliCommand, { kind: "review" }>["input"]): Promise<void> {
  const sources: ContextSource[] = [];
  if (input.code) sources.push({ type: "raw", code: input.code });
  if (input.gitRef) sources.push({ type: "git_ref", ref: input.gitRef });
  if (input.gitFrom && input.gitTo) sources.push({ type: "git_range", from: input.gitFrom, to: input.gitTo });
  if (input.files?.length) sources.push({ type: "file_list", paths: input.files });
  if (sources.length === 0) throw new Error("review requires one of: --code, --git-ref, --git-from/--git-to, --files");

  const acquired = await acquireContext(sources);
  const checks = await registry.healthCheckAll();
  const available = availableModels(checks);
  if (available.length === 0) throw new Error("no agent CLIs available");

  const result = await runChallenge({
    context: acquired.content,
    positions: reviewPositions(input.focus),
    models: input.models,
    rounds: input.rounds,
    availableModels: available,
  });
  console.log(formatChallengeTranscript(result));
}

export async function runCli(cmd: CliCommand, version: string): Promise<number> {
  switch (cmd.kind) {
    case "help":
      console.log(HELP);
      return 0;
    case "version":
      console.log(version);
      return 0;
    case "health":
      await runHealth();
      return 0;
    case "challenge":
      await runChallengeCmd(cmd.input);
      return 0;
    case "review":
      await runReviewCmd(cmd.input);
      return 0;
    case "error":
      console.error(`Error: ${cmd.message}`);
      console.error("");
      console.error(HELP);
      return 1;
    default:
      throw new Error(`runCli: unsupported command ${(cmd as CliCommand).kind}`);
  }
}
