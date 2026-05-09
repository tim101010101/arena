import type { ModelConfig } from "./schema";
import { AGENT_MODELS } from "./env";

const STD_ASSEMBLY =
  "{{#if context}}Context:\n{{context}}\n\n{{/if}}{{#if system}}{{system}}\n\n{{/if}}{{prompt}}{{#if history}}\n\nPrevious discussion:\n{{history}}{{/if}}";

const HISTORY_ENTRY = "[{{agent}}]: {{content}}";

export const BUILTIN_DEFAULTS: Record<string, ModelConfig> = {
  claude: {
    enabled: true,
    bin: "claude",
    model: AGENT_MODELS.claude,
    env: {},
    command: {
      args: [
        "{{bin}}", "-p", "--output-format", "text", "--no-session-persistence",
        { if: "model", then: ["--model", "{{model}}"] },
        "--allowedTools", "Read,Glob,Grep,Bash(git:*)",
        { if: "system", then: ["--system-prompt", "{{system}}"] },
        "{{prompt}}",
      ],
      output: { via: "stdout" },
    },
    prompt_assembly:
      "{{#if context}}Context:\n{{context}}\n\n{{/if}}{{prompt}}{{#if history}}\n\nPrevious discussion:\n{{history}}{{/if}}",
    history_entry: HISTORY_ENTRY,
  },

  codex: {
    enabled: true,
    bin: "codex",
    model: AGENT_MODELS.codex,
    env: {},
    command: {
      args: [
        "{{bin}}", "exec", "--full-auto", "--skip-git-repo-check", "-s", "read-only",
        { if: "model", then: ["-m", "{{model}}"] },
        "-o", "{{output_file}}", "{{prompt}}",
      ],
      output: { via: "file", tmp_prefix: "codex" },
    },
    prompt_assembly: STD_ASSEMBLY,
    history_entry: HISTORY_ENTRY,
  },

  openai: {
    enabled: true,
    bin: "codex",
    model: AGENT_MODELS.openai || "gpt-4.1",
    env: {},
    command: {
      args: [
        "{{bin}}", "exec", "--full-auto", "--skip-git-repo-check", "-s", "read-only",
        "-c", 'model_provider="openai"',
        { if: "model", then: ["-m", "{{model}}"] },
        "-o", "{{output_file}}", "{{prompt}}",
      ],
      output: { via: "file", tmp_prefix: "openai" },
    },
    prompt_assembly: STD_ASSEMBLY,
    history_entry: HISTORY_ENTRY,
  },

  gemini: {
    enabled: true,
    bin: "gemini",
    model: AGENT_MODELS.gemini,
    env: {},
    command: {
      args: [
        "{{bin}}",
        { if: "model", then: ["--model", "{{model}}"] },
        "{{prompt}}",
      ],
      output: { via: "stdout" },
    },
    prompt_assembly: STD_ASSEMBLY,
    history_entry: HISTORY_ENTRY,
  },

  kimi: {
    enabled: true,
    bin: "kimi",
    model: AGENT_MODELS.kimi,
    env: {},
    command: {
      args: [
        "{{bin}}", "--quiet", "--yolo", "--no-thinking",
        { if: "model", then: ["-m", "{{model}}"] },
        "-p", "{{prompt}}",
      ],
      output: { via: "stdout" },
    },
    prompt_assembly: STD_ASSEMBLY,
    history_entry: HISTORY_ENTRY,
  },

  glm: {
    enabled: true,
    bin: "opencode",
    model: AGENT_MODELS.glm ?? "zhipuai/glm-5.1",
    env: {},
    command: {
      args: [
        "{{bin}}", "run",
        { if: "model", then: ["-m", "{{model}}"] },
        "{{prompt}}",
      ],
      output: { via: "stdout" },
    },
    prompt_assembly: STD_ASSEMBLY,
    history_entry: HISTORY_ENTRY,
  },

  acw: {
    enabled: true,
    bin: "codex",
    model: AGENT_MODELS.acw ?? "gpt-5.5",
    env: {},
    command: {
      args: [
        "{{bin}}", "exec", "--full-auto", "--skip-git-repo-check", "-s", "read-only",
        "-c", 'model_provider="acw"',
        { if: "model", then: ["-m", "{{model}}"] },
        "-o", "{{output_file}}", "{{prompt}}",
      ],
      output: { via: "file", tmp_prefix: "acw" },
    },
    prompt_assembly: STD_ASSEMBLY,
    history_entry: HISTORY_ENTRY,
  },
};

let activeModels: Record<string, ModelConfig> = { ...BUILTIN_DEFAULTS };

export function setActiveModels(models: Record<string, ModelConfig>): void {
  activeModels = models;
}

export function getActiveModels(): Record<string, ModelConfig> {
  return activeModels;
}

export function getModelConfig(id: string): ModelConfig {
  return activeModels[id] ?? BUILTIN_DEFAULTS[id];
}
