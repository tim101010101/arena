export type ArgToken =
  | string
  | { if: string; then: ArgToken[] };

export interface ModelCommand {
  args: ArgToken[];
  output: { via: "stdout" } | { via: "file" };
}

export interface ModelConfig {
  enabled: boolean;
  bin: string;
  model?: string;
  env: Record<string, string>;
  command: ModelCommand;
  prompt_assembly: string;
  history_entry: string;
}

export interface RenderContext {
  bin: string;
  model?: string;
  system?: string;
  prompt: string;
  context?: string;
  history?: string;
  output_file?: string;
  [key: string]: string | undefined;
}
