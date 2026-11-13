# Review: bug fixes and runtime simplification

## Objective

Fix the issues identified during the review and reduce the effort required to follow a request from end to end. Preserve the project's educational purpose: explicit decisions, few layers, and sequential tool execution.

This is a cross-cutting task. It does not advance `ROADMAP.md` milestones or add product features. This document is a plan; creating it does not start implementation.

## Behavior to preserve

- `POST /ask` accepts `prompt` and an optional `conversationId`, and returns `content` and `conversationId`.
- `x-user-id` remains a simulated identity; when absent, it defaults to `anonymous-user`.
- The model can answer, ask for clarification, or request tools in sequence.
- Tool results and failures inform the next decision.
- Execution limits, timeout, retry, and partial-success responses remain supported.
- Existing conversations remain readable; storage changes require a migration and an explicit policy for legacy records.

## Diagnosis and scope decisions

| Issue | Approach |
| --- | --- |
| Error helpers return a union that also allows success | Explicitly return `ToolExecutionErrorResult` |
| The fake duplicates the behavior of a real integration | Remove the provider and use programmed responses in tests |
| Existing conversations are retrieved without checking the user | Look up by ID and simulated identity |
| Generated messages are saved individually | Persist the batch in a short transaction |
| Concurrent requests can interleave turns | Reject overlapping turns in the same conversation with HTTP 409 |
| The gateway keeps only the first `tool_use` | Request one tool call per response and reject incompatible responses |
| The planner replicates the gateway's result | Unify contracts and remove the redundant delegation layer |
| The protocol is reconstructed from generic metadata | Define typed messages and a single persistence mapper |
| The executor mixes simulation with execution policy | Move simulation to the study tools |

Out of scope: real authentication, parallel tool execution, queues, new providers, streaming, dynamic plugins, a generic agent framework, and a complete rewrite. Do not add dependencies without a demonstrated need.

## Task 1 — Restore type validation

- [x] Reproduce and fix the four errors involving access to `reason` and `retryable` in the executor.
- [x] Declare the return types of `createErrorResult` and `normalizeError` as `ToolExecutionErrorResult`.
- [x] Check permissions on `dist/` artifacts; document the minimum recovery procedure without deleting files unrelated to the build or running the project as root.
- [x] Run the check without emitting files or using the incremental cache: `npx tsc --noEmit --incremental false -p tsconfig.build.json`.

**Acceptance criteria:** the check passes; permission issues and code issues are recorded separately; public execution results remain unchanged.

### Task 1 evidence — 2026-11-13

- Type fix committed as `a8408d7`; the TypeScript check without file emission or incremental caching passed again after the fix.
- All 7 executor tests passed; the push hook also ran all 9 suites, with 39 passing tests. Lint passed in the commit hook.
- The process user is `tutticesar` (`uid=1000`), but `dist/` is owned by `root:root` with mode `755`; the incremental cache is owned by `root:root` with mode `644`. These artifacts are not version-controlled.
- `npm run build` remains blocked by `EACCES` when removing `dist/api-documentation`. This is a local permission issue, separate from the type errors already fixed.
- Attempting to fix only the ownership of `dist/` with `sudo -n chown` did not change any files: the system requires interactive authentication.

Minimum recovery procedure for this workspace, to be run in a terminal with administrative authentication:

```bash
sudo chown -R -- "$(id -un):$(id -gn)" /home/tutticesar/Code/llm-agent-planner-prototype/dist
npm run build
```

Administrative privileges are used only to restore ownership of the artifacts to the user. The build must run as a regular user. There is no need to delete files or change permissions elsewhere in the repository. Task 1 is complete with respect to the required diagnosis and documentation; final build validation remains pending until this local recovery is performed.

## Task 2 — Remove the fake provider (scope revised by the user)

The real Anthropic integration is the reference for new providers. Do not maintain a second conversation engine solely as an example.

- [x] Remove the fake gateway, factory, dedicated tests, and provider registration.
- [x] Use Anthropic by default and require credentials and a model at startup.
- [x] Update `.env.example` and README without modifying the local `.env`.
- [x] Replace the fake in application tests with programmed responses local to each test.
- [x] Verify that persisted history reaches the gateway on the second turn.
- [x] Record final type, lint, test, and build validation for this change.

**Validation:** the TypeScript check without file emission or incremental caching, lint, and build passed; 35 tests in 8 suites and 2 e2e tests passed without external API calls. Tests dedicated to the fake were removed. The build previously blocked by permissions passed during this execution; the blocker recorded in Task 1 is historical.

**Acceptance criteria:** there is no fake provider in production code; the real integration documents the contract; tests remain independent of network access and real credentials. Fixing the fake's internal context handling was replaced by removing it.

## Task 3 — Enforce conversation ownership

- [x] Normalize the simulated identity once, before creating or retrieving a conversation.
- [x] Retrieve conversations by `id` and `userId`.
- [x] Return 404 both for a missing conversation and for one owned by another user.
- [x] Test the correct owner, a different user, and anonymous continuity.
- [x] Update the header description in Swagger and README.

**Acceptance criteria:** a different user cannot read or append messages to the conversation; no message is saved when the check fails. The header still does not provide real authentication.

**Task 3 validation:** 39 tests in 9 suites passed; the TypeScript check without file emission or incremental caching passed. The build was attempted and failed again with `EACCES` in `dist/api-documentation`; the permission recovery described in Task 1 still applies.

## Task 4 — Ensure history consistency

- [x] Persist the batch of generated messages in a single short transaction after the turn finishes.
- [x] Test rollback when a write in the batch fails: no tool call remains persisted without its result.
- [x] Keep the user prompt if the runtime fails and document this policy. Do not keep a database transaction open during LLM calls.
- [x] Add explicit overlap control per conversation, acquired before saving the prompt and released in `finally`.
- [x] Use a simple local guard for this single-process prototype; document that it does not cover multiple instances.
- [x] Test two overlapping requests: the second receives 409 without saving messages; after success or failure, a new request can proceed.
- [x] Replace random UUID tie-breaking with an explicit, persisted insertion order. Create a migration if necessary and define how legacy rows are backfilled without claiming to recover an unknown historical order.
- [x] Validate ordering with identical timestamps and with a conversation reloaded from the database.

**Acceptance criteria:** history preserves call → result → response order; write failures do not leave partial batches; overlapping requests do not interleave turns within the supported process.

### Task 4 evidence — 2026-11-13

- 42 unit tests in 9 suites passed, including overlap rejection without saving the second prompt, guard release after LLM success/failure, and recovery after a persistence failure.
- 5 e2e tests in 2 suites passed using disposable PostgreSQL 17, separate from the application database. The persistence suite verified rollback after the first batch write, prompt retention, ordering with identical timestamps and reversed UUIDs, legacy backfill, and migration rollback/reapplication.
- The TypeScript check without file emission or incremental caching and lint passed.
- `npm run build` was attempted but remains blocked by `EACCES` in `dist/api-documentation`. This is not a type error; local recovery is described in Task 1.
- The migration was validated in the test database and was not applied to the application database at this stage. Run `npm run migration:run` before starting the updated version.
- Concurrency control is per process, as scoped. The sequence represents insertion order within the serialized flow; it does not replace coordination across multiple instances.

## Task 5 — Make the gateway's sequential contract explicit

- [x] Check the installed SDK for the option to disable parallel tool calls and configure it in the Anthropic request.
- [x] Validate the number of `tool_use` blocks: if there is more than one, fail explicitly before executing tools, without silently discarding blocks.
- [x] Preserve the call identifier throughout execution, persistence, and history reconstruction.
- [x] Check `stop_reason` and distinguish a completed response from one interrupted by the token limit; do not save a truncated response as a successful final answer.
- [x] Test text responses, a single call, unexpected multiple calls, and truncated responses with a mocked client.

**Acceptance criteria:** the runtime executes one tool per decision; provider incompatibilities are observable and do not produce apparent success. Tests do not depend on a paid API.

### Task 5 evidence — 2026-11-13

- Requests with tools use `tool_choice: { type: 'auto', disable_parallel_tool_use: true }`, an option verified in the installed SDK. When there are no tools, `tool_choice` is omitted.
- `mapResponse` rejects more than one `tool_use` block and responses with `stop_reason=max_tokens`, including truncated calls, before returning a decision to the runner.
- The runner and storage format were preserved. Existing tests verify multiple calls in successive rounds and matching IDs in the history sent to the provider.
- 46 tests in 9 suites passed without API calls. The full-project TypeScript check without file emission or incremental caching passed.
- `npm run build` remains blocked by permissions on `dist/api-documentation`, as diagnosed in Task 1.

## Task 6 — Unify decisions and messages

- [x] Use a single decision contract for the gateway and the loop.
- [x] Remove `LlmPlanner` and equivalent contracts if they remain a simple delegation layer; inject `LlmGateway` into the runner.
- [x] Preserve LLM-driven decisions and explain in README that they happen within the loop, without requiring an intermediate class.
- [x] Define messages as a discriminated union: user message, assistant response, tool call, and tool result, with the required fields for each variant.
- [x] Centralize serialization, validation, and reading of the persisted protocol in a single mapper, preserving the legacy format where possible.
- [x] Remove duplicate reconstruction and duplication of the same data between fields and metadata in the in-memory model.
- [x] Test message round trips through the mapper, including invalid legacy data; fail clearly instead of producing empty identifiers.

**Acceptance criteria:** changing a decision does not require synchronizing identical contracts; invalid messages are no longer representable in the typed flow; `AskService` focuses on coordinating the request.

### Task 6 evidence — 2026-11-13

- Removed `LlmPlanner`, its contracts, and delegation tests. The runner injects `LLM_GATEWAY` and uses the `GenerateAnswerOutput` contract directly.
- Messages discriminated by type and role require the fields of each variant. `toolUseId` is mandatory for calls and results. Tool results remain structured in memory, without duplication in metadata.
- `message.mapper.ts` centralizes reading and writing of the persisted protocol. It preserves the database fields, JSON, and metadata; no migration is required. Incomplete or inconsistent tool data produces an explicit error with the message ID instead of falling back to empty identifiers.
- 59 unit tests in 9 suites passed, including mapper round trips for all variants, valid and invalid legacy records, direct gateway calls, and existing conversation flows.
- 6 e2e tests in 2 suites passed using disposable PostgreSQL 17. The new test executes two tools sequentially, persists the turn, and reloads typed history on a second request while preserving IDs.
- Reading the two conversations tested by the user validated 18 existing messages with the new mapper, without modifying records or calling the API.
- The full-project TypeScript check without file emission/caching, lint, and formatting passed. The host build remains blocked by `dist/` permissions; the build inside the application container passed.
- README was updated with the flow without a planner class. HTTP behavior, the concurrency guard, and atomic writes remain preserved.

## Task 7 — Separate simulated tools from execution

- [x] Move latency and programmed failures to study-tool implementations or test doubles.
- [x] Keep only validation, dispatch, timeout, retry, and result normalization in the executor.
- [x] Use a simple static registry to associate definitions and implementations, avoiding repeated names in independent lists and switches.
- [x] Remove `OrderService` if it remains unused, or give it a concrete responsibility; avoid another layer that only delegates to the repository.
- [x] Document that `Promise.race` limits the wait but does not cancel the operation. Preserve read-only tools; do not generalize retry to operations with side effects.
- [x] Keep a gateway with a sequence of programmed responses in runner tests, without reintroducing a production fake provider.
- [x] Preserve tests for timeout, retry, permanent failure, and partial success.

**Acceptance criteria:** simulation is not the executor's responsibility; adding a tool does not require updating multiple name catalogs; orchestration tests do not depend on the fake interpreting text.

### Task 7 evidence — 2026-11-13

- Removed `MockToolBehavior`, the failure/latency map, and `setToolBehavior` from the executor. Simulations are now programmed implementations in tests, without a production fake provider.
- `ToolRegistry` contains a static list associating each definition with its handler. The same registry supplies definitions to `AskService` and resolves names in the executor. Removed the separate `tool-definitions.ts` catalog, dispatch switch, and independent supported-name list.
- The executor validates the current string schemas, including required properties and rejection of extra arguments, before calling the handler. Unknown tools return `TOOL_NOT_FOUND` before argument validation.
- Removed `OrderService`, whose only responsibility was delegating to the repository. Order data remains simulated in `OrderRepository`, without changes to query behavior.
- Extracted `ToolExecutionFailure` to represent classified implementation failures and timeouts. Timeout/retry configuration and the result contract were preserved.
- 65 unit tests in 9 suites and 6 e2e tests in 2 suites passed, the latter using disposable PostgreSQL 17. Coverage preserves timeout, retry, permanent failure, retry exhaustion, partial success, and persistence across turns. An additional test confirms schema-based dispatch without assuming `orderId`.
- The test using a controlled clock verifies that the original operation can finish after the timeout. README documents this limitation and restricts the current policy to read-only tools.
- TypeScript without file emission/caching, lint, and formatting passed. The container build passed; the host build remains blocked by `EACCES` in `dist/api-documentation`.
- No migration, dependency, or HTTP contract change was required.

## Task 8 — Document and validate the result

- [x] Update README with the final flow, responsibilities, and limitations involving concurrency, timeout, and persistence failures.
- [x] Run `npm run lint`, `npm run format:check`, `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, and `npm run build`.
- [x] Validate migrations in a local test database, including rollback where applicable, without using personal or production data.
- [x] Verify atomic writes and message ordering with real PostgreSQL; repository mocks do not replace this validation.
- [x] Confirm direct responses, clarification across turns, two sequential tools, a second order in the same conversation, partial failure, and runtime limits.
- [x] Review the diff to remove abstractions without a purpose and out-of-scope changes.
- [x] Record commands executed, results, and any blockers. Mark items complete only with supporting evidence.
- [x] Confirm that no roadmap milestone was changed.

**Acceptance criteria:** checks pass, fixed scenarios have regression coverage, and the final flow can be followed without crossing layers that only copy data.

### Task 8 evidence — 2026-11-13

README was consolidated to cover container and host execution, correct ports, environment reloads, flow responsibilities, provider configuration, history usage, the static registry, limits, per-process concurrency, short transactions, and the lack of operation cancellation on timeout.

| Command/check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run format:check` | Passed |
| `npx tsc --noEmit --incremental false -p tsconfig.json` | Passed |
| `npm test -- --runInBand` | 65 tests in 9 suites passed |
| `TEST_DATABASE_URL=… npm run test:e2e -- --runInBand` | 6 tests in 2 suites passed, including real PostgreSQL |
| `npm run build` on the host | Executed; blocked by `EACCES` in `dist/api-documentation` |
| `docker exec llm-planner-application npm run build` | Passed in the application's runtime environment |
| `docker compose config --quiet` | Passed |
| HTTP `/docs` at `localhost:3001` and Dozzle at `localhost:8080` | Both returned 200 |
| `git diff --check` | Passed |
| Comparison of `spec/ROADMAP.md` and `package.json` against the start of the review (`8546011`) | Unchanged |

#### Confirmed scenarios

| Scenario | Evidence |
| --- | --- |
| Direct response and persistence | `ask.service.spec.ts` and `turn-runner.service.spec.ts` |
| Clarification and context across turns | `ask.service.spec.ts` |
| Two tools in successive rounds and one final response | Runner tests and PostgreSQL integration |
| Order 123 followed by status and items for order 456 in the same conversation | PostgreSQL test expanded in this task; checks results for 456 (`PREPARING`, `Monitor`), preserves IDs per call, and confirms all 12 persisted messages |
| Partial failure, timeout, retry, and permanent failure | Runner and executor tests; timeout with a controlled clock confirms that the operation continues after the wait limit |
| Iteration, tool-call, and LLM-call limits | `turn-runner.service.spec.ts` |
| Batch rollback and prompt retention | PostgreSQL integration with a foreign-key failure on the second write |
| Ordering with identical timestamps and reversed UUIDs | PostgreSQL integration |
| Migration on an empty database, legacy backfill, rollback, and reapplication | PostgreSQL integration |
| Ownership, overlap, and guard release after failures | Conversation service tests and `ask.service.spec.ts` |
| Storage-format compatibility and rejection of invalid metadata | `message.mapper.spec.ts` |

PostgreSQL 17 for validation was created in a disposable container with an isolated port and removed afterward. No test used the application database, personal data, or the paid Anthropic API. LLM decisions in tests are programmed; this validates the flow without guaranteeing how the real model interprets any particular prompt.

#### Final review and environment limitation

- The diff of fixes and refactors was reviewed: removed the fake, planner delegation, redundant order service, duplicate catalog, and simulation inside the executor. Only contracts and components with a responsibility in the flow remain.
- Preexisting local changes in `.gitignore`, `package-lock.json`, `ask-response.dto.ts`, and the rename of an older spec were preserved and are not part of this task.
- No dependencies were added and no roadmap milestones were advanced.
- The host build blocker concerns ownership of artifacts shared with the container, not code. It was documented in README; the build passed in the container running the application. This validation does not claim that the host build was fixed.
- At completion of this task, the spec remained in Portuguese and local, as requested. This task did not include a commit, push, or publication.

## Execution and commit strategy

Execute this spec in order. First stabilize behavior, then simplify contracts and structure. Keep fixes separate from refactors to make review and rollback easier.

One commit per main task, following `EXECUTION_PROTOCOL.md`, with conventional commit messages and the trailer required by the repository:

```text
Co-authored-by: OpenAI Codex <codex@openai.com>
```

Creating this plan does not include commits, pushes, or opening a PR. When implementation is requested, prepare the result and its validation before any authorized publication steps.
