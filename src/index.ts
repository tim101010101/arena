import { registerAllAdapters } from "./adapters/register-all";
import { parseArgs } from "./core/cli";
import { runCli } from "./cli-runner";
import { loadUserConfig } from "./config/loader";
import { resolveConfig } from "./config/resolve";
import { setActiveModels } from "./config/defaults";
import { VERSION as version } from "./version";

registerAllAdapters();

let resolved;
try {
  const loaded = loadUserConfig();
  resolved = resolveConfig(loaded.config);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

setActiveModels(resolved.models);

const cmd = parseArgs(process.argv.slice(2), resolved.scenarios);

try {
  const code = await runCli(cmd, version, resolved.scenarios);
  process.exit(code);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
