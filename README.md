# Arena MCP

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

# OpenAI CLI (required for openai agent)
pip install openai-cli

# Gemini CLI (required for gemini agent)
# Follow Google's installation guide
```

### Install Arena MCP

#### From GitHub Release (Recommended)

```bash
# Install from latest release tarball
npm install -g https://github.com/tim101010101/arena/releases/latest/download/arena-mcp-v0.1.0.tgz

# Or install directly from git
npm install -g git+https://github.com/tim101010101/arena.git
```

#### From Source

```bash
git clone https://github.com/tim101010101/arena.git
cd arena
bun install
bun run build
npm install -g .
```

### Configure MCP Client

Add to your MCP client configuration (e.g., `~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "arena": {
      "command": "arena-mcp",
      "env": {
        "ARENA_TIMEOUT_MS": "120000",
        "ARENA_DEFAULT_ROUNDS": "3",
        "ARENA_DEFAULT_MODE": "parallel",
        "ARENA_CLAUDE_MODEL": "claude-sonnet-4-6",
        "ARENA_OPENAI_MODEL": "gpt-4",
        "ARENA_GEMINI_MODEL": "gemini-pro"
      }
    }
  }
}
```

Restart your MCP client to load the server.

## Configuration
### Troubleshooting

- **Build fails**: Ensure `bun` is installed (`curl -fsSL https://bun.sh/install | bash`)
- **Config not found**: Ask user for their MCP config file location
- **Tools not appearing**: User must restart their MCP client after config changes

</details>

### Configure MCP Client

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "arena": {
      "command": "bun",
      "args": ["run", "/path/to/arena/dist/index.js"],
      "env": {
        "ARENA_TIMEOUT_MS": "120000",
        "ARENA_DEFAULT_ROUNDS": "3",
        "ARENA_DEFAULT_MODE": "parallel",
        "ARENA_CLAUDE_MODEL": "claude-sonnet-4-6",
        "ARENA_OPENAI_MODEL": "gpt-4",
        "ARENA_GEMINI_MODEL": "gemini-pro"
      }
    }
  }
}
```

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

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ARENA_TIMEOUT_MS` | `120000` | Max execution time per agent (ms) |
| `ARENA_DEFAULT_ROUNDS` | `3` | Default number of debate/challenge rounds |
| `ARENA_DEFAULT_MODE` | `parallel` | Default execution mode (`sequential` or `parallel`) |
| `ARENA_CLAUDE_MODEL` | - | Claude model to use (e.g., `claude-sonnet-4-6`) |
| `ARENA_CODEX_MODEL` | - | Codex model to use |
| `ARENA_GEMINI_MODEL` | - | Gemini model to use |
| `ARENA_OPENAI_MODEL` | - | OpenAI model to use |

### Agent IDs

- `claude` - Anthropic Claude via CLI
- `codex` - Codex via CLI
- `openai` - OpenAI via CLI
- `gemini` - Google Gemini via CLI

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
