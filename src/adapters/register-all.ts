import { AdapterRegistry, registry as defaultRegistry } from "./registry";
import { ProfileEntry } from "./profile-entry";
import { claudeBinary } from "./binaries/claude";
import { codexBinary } from "./binaries/codex";
import { geminiBinary } from "./binaries/gemini";
import { kimiBinary } from "./binaries/kimi";
import { opencodeBinary } from "./binaries/opencode";
import { makeStdoutBinary } from "./binaries/_stdout";
import { makeFileBinary } from "./binaries/_file";
import { getActiveModels } from "../config/defaults";
import type { BinaryAdapter } from "./base";
import type { ModelConfig } from "../config/schema";

const BUILTIN_BINARIES: Record<string, BinaryAdapter> = {
  claude: claudeBinary,
  codex: codexBinary,
  gemini: geminiBinary,
  kimi: kimiBinary,
  opencode: opencodeBinary,
};

function binaryForProfile(profile: ModelConfig): BinaryAdapter {
  return (
    BUILTIN_BINARIES[profile.bin] ??
    (profile.command.output.via === "file"
      ? makeFileBinary(profile.bin)
      : makeStdoutBinary(profile.bin))
  );
}

export function registerModelsInto(
  models: Record<string, ModelConfig>,
  reg: AdapterRegistry,
): void {
  for (const [id, profile] of Object.entries(models)) {
    if (!profile.enabled) continue;
    reg.register(new ProfileEntry(id, binaryForProfile(profile)));
  }
}

let registered = false;

export function registerAllAdapters(opts?: { force?: boolean }): void {
  if (registered && !opts?.force) return;
  registered = true;
  registerModelsInto(getActiveModels(), defaultRegistry);
}
