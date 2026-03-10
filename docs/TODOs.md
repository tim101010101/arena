# TODOs

## Concurrency Control in Parallel Mode

- **Status**: 🔴 Pending
- **Priority**: 🟡 Medium
- **Created**: 2026-03-10
- **Tags**: performance, orchestrator, reliability

### Background

Currently, parallel mode executes all agent requests simultaneously without any concurrency limit. This can lead to resource exhaustion when running many agents or during high load scenarios.

### Action Items

- [ ] Evaluate p-limit library vs custom implementation
- [ ] Add ARENA_MAX_CONCURRENCY environment variable (default: 5)
- [ ] Implement concurrency pool in orchestrator.ts
- [ ] Add tests for concurrent execution limits
- [ ] Update documentation with concurrency configuration

## End-to-End Integration Tests

- **Status**: ✅ Completed
- **Priority**: 🟡 Medium
- **Created**: 2026-03-10
- **Completed**: 2026-03-10
- **Tags**: testing, quality, ci

### Background

Current test suite only covers unit tests for individual modules. Missing integration tests that simulate real MCP protocol interactions and multi-agent workflows end-to-end.

### Action Items

- [x] Create tests/integration/ directory
- [x] Add MCP server lifecycle tests (startup, shutdown, error handling)
- [x] Test complete debate workflow with mock agents
- [x] Test complete review workflow with mock code sources
- [x] Test complete challenge workflow
- [x] Test session persistence across multiple rounds
- [ ] Test arena_judge workflow (missing)
- [x] Add integration tests to CI pipeline

## Structured Logging System

- **Status**: 🔴 Pending
- **Priority**: 🟡 Medium
- **Created**: 2026-03-10
- **Tags**: observability, debugging, production

### Background

Currently only basic console.error logging exists. Production deployments need structured logging for debugging, monitoring, and audit trails of agent interactions.

### Action Items

- [ ] Choose logging library (pino recommended for performance)
- [ ] Add ARENA_LOG_LEVEL environment variable
- [ ] Implement logger utility in src/logger.ts
- [ ] Add request/response logging in orchestrator
- [ ] Log agent execution start/end with latency
- [ ] Log errors with full context (agent, request, stack trace)
- [ ] Add session lifecycle logging
- [ ] Update documentation with logging configuration

## Environment Variable Validation

- **Status**: ✅ Completed
- **Priority**: 🟡 Medium
- **Created**: 2026-03-10
- **Completed**: 2026-03-10
- **Tags**: config, reliability, dx

### Background

Environment variables in src/constants.ts are read directly without validation. Invalid configurations can cause runtime errors that are hard to debug.

### Action Items

- [x] Create src/config.ts with Zod schemas for all env vars
- [x] Validate ARENA_TIMEOUT_MS (number, min: 1000, max: 600000)
- [x] Validate ARENA_DEFAULT_ROUNDS (number, min: 1, max: 10)
- [x] Validate ARENA_DEFAULT_MODE (enum: sequential|parallel)
- [x] Validate ARENA_*_MODEL strings (non-empty if provided)
- [x] Add helpful error messages for invalid configs
- [x] Validate on server startup, fail fast with clear errors
- [x] Add tests for config validation
- [x] Update documentation with all available env vars
