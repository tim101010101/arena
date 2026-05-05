import { registry } from "./adapters/registry";
import { ClaudeAdapter } from "./adapters/claude";
import { CodexAdapter } from "./adapters/codex";
import { GeminiAdapter } from "./adapters/gemini";
import { OpenAIAdapter } from "./adapters/openai";
import { KimiAdapter } from "./adapters/kimi";
import { parseArgs } from "./core/cli";
import { runCli } from "./cli-runner";
import { runMcp } from "./mcp";
import { createRequire } from "module";
const { version } = createRequire(import.meta.url)("../package.json");

registry.register(new ClaudeAdapter());
registry.register(new CodexAdapter());
registry.register(new GeminiAdapter());
registry.register(new OpenAIAdapter());
registry.register(new KimiAdapter());

const cmd = parseArgs(process.argv.slice(2));

if (cmd.kind === "mcp") {
  await runMcp(version);
} else {
  try {
    const code = await runCli(cmd, version);
    process.exit(code);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
