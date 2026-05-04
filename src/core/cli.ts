import type { ReviewFocus } from "./review";

export type CliCommand =
  | { kind: "mcp" }
  | { kind: "health" }
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "error"; message: string }
  | {
      kind: "challenge";
      input: {
        context: string;
        positions: string[];
        rounds?: number;
        models?: string[];
      };
    }
  | {
      kind: "review";
      input: {
        code?: string;
        gitRef?: string;
        gitFrom?: string;
        gitTo?: string;
        files?: string[];
        focus?: ReviewFocus[];
        rounds?: number;
        models?: string[];
      };
    };

const VALID_FOCUS = new Set(["bugs", "security", "performance", "readability"]);

function takeValue(args: string[], i: number, flag: string): { value: string; next: number } {
  const value = args[i + 1];
  if (value === undefined) throw new Error(`${flag} requires a value`);
  return { value, next: i + 2 };
}

function parseChallenge(rest: string[]): CliCommand {
  let context: string | undefined;
  let positions: string[] = [];
  let rounds: number | undefined;
  let models: string[] | undefined;

  try {
    let i = 0;
    while (i < rest.length) {
      const flag = rest[i];
      if (flag === "--context") {
        const r = takeValue(rest, i, flag); context = r.value; i = r.next;
      } else if (flag === "--position") {
        const r = takeValue(rest, i, flag); positions.push(r.value); i = r.next;
      } else if (flag === "--rounds") {
        const r = takeValue(rest, i, flag); rounds = Number(r.value); i = r.next;
      } else if (flag === "--models") {
        const r = takeValue(rest, i, flag); models = r.value.split(",").map((s) => s.trim()).filter(Boolean); i = r.next;
      } else {
        return { kind: "error", message: `unknown flag: ${flag}` };
      }
    }
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }

  if (!context) return { kind: "error", message: "challenge requires --context" };
  if (positions.length < 2) return { kind: "error", message: "challenge requires at least 2 --position flags" };

  return { kind: "challenge", input: { context, positions, rounds, models } };
}

function parseReview(rest: string[]): CliCommand {
  let code: string | undefined;
  let gitRef: string | undefined;
  let gitFrom: string | undefined;
  let gitTo: string | undefined;
  let files: string[] | undefined;
  let focus: ReviewFocus[] | undefined;
  let rounds: number | undefined;
  let models: string[] | undefined;

  try {
    let i = 0;
    while (i < rest.length) {
      const flag = rest[i];
      if (flag === "--code") {
        const r = takeValue(rest, i, flag); code = r.value; i = r.next;
      } else if (flag === "--git-ref") {
        const r = takeValue(rest, i, flag); gitRef = r.value; i = r.next;
      } else if (flag === "--git-from") {
        const r = takeValue(rest, i, flag); gitFrom = r.value; i = r.next;
      } else if (flag === "--git-to") {
        const r = takeValue(rest, i, flag); gitTo = r.value; i = r.next;
      } else if (flag === "--files") {
        const r = takeValue(rest, i, flag); files = r.value.split(",").map((s) => s.trim()).filter(Boolean); i = r.next;
      } else if (flag === "--focus") {
        const r = takeValue(rest, i, flag);
        const parts = r.value.split(",").map((s) => s.trim());
        for (const p of parts) {
          if (!VALID_FOCUS.has(p)) return { kind: "error", message: `unknown focus: ${p}` };
        }
        focus = parts as ReviewFocus[]; i = r.next;
      } else if (flag === "--rounds") {
        const r = takeValue(rest, i, flag); rounds = Number(r.value); i = r.next;
      } else if (flag === "--models") {
        const r = takeValue(rest, i, flag); models = r.value.split(",").map((s) => s.trim()).filter(Boolean); i = r.next;
      } else {
        return { kind: "error", message: `unknown flag: ${flag}` };
      }
    }
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }

  return { kind: "review", input: { code, gitRef, gitFrom, gitTo, files, focus, rounds, models } };
}

export function parseArgs(argv: string[]): CliCommand {
  if (argv.length === 0) return { kind: "mcp" };
  const [head, ...rest] = argv;
  switch (head) {
    case "mcp": return { kind: "mcp" };
    case "health": return { kind: "health" };
    case "--help":
    case "-h":
    case "help":
      return { kind: "help" };
    case "--version":
    case "-v":
      return { kind: "version" };
    case "challenge": return parseChallenge(rest);
    case "review": return parseReview(rest);
    default:
      return { kind: "error", message: `unknown subcommand: ${head}` };
  }
}
