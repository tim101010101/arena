# Integration Tests & Config Validation — Design

Date: 2026-03-10
Status: ready

## Summary

Add end-to-end integration tests for MCP protocol interactions and implement environment variable validation using Zod. This improves reliability, developer experience, and production readiness.

## Design

### Part 1: Integration Tests

**Architecture**:
- Create `tests/integration/` directory with test utilities
- Use Bun's test runner with longer timeouts for integration tests
- Mock agent CLIs using test fixtures instead of real API calls
- Test complete MCP request/response cycles

**Test Structure**:
```
tests/integration/
├── helpers/
│   ├── mock-server.ts      # MCP server test harness
│   ├── mock-adapter.ts     # Configurable mock agent
│   └── fixtures.ts         # Test data (code samples, debates)
├── debate.test.ts          # arena_debate workflow
├── review.test.ts          # arena_review workflow
├── challenge.test.ts       # arena_challenge workflow
├── judge.test.ts           # arena_judge workflow
└── health.test.ts          # arena_health checks
```

**Mock Server Approach**:
- Create test harness that starts MCP server in-process
- Use stdio transport with programmatic input/output
- Inject mock adapters into registry before tests
- Clean up sessions after each test

**Mock Adapter Features**:
- Configurable responses (success, error, timeout)
- Latency simulation
- Response history tracking for assertions
- Support for multi-round interactions

**Test Coverage**:
1. **Debate**: 2 agents, 3 rounds, sequential/parallel modes
2. **Review**: Multiple code sources (raw, file_list, git_ref)
3. **Challenge**: With/without defender, multi-round
4. **Judge**: Evaluate completed sessions
5. **Health**: All adapters, mixed healthy/unhealthy
6. **Error Cases**: Invalid input, timeout, agent failures
7. **Session Management**: Create, retrieve, multi-round state

### Part 2: Config Validation

**Architecture**:
- Create `src/config.ts` with Zod schemas
- Validate on server startup (fail fast)
- Export typed config object (replace constants.ts usage)
- Provide helpful error messages

**Schema Design**:
```typescript
const ConfigSchema = z.object({
  timeout_ms: z.number().int().min(1000).max(600_000).default(120_000),
  default_rounds: z.number().int().min(1).max(10).default(3),
  default_mode: z.enum(['sequential', 'parallel']).default('parallel'),
  max_context_size: z.number().int().min(100_000).max(10_000_000).default(1_000_000),
  models: z.object({
    claude: z.string().optional(),
    codex: z.string().optional(),
    gemini: z.string().optional(),
    openai: z.string().optional(),
  }),
});
```

**Error Handling**:
- Catch Zod validation errors on startup
- Format errors with field name, expected type, received value
- Exit with code 1 and clear error message
- Log to stderr for visibility

**Migration Strategy**:
1. Create `src/config.ts` with validation
2. Update `src/constants.ts` to re-export from config
3. Update imports across codebase
4. Add config validation tests
5. Update documentation

## Changes

| File | Action | Description |
|------|--------|-------------|
| `tests/integration/helpers/mock-server.ts` | new | MCP server test harness |
| `tests/integration/helpers/mock-adapter.ts` | new | Configurable mock agent adapter |
| `tests/integration/helpers/fixtures.ts` | new | Test data and utilities |
| `tests/integration/debate.test.ts` | new | Debate workflow integration tests |
| `tests/integration/review.test.ts` | new | Review workflow integration tests |
| `tests/integration/challenge.test.ts` | new | Challenge workflow integration tests |
| `tests/integration/judge.test.ts` | new | Judge workflow integration tests |
| `tests/integration/health.test.ts` | new | Health check integration tests |
| `src/config.ts` | new | Zod-based config validation |
| `src/constants.ts` | modify | Re-export from config.ts for backward compat |
| `src/index.ts` | modify | Call validateConfig() on startup |
| `tests/config.test.ts` | new | Config validation unit tests |
| `package.json` | modify | Add test:integration script |
| `README.md` | modify | Document all env vars with validation rules |

## Acceptance Criteria

### Integration Tests
- [ ] AC-1: All 5 MCP tools have integration tests with mock agents
- [ ] AC-2: Tests cover both sequential and parallel execution modes
- [ ] AC-3: Tests verify session state persistence across rounds
- [ ] AC-4: Tests cover error scenarios (timeout, invalid input, agent failure)
- [ ] AC-5: Mock adapter can simulate configurable latency and errors
- [ ] AC-6: Integration tests run in CI with `bun test:integration`
- [ ] AC-7: All integration tests pass with <5s total runtime

### Config Validation
- [ ] AC-8: Server validates all env vars on startup using Zod
- [ ] AC-9: Invalid config causes immediate exit with helpful error message
- [ ] AC-10: Config validation covers all numeric ranges and enum values
- [ ] AC-11: Optional model configs accept undefined or non-empty strings
- [ ] AC-12: Config exports typed object (no more raw process.env access)
- [ ] AC-13: Config validation has 100% test coverage
- [ ] AC-14: README documents all env vars with types and defaults

## Unresolved Questions

None

## Implementation Notes

**Testing Strategy**:
- Keep integration tests fast (<5s total) by using mocks, not real APIs
- Run integration tests separately from unit tests for CI flexibility
- Use descriptive test names: `should_handle_timeout_in_parallel_debate`

**Config Validation Timing**:
- Validate synchronously before starting MCP server
- Don't catch validation errors — let process crash with clear message
- Consider adding `--validate-config` CLI flag for dry-run checks

**Backward Compatibility**:
- Keep `src/constants.ts` exporting from config for existing imports
- Deprecate direct process.env access in future refactor
