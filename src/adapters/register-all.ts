import { registry } from "./registry";
import { ClaudeAdapter } from "./claude";
import { CodexAdapter } from "./codex";
import { GeminiAdapter } from "./gemini";
import { OpenAIAdapter } from "./openai";
import { KimiAdapter } from "./kimi";

let registered = false;

export function registerAllAdapters(): void {
  if (registered) return;
  registry.register(new ClaudeAdapter());
  registry.register(new CodexAdapter());
  registry.register(new GeminiAdapter());
  registry.register(new OpenAIAdapter());
  registry.register(new KimiAdapter());
  registered = true;
}
