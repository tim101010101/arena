import type { ModelConfig, RenderContext } from "../config/schema";
import type { AgentRequest } from "../adapters/base";
import { renderString, renderCommand } from "../config/template";

export interface AssembledRequest {
  args: string[];
  outputVia: "stdout" | "file";
}

export function buildHistoryString(req: AgentRequest, entryTpl: string): string {
  if (!req.history?.length) return "";
  return req.history
    .map((h) =>
      renderString(entryTpl, {
        prompt: "",
        agent: h.agent ?? h.role,
        content: h.content,
      }),
    )
    .join("\n");
}

export function assembleCommand(
  cfg: ModelConfig,
  req: AgentRequest,
  outputFile?: string,
): AssembledRequest {
  const history = buildHistoryString(req, cfg.history_entry);

  const assemblyCtx: RenderContext = {
    bin: cfg.bin,
    model: cfg.model,
    prompt: req.prompt,
    system: req.system,
    context: req.context,
    history,
  };

  const finalPrompt = renderString(cfg.prompt_assembly, assemblyCtx);

  const argsCtx: RenderContext = {
    bin: cfg.bin,
    model: cfg.model,
    prompt: finalPrompt,
    system: req.system,
    output_file: outputFile,
  };

  const args = renderCommand(cfg.command, argsCtx);

  return {
    args,
    outputVia: cfg.command.output.via,
  };
}
