# Arena

```
                         █████╗ ██████╗ ███████╗███╗   ██╗ █████╗
                        ██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗
                        ███████║██████╔╝█████╗  ██╔██╗ ██║███████║
                        ██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██╔══██║
                        ██║  ██║██║  ██║███████╗██║ ╚████║██║  ██║
                        ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝
```

[![CI](https://github.com/tim101010101/arena/actions/workflows/ci.yml/badge.svg)](https://github.com/tim101010101/arena/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/tim101010101/arena)](https://github.com/tim101010101/arena/releases)

**A position-driven adversarial arena for AI agents.** Host provides context and 2+ opposing positions; arena dispatches local CLI models (Claude, Codex, Gemini, OpenAI, Kimi) to argue each position over multiple rounds and returns the transcript.

A standalone CLI — invoke it from your shell, scripts, or any agent that can run shell commands.

## Mental model

- **Host doesn't fight.** The caller (Claude Code, Codex CLI, scripts) just supplies what should be argued and which positions to argue.
- **Position is the unit, not the model.** Adversarial value comes from clashing stances, not from "which model wins". Same model with two different system prompts is a valid pair if no other CLI is available.
- **Arena owns model dispatch.** It picks distinct models when multiple CLIs are healthy, falls back to reusing one when not.

## Subcommands

| Subcommand | Purpose |
|---|---|
| `arena challenge` | Core. Run N positions over R rounds against the supplied context. |
| `arena review` | Code-review preset over `arena challenge`. Spawns attacker positions (default: bug-hunter + security-auditor) on the supplied code/diff. |
| `arena health` | List agent CLIs and their availability. |

## Install

```bash
# Required: at least one of these CLIs in $PATH
npm install -g @anthropic-ai/claude-cli   # for "claude"
npm install -g @codex-ai/cli              # for "codex" / "openai" / "gemini"
uv tool install kimi-cli                  # for "kimi" (or: pipx install kimi-cli)

# Arena itself
npm install -g arena-debate     # or: npx arena-debate
```

## CLI usage

```bash
# Adversarial debate
arena challenge \
  --context "Should we use microservices or a monolith for a 10k-user product with 5 devs?" \
  --position "微服务派：拆分有助于团队边界" \
  --position "单体派：5 人小团队不该背运维债" \
  --rounds 3

# Adversarial code review (positions auto-derived from --focus)
arena review --git-ref feature/auth --focus bugs,security

arena review --files src/login.ts,src/session.ts --focus security

# Override which models to use (must already be healthy)
arena challenge --context "..." --position a --position b --models claude,codex

# Diagnostics
arena health
arena --version
arena --help
```

## Configuration (env vars)

| Variable | Default | Notes |
|---|---|---|
| `ARENA_TIMEOUT_MS` | `120000` | Per-fighter execution timeout |
| `ARENA_DEFAULT_ROUNDS` | `3` | Default rounds when not specified |
| `ARENA_DEFAULT_MODE` | `parallel` | Reserved (challenge runs sequentially) |
| `ARENA_MAX_CONTEXT_SIZE` | `1000000` | Max bytes from `sources` |
| `ARENA_CLAUDE_MODEL` / `ARENA_CODEX_MODEL` / `ARENA_GEMINI_MODEL` / `ARENA_OPENAI_MODEL` / `ARENA_KIMI_MODEL` | CLI default | Per-adapter model override |

## Dispatch behavior

```
positions = ["A", "B"]
available = healthCheckAll().filter(ok)
override  = caller-supplied --models / models[]

pool = override ?? available
fighter[i].model = pool[i % pool.length]
```

- Prefers distinct models when `len(positions) ≤ len(pool)`.
- Cycles when positions outnumber the pool — same model, different prompts.
- Each fighter gets a unique id (`<model>#<i>`) so transcripts stay disambiguated.

## Architecture

```
src/
├── index.ts            # entry: parses argv and runs the CLI
├── cli-runner.ts       # CLI command runner
├── orchestrator.ts     # slot-based round runner
├── context.ts          # source acquisition (raw / git_ref / files / patch)
├── types.ts            # zod schemas
├── core/
│   ├── cli.ts          # argv parser (pure)
│   ├── dispatch.ts     # position→model assignment (pure)
│   ├── challenge.ts    # challenge orchestration
│   ├── review.ts       # focus→positions preset
│   ├── prompts.ts      # system + round prompts
│   ├── output.ts       # transcript formatter
│   └── availability.ts # health → available models
└── adapters/
    ├── base.ts registry.ts
    └── claude.ts codex.ts gemini.ts openai.ts kimi.ts
```

## Development

```bash
bun install
bun test          # full suite
bun run build     # produces dist/index.js
```

## License

MIT
