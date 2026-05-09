import { registry } from "./registry";
import { ProfileEntry } from "./profile-entry";
import { claudeBinary } from "./binaries/claude";
import { codexBinary } from "./binaries/codex";
import { geminiBinary } from "./binaries/gemini";
import { kimiBinary } from "./binaries/kimi";
import { opencodeBinary } from "./binaries/opencode";
import { getActiveModels } from "../config/defaults";
import type { BinaryAdapter } from "./base";

const BINARIES: Record<string, BinaryAdapter> = {
  claude: claudeBinary,
  codex: codexBinary,
  gemini: geminiBinary,
  kimi: kimiBinary,
  opencode: opencodeBinary,
};

let registered = false;

export function registerAllAdapters(opts?: { force?: boolean }): void {
  if (registered && !opts?.force) return;
  registered = true;

  for (const [id, profile] of Object.entries(getActiveModels())) {
    if (!profile.enabled) continue;

    const binary = BINARIES[profile.bin];
    if (!binary) {
      console.warn(`[arena] profile "${id}" references unknown bin "${profile.bin}"; skipping. Available bins: ${Object.keys(BINARIES).join(", ")}`);
      continue;
    }

    registry.register(new ProfileEntry(id, binary));
  }
}
