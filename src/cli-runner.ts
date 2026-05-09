import type { CliCommand, ScenarioInput } from "./core/cli";
import type { ContextSource } from "./types";
import type { ScenarioConfig } from "./config/scenarios";
import { BUILTIN_SCENARIOS } from "./config/scenarios";
import { runMcpServer } from "./core/mcp";
import { registry } from "./adapters/registry";
import { runScenario } from "./core/scenario";
import { reviewPositions } from "./core/review";
import { availableModels } from "./core/availability";
import { formatTranscript } from "./core/output";
import { acquireContext } from "./context";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

function buildHelp(scenarios: Record<string, ScenarioConfig>): string {
  const names = Object.keys(scenarios);
  const lines = [
    "arena — multi-agent adversarial arena",
    "",
    "Usage:",
    "  arena health                       List available agent CLIs",
  ];
  for (const name of names) {
    const s = scenarios[name];
    if (s.positions_from === "args") {
      lines.push(`  arena ${name} --context <text>   Run scenario "${name}"`);
      lines.push("                  --position <text>  Position (repeat for each side, min 2)");
      lines.push("                  [--rounds N] [--models claude,codex]");
    } else {
      const focusKeys = s.focus_positions ? Object.keys(s.focus_positions).join(",") : "";
      lines.push(`  arena ${name}  [--code <text>|-]   Adversarial scenario "${name}"`);
      lines.push("                  [--git-ref <ref>]  Review a git ref");
      lines.push("                  [--git-from <ref> --git-to <ref>]   Review a git range");
      lines.push("                  [--files a,b,c]    Review specific files");
      if (focusKeys) lines.push(`                  [--focus ${focusKeys}]`);
      lines.push("                  [--rounds N] [--models claude,codex]");
    }
  }
  lines.push("  arena --help                       Show this help");
  lines.push("  arena --version                    Print version");
  lines.push("");
  return lines.join("\n");
}

async function runHealth(): Promise<void> {
  const results = await registry.healthCheckAll();
  console.log(JSON.stringify(results, null, 2));
}

async function runScenarioCmd(
  input: ScenarioInput,
  scenario: ScenarioConfig,
): Promise<void> {
  const checks = await registry.healthCheckAll();
  const available = availableModels(checks);
  if (available.length === 0) throw new Error("no agent CLIs available — run `arena health` to inspect");

  let context: string;
  let positions: string[];

  if (scenario.positions_from === "args") {
    if (!input.context) throw new Error(`${input.scenario} requires --context`);
    context = input.context;
    positions = input.positions;
  } else {
    const sources: ContextSource[] = [];
    if (input.stdin) sources.push({ type: "stdin", content: await readStdin() });
    if (input.code) sources.push({ type: "raw", code: input.code });
    if (input.gitRef) sources.push({ type: "git_ref", ref: input.gitRef });
    if (input.gitFrom && input.gitTo) sources.push({ type: "git_range", from: input.gitFrom, to: input.gitTo });
    if (input.files?.length) sources.push({ type: "file_list", paths: input.files });
    if (sources.length === 0) {
      throw new Error(`${input.scenario} requires one of: --code, --code -, --git-ref, --git-from/--git-to, --files`);
    }
    const acquired = await acquireContext(sources);
    context = acquired.content;
    positions = reviewPositions(input.focus, scenario);
  }

  const result = await runScenario({
    context,
    positions,
    models: input.models,
    rounds: input.rounds,
    availableModels: available,
    scenario,
  });
  console.log(formatTranscript(result));
}

export async function runCli(
  cmd: CliCommand,
  version: string,
  scenarios: Record<string, ScenarioConfig> = BUILTIN_SCENARIOS,
): Promise<number> {
  switch (cmd.kind) {
    case "help":
      console.log(buildHelp(scenarios));
      return 0;
    case "version":
      console.log(version);
      return 0;
    case "health":
      await runHealth();
      return 0;
    case "mcp":
      await runMcpServer(scenarios, version);
      return 0;
    case "scenario": {
      const scenario = scenarios[cmd.input.scenario];
      if (!scenario) throw new Error(`unknown scenario: ${cmd.input.scenario}`);
      await runScenarioCmd(cmd.input, scenario);
      return 0;
    }
    case "error":
      console.error(`Error: ${cmd.message}`);
      console.error("");
      console.error(buildHelp(scenarios));
      return 1;
    default:
      throw new Error(`runCli: unsupported command ${(cmd as CliCommand).kind}`);
  }
}
