# Arena MCP

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

A Model Context Protocol (MCP) server that enables multi-agent AI competitions and collaborations. Run debates, code reviews, red-team challenges, and evaluations across different AI models (Claude, OpenAI, Gemini, Codex).

## Features

### 🎭 arena_debate
Multi-agent debates where AI agents argue different positions across multiple rounds.
- Assign specific positions to each agent
- Sequential or parallel execution modes
- Full conversation history tracking

### 🔍 arena_review
Parallel code reviews from multiple AI perspectives.
- Focus areas: bugs, security, performance, or comprehensive review
- Support for git refs, file lists, patches, and raw code
- JSON or prose output formats

### ⚔️ arena_challenge
Red-team style challenges where multiple agents attack an assertion.
- Optional defender agent to protect the assertion
- Multi-round adversarial testing
- Find edge cases and counterexamples

### ⚖️ arena_judge
Impartial evaluation of completed arena sessions.
- Score each agent's performance
- Identify strengths, weaknesses, and consensus
- Custom evaluation criteria

### 🏥 arena_health
Health check for all registered AI agent CLIs.

## Installation

### Prerequisites

Install the AI CLI tools you want to use:

```bash
# Claude CLI (required for claude agent)
npm install -g @anthropic-ai/claude-cli

# Codex CLI (required for codex agent)
npm install -g @codex-ai/cli

# Note: OpenAI and Gemini agents use codex CLI as adapter
# No separate openai-cli or gemini-cli installation needed
```

### Install Arena MCP

#### From GitHub (Recommended)

```bash
# Install directly from GitHub
bun install -g github:tim101010101/arena

# Or use with bunx (no installation needed)
bunx --bun github:tim101010101/arena
```

#### From Source

```bash
git clone https://github.com/tim101010101/arena.git
cd arena
bun install
bun run build
bun install -g .
```

### Configure MCP Client

Arena MCP works with any MCP-compatible client. Configuration examples:

#### Claude Desktop

Edit the configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Or use: Settings > Developer > Edit Config

```json
{
  "mcpServers": {
    "arena": {
      "command": "bunx",
      "args": ["--bun", "github:tim101010101/arena"],
      "env": {
        "ARENA_TIMEOUT_MS": "120000",
        "ARENA_DEFAULT_ROUNDS": "3",
        "ARENA_DEFAULT_MODE": "parallel"
      }
    }
  }
}
```

#### Claude Code CLI

Use the CLI command to add the MCP server:

```bash
# If installed globally
claude mcp add arena arena

# Or specify full path to dist/index.js
claude mcp add arena bun /path/to/arena/dist/index.js
```

To configure environment variables, edit your Claude Code config file manually:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Configuration format is the same as Claude Desktop.

#### Other MCP Clients

For other MCP clients, refer to their documentation for MCP server configuration. The server command is `arena` and configuration is done via environment variables (see Configuration section below).

Restart your MCP client to load the server.

## Configuration

All configuration is done through environment variables in the MCP client configuration. Available options:

| Variable | Description | Default | Valid Range |
|----------|-------------|---------|-------------|
| `ARENA_TIMEOUT_MS` | Agent execution timeout (milliseconds) | `120000` | 1000-600000 |
| `ARENA_DEFAULT_ROUNDS` | Default rounds for debates/challenges | `3` | 1-10 |
| `ARENA_DEFAULT_MODE` | Execution mode | `parallel` | `sequential`, `parallel` |
| `ARENA_MAX_CONTEXT_SIZE` | Maximum context size | `1000000` | 100000-10000000 |
| `ARENA_CLAUDE_MODEL` | Claude model override | (CLI default) | See Claude CLI docs for current models |
| `ARENA_CODEX_MODEL` | Codex model override | (CLI default) | See Codex CLI docs for current models |
| `ARENA_GEMINI_MODEL` | Gemini model override | (CLI default) | See Gemini docs for current models |
| `ARENA_OPENAI_MODEL` | OpenAI model override | (CLI default) | See OpenAI docs for current models |

### Example Configuration

```json
{
  "mcpServers": {
    "arena": {
      "command": "arena",
      "env": {
        "ARENA_TIMEOUT_MS": "180000",
        "ARENA_DEFAULT_ROUNDS": "5",
        "ARENA_DEFAULT_MODE": "sequential"
      }
    }
  }
}
```

### Troubleshooting

- **Build fails**: Ensure `bun` is installed (`curl -fsSL https://bun.sh/install | bash`)
- **Tools not appearing**: Restart your MCP client after config changes
- **Agent CLI not found**: Install the required CLI tools (see Prerequisites)
- **Invalid config**: Check the error message for validation details

## Usage Examples

### Debate: Architecture Decision

```typescript
// Ask multiple AI agents to debate a technical decision
arena_debate({
  topic: "Should we use microservices or monolith for our new project?",
  agents: ["claude", "openai", "gemini"],
  positions: {
    "claude": "Advocate for microservices architecture",
    "openai": "Advocate for monolithic architecture",
    "gemini": "Neutral evaluator focusing on trade-offs"
  },
  rounds: 3,
  context: "Team size: 5 developers, Expected scale: 10k users in year 1",
  mode: "sequential"
})
```

### Code Review: Multiple Perspectives

```typescript
// Get code reviews from multiple AI agents
arena_review({
  sources: [{
    type: "git_ref",
    ref: "feature/new-auth",
    root: "/path/to/repo"
  }],
  agents: ["claude", "codex", "openai"],
  focus: "security",
  output_format: "json"
})
```

### Challenge: Security Assertion

```typescript
// Red-team test a security claim
arena_challenge({
  assertion: "Our authentication system is immune to timing attacks",
  evidence: "We use constant-time comparison for all password checks",
  challengers: ["claude", "codex"],
  defender: "openai",
  rounds: 2,
  context: "Node.js backend with bcrypt password hashing"
})
```

### Judge: Evaluate Debate

```typescript
// Have a neutral agent evaluate the debate
arena_judge({
  session_id: "debate_abc123",
  judge: "gemini",
  criteria: ["evidence quality", "logical coherence", "practical feasibility"]
})
```

## Architecture

```
src/
├── index.ts           # MCP server entry point
├── types.ts           # Zod schemas and TypeScript types
├── orchestrator.ts    # Multi-agent execution orchestration
├── session.ts         # Session management and history
├── context.ts         # Code context acquisition (git, files)
├── prompts.ts         # System and user prompts for each mode
├── output.ts          # Response formatting
├── utils.ts           # Utilities (timeout, env, binary checks)
├── constants.ts       # Configuration constants
└── adapters/
    ├── base.ts        # AgentAdapter interface
    ├── registry.ts    # Adapter registry
    ├── claude.ts      # Claude CLI adapter
    ├── codex.ts       # Codex CLI adapter
    ├── openai.ts      # OpenAI CLI adapter
    └── gemini.ts      # Gemini CLI adapter
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build

# Start server (for testing)
bun run start
```

## Use Cases

### 1. Code Review Enhancement
Get multiple AI perspectives on code changes to catch more issues and improve code quality.

### 2. Technical Decision Making
Use structured debates to explore trade-offs and reach better architectural decisions.

### 3. Security Testing
Red-team your security assumptions with adversarial AI agents.

### 4. AI Model Comparison
Compare capabilities of different AI models on the same task.

### 5. Collective Intelligence
Leverage multiple AI agents to solve complex problems that benefit from diverse perspectives.

## Limitations

- Requires CLI tools for each AI provider
- API costs scale with number of agents and rounds
- Parallel mode can be expensive for large-scale usage
- Response quality depends on underlying AI models

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT

## Roadmap

- [ ] Web UI for visualizing debates and reviews
- [ ] Result persistence and analytics
- [ ] Support for more AI providers
- [ ] Streaming responses
- [ ] Cost tracking and optimization
- [ ] Custom agent personas and expertise areas
