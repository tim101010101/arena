import { assembleCommand } from "../config/assemble";
import { getModelConfig } from "../config/defaults";
import type { AgentRequest } from "./base";

export function buildArgsFor(
  profileId: string,
  req: AgentRequest,
  outputFile?: string,
): string[] {
  return assembleCommand(getModelConfig(profileId), req, outputFile).args;
}
