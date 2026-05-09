import { registry } from "./registry";
import { ProfileEntry } from "./profile-entry";
import { ClaudeBinary } from "./binaries/claude";
import { CodexBinary } from "./binaries/codex";
import { GeminiBinary } from "./binaries/gemini";
import { KimiBinary } from "./binaries/kimi";
import { OpencodeBinary } from "./binaries/opencode";
import { getActiveModels } from "../config/defaults";
import type { BinaryAdapter } from "./base";

type BinaryFactory = () => BinaryAdapter;

const BINARY_FACTORIES: Record<string, BinaryFactory> = {
  claude: () => new ClaudeBinary(),
  codex: () => new CodexBinary(),
  gemini: () => new GeminiBinary(),
  kimi: () => new KimiBinary(),
  opencode: () => new OpencodeBinary(),
};

let registered = false;

export function registerAllAdapters(opts?: { force?: boolean }): void {
  if (registered && !opts?.force) return;
  registered = true;

  const binaryCache = new Map<string, BinaryAdapter>();

  for (const [id, profile] of Object.entries(getActiveModels())) {
    if (!profile.enabled) continue;

    const factory = BINARY_FACTORIES[profile.bin];
    if (!factory) continue;

    if (!binaryCache.has(profile.bin)) {
      binaryCache.set(profile.bin, factory());
    }
    const binary = binaryCache.get(profile.bin)!;

    registry.register(new ProfileEntry(id, id, binary));
  }
}
