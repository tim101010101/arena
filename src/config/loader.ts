import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseJsonc } from "./jsonc";
import { UserConfigSchema, type UserConfig } from "./user-schema";

const RESERVED_SCENARIO_NAMES = new Set([
  "health", "help", "--help", "-h", "--version", "-v",
]);

export function configSearchPaths(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): string[] {
  const paths: string[] = [];
  if (env.ARENA_CONFIG) paths.push(env.ARENA_CONFIG);
  paths.push(join(cwd, ".arena.jsonc"));
  paths.push(join(cwd, ".arena.json"));
  const xdg = env.XDG_CONFIG_HOME || join(homedir(), ".config");
  paths.push(join(xdg, "arena", "config.jsonc"));
  paths.push(join(xdg, "arena", "config.json"));
  return paths;
}

export interface LoadedConfig {
  config: UserConfig | null;
  path: string | null;
}

export function loadUserConfig(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): LoadedConfig {
  for (const path of configSearchPaths(env, cwd)) {
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    const parsed = parseJsonc<unknown>(raw, path);
    const result = UserConfigSchema.safeParse(parsed);
    if (!result.success) {
      const errors = result.error.errors
        .map((e) => `  - ${e.path.join(".") || "(root)"}: ${e.message}`)
        .join("\n");
      throw new Error(`invalid config in ${path}:\n${errors}`);
    }
    validateScenarioNames(result.data, path);
    return { config: result.data, path };
  }
  return { config: null, path: null };
}

function validateScenarioNames(config: UserConfig, path: string): void {
  if (!config.scenarios) return;
  for (const name of Object.keys(config.scenarios)) {
    if (RESERVED_SCENARIO_NAMES.has(name)) {
      throw new Error(`invalid config in ${path}: scenario name "${name}" is reserved`);
    }
    if (name.startsWith("-")) {
      throw new Error(`invalid config in ${path}: scenario name "${name}" cannot start with "-"`);
    }
  }
}
