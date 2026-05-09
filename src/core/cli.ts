import type { ScenarioConfig } from "../config/scenarios";
import { BUILTIN_SCENARIOS } from "../config/scenarios";

export interface ScenarioInput {
  scenario: string;
  context?: string;
  positions: string[];
  focus?: string[];
  code?: string;
  gitRef?: string;
  gitFrom?: string;
  gitTo?: string;
  files?: string[];
  rounds?: number;
  models?: string[];
}

export type CliCommand =
  | { kind: "health" }
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "error"; message: string }
  | { kind: "scenario"; input: ScenarioInput };

const RESERVED = new Set(["health", "help", "--help", "-h", "--version", "-v"]);

function takeValue(args: string[], i: number, flag: string): { value: string; next: number } {
  const value = args[i + 1];
  if (value === undefined) throw new Error(`${flag} requires a value`);
  return { value, next: i + 2 };
}

function parseScenario(name: string, scenario: ScenarioConfig, rest: string[]): CliCommand {
  const input: ScenarioInput = { scenario: name, positions: [] };

  try {
    let i = 0;
    while (i < rest.length) {
      const flag = rest[i];
      if (flag === "--context") {
        const r = takeValue(rest, i, flag); input.context = r.value; i = r.next;
      } else if (flag === "--rounds") {
        const r = takeValue(rest, i, flag); input.rounds = Number(r.value); i = r.next;
      } else if (flag === "--models") {
        const r = takeValue(rest, i, flag);
        input.models = r.value.split(",").map((s) => s.trim()).filter(Boolean);
        i = r.next;
      } else if (flag === "--position" && scenario.positions_from === "args") {
        const r = takeValue(rest, i, flag); input.positions.push(r.value); i = r.next;
      } else if (flag === "--focus" && scenario.positions_from === "focus") {
        const r = takeValue(rest, i, flag);
        const parts = r.value.split(",").map((s) => s.trim()).filter(Boolean);
        if (scenario.focus_positions) {
          for (const p of parts) {
            if (!(p in scenario.focus_positions)) {
              return { kind: "error", message: `unknown focus: ${p}` };
            }
          }
        }
        input.focus = parts;
        i = r.next;
      } else if (flag === "--code") {
        const r = takeValue(rest, i, flag); input.code = r.value; i = r.next;
      } else if (flag === "--git-ref") {
        const r = takeValue(rest, i, flag); input.gitRef = r.value; i = r.next;
      } else if (flag === "--git-from") {
        const r = takeValue(rest, i, flag); input.gitFrom = r.value; i = r.next;
      } else if (flag === "--git-to") {
        const r = takeValue(rest, i, flag); input.gitTo = r.value; i = r.next;
      } else if (flag === "--files") {
        const r = takeValue(rest, i, flag);
        input.files = r.value.split(",").map((s) => s.trim()).filter(Boolean);
        i = r.next;
      } else {
        return { kind: "error", message: `unknown flag: ${flag}` };
      }
    }
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }

  if (scenario.positions_from === "args") {
    if (!input.context) return { kind: "error", message: `${name} requires --context` };
    if (input.positions.length < 2) {
      return { kind: "error", message: `${name} requires at least 2 --position flags` };
    }
  }

  return { kind: "scenario", input };
}

export function parseArgs(
  argv: string[],
  scenarios: Record<string, ScenarioConfig> = BUILTIN_SCENARIOS,
): CliCommand {
  if (argv.length === 0) return { kind: "help" };
  const [head, ...rest] = argv;

  if (head === "--help" || head === "-h" || head === "help") return { kind: "help" };
  if (head === "--version" || head === "-v") return { kind: "version" };
  if (head === "health") return { kind: "health" };

  if (RESERVED.has(head)) return { kind: "error", message: `unknown subcommand: ${head}` };

  const scenario = scenarios[head];
  if (!scenario) return { kind: "error", message: `unknown subcommand: ${head}` };

  return parseScenario(head, scenario, rest);
}
