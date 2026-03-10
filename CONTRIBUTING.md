# Contributing to Arena MCP

Thank you for your interest in contributing to Arena MCP!

## Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Make your changes
4. Run tests:
   ```bash
   bun test
   ```
5. Build:
   ```bash
   bun run build
   ```

## Code Style

- Use TypeScript with strict type checking
- Follow existing code patterns
- Keep functions under 50 lines
- Keep files under 800 lines
- Maximum nesting depth: 4 levels
- Use explicit error handling

## Testing

- Follow TDD: RED → GREEN → REFACTOR
- Write tests for new features
- Ensure all tests pass before submitting PR
- Test behavior, not implementation

## Adding New Adapters

To add support for a new AI provider:

1. Create `src/adapters/yourprovider.ts` implementing `AgentAdapter`
2. Register in `src/index.ts`
3. Add health check support
4. Add tests in `tests/adapters.test.ts`
5. Update README with configuration

Example adapter structure:

```typescript
import type { AgentAdapter, AgentRequest, AgentResponse, HealthResult } from "./base";

export class YourProviderAdapter implements AgentAdapter {
  readonly id = "yourprovider";
  readonly name = "Your Provider";

  async healthCheck(): Promise<HealthResult> {
    // Check CLI availability
  }

  async execute(req: AgentRequest): Promise<AgentResponse> {
    // Execute agent request
  }
}
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Update documentation if needed
4. Ensure tests pass
5. Submit PR with description of changes

## Commit Messages

Follow conventional commits:
- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation changes`
- `test: add or update tests`
- `refactor: code refactoring`
- `chore: maintenance tasks`

## Questions?

Open an issue for discussion before starting major changes.
