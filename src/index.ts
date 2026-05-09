import { registerAllAdapters } from "./adapters/register-all";
import { parseArgs } from "./core/cli";
import { runCli } from "./cli-runner";
import { createRequire } from "module";
const { version } = createRequire(import.meta.url)("../package.json");

registerAllAdapters();

const cmd = parseArgs(process.argv.slice(2));

try {
  const code = await runCli(cmd, version);
  process.exit(code);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
