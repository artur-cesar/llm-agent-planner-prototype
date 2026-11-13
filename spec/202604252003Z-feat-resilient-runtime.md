# Feat Runtime resilience and structured tool failures

## Overview

This feature improves the agent runtime by making tool execution more realistic, observable, and resilient.

The project already supports:
- multi-turn conversations
- persisted messages
- `x-user-id` header to simulate authentication
- `conversationId` in the request body to continue an existing conversation
- planner abstraction
- LLM-based planner
- `TurnRunnerService`
- multi-tool execution loop
- max iteration guard
- two mocked order tools:
  - `getOrderStatus`
  - `getOrderItems`

The current system can execute multiple tool calls in the same user turn.

Example that works:
- User asks: "What is the status and items of order 123?"
- System calls `getOrderStatus`
- System calls `getOrderItems`
- System returns one final answer combining both results

However, the current runtime assumes tools behave perfectly.

In real systems, tools can:
- be slow
- timeout
- fail temporarily
- fail permanently
- return partial data
- succeed while another tool fails in the same turn

This feature introduces:
- configurable tool latency simulation
- tool timeout handling
- structured tool errors
- retry policy
- partial success support
- better runtime logs for tool execution steps

The immediate goal is not to build a complex production-grade agent framework.

The immediate goal is to make the current planner execution loop resilient enough to handle realistic tool failures without hiding errors or crashing unpredictably.

---

## ✅ Task 1 — Introduce structured tool result contract

- [x] Define a normalized tool execution result type
- [x] Support successful tool execution result
- [x] Support failed tool execution result
- [x] Include metadata such as:
  - tool name
  - arguments
  - success status
  - error reason
  - retryable flag
  - execution duration
  - attempt number
- [x] Avoid throwing raw errors from normal tool execution paths

Suggested shape:
- type: tool_success or tool_error
- toolName
- arguments
- data (for success)
- reason (for error: TIMEOUT, TOOL_NOT_FOUND, EXECUTION_ERROR, INVALID_ARGUMENTS)
- message
- retryable
- durationMs
- attempt

Acceptance criteria:
- Tool execution has a single normalized result contract
- Success and failure are explicit
- Retryable and non-retryable failures can be distinguished
- Runtime does not depend on raw thrown errors for expected tool failures

---

## ✅ Task 2 — Add tool latency simulation

- [x] Allow mocked tools to simulate latency
- [x] Add optional delay behavior to:
  - `getOrderStatus`
  - `getOrderItems`
- [x] Keep default behavior fast
- [x] Allow tests to configure slow tools
- [x] Avoid adding real external dependencies

Example scenarios:
- `getOrderStatus` responds immediately
- `getOrderItems` delays for 3 seconds
- one tool succeeds before another times out

Acceptance criteria:
- Tests can simulate fast tools
- Tests can simulate slow tools
- Default mocked tool behavior remains compatible
- Latency simulation is isolated to mocked/study tools

---

## ✅ Task 3 — Implement tool timeout handling

- [x] Add timeout support to `ToolExecutorService`
- [x] Introduce a default timeout configuration
- [x] Suggested default: 2000ms
- [x] If a tool exceeds timeout, return structured `tool_error`
- [x] Mark timeout errors as retryable
- [x] Ensure timed-out tools do not block the full turn indefinitely

Acceptance criteria:
- Slow tools are interrupted or handled after timeout
- Timeout produces a structured tool error
- Timeout does not crash the whole application unexpectedly
- Turn execution can continue after receiving a timeout result

---

## ✅ Task 4 — Add retry policy

- [x] Introduce retry configuration
- [x] Suggested defaults:
  - maxAttempts: 2
  - baseDelayMs: 100
- [x] Retry only when retryable is true
- [x] Do not retry non-retryable errors
- [x] Log each attempt
- [x] Return final structured error when retries are exhausted
- [x] Avoid infinite retry loops

Acceptance criteria:
- Retryable failures are retried up to the configured limit
- Non-retryable failures fail immediately
- Retry attempts are visible in logs
- Final result includes the final attempt number
- Retry behavior is deterministic in tests

---

## ✅ Task 5 — Convert tool failures into tool messages

- [x] Append failed tool results to the working message list
- [x] Preserve message role as `tool`
- [x] Include structured failure payload in tool message content
- [x] Preserve tool metadata:
  - tool name
  - tool arguments
  - tool use id, when available
- [x] Ensure the planner can see tool failure context on the next decision

Example content:
- type: tool_error
- toolName
- reason: TIMEOUT
- message
- retryable
- attempt

Acceptance criteria:
- Tool errors are visible to the planner
- Tool errors are stored in the same message flow as successful results
- Message ordering remains stable
- Existing successful tool result mapping remains compatible

---

## ✅ Task 6 — Support partial success responses

- [x] Validate scenario where one tool succeeds and another fails
- [x] Ensure the planner receives both:
  - successful tool result
  - failed tool result
- [x] Ensure final answer can explain partial success
- [x] Do not fake missing data
- [x] Do not hide failed tool execution from the final answer

Example:
- User asks: "What is the status and items of order 123?"
- `getOrderStatus` succeeds
- `getOrderItems` times out
- Final answer should mention the known status and explain that items could not be loaded

Acceptance criteria:
- Runtime supports partial success
- Final answer can combine success and failure context
- Failed tool does not erase successful tool result
- System does not return misleading complete answers

---

## ✅ Task 7 — Improve runtime logging

- [x] Log planner decision per iteration
- [x] Log tool execution start
- [x] Log tool execution success
- [x] Log tool execution failure
- [x] Log timeout events
- [x] Log retry attempts
- [x] Log final turn outcome
- [x] Include useful metadata:
  - iteration number
  - tool name
  - duration
  - attempt
  - error reason

Acceptance criteria:
- Runtime behavior can be inspected from logs
- Logs make multi-step execution understandable
- Logs help distinguish planner issues from tool execution issues
- Logs do not expose secrets or sensitive values

---

## ✅ Task 8 — Add runtime budget guards

- [x] Add max tool calls per turn
- [x] Add max LLM calls per turn
- [x] Keep existing max iteration guard
- [x] Fail explicitly when budget is exceeded
- [x] Avoid silent loop termination
- [x] Return or throw predictable runtime errors

Suggested defaults:
- maxIterations: 5
- maxToolCalls: 3
- maxLlmCalls: 5

Acceptance criteria:
- Runtime cannot call tools endlessly
- Runtime cannot call the LLM endlessly
- Budget failures are explicit
- Existing max iteration behavior remains compatible

---

## ✅ Task 9 — Update tests

- [x] Add tests for structured tool success result
- [x] Add tests for structured tool error result
- [x] Add tests for timeout handling
- [x] Add tests for retryable failures
- [x] Add tests for non-retryable failures
- [x] Add tests for retry exhaustion
- [x] Add tests for partial success:
  - `getOrderStatus` succeeds
  - `getOrderItems` fails
  - final answer receives both contexts
- [x] Add tests for max tool call guard
- [x] Add tests for max LLM call guard
- [x] Keep existing tests passing

Acceptance criteria:
- Runtime resilience behavior is covered
- Timeout behavior is deterministic
- Retry behavior is deterministic
- Partial success is explicitly validated
- No regression in existing planner and multi-tool flows

---

## ✅ Final validation

- [ ] Run all relevant scripts
- [x] Validate `/ask` for:
  - direct answer
  - single successful tool call
  - multiple successful tool calls
  - tool timeout
  - retryable tool failure
  - non-retryable tool failure
  - partial success
  - budget guard failure
- [x] Confirm `x-user-id` behavior remains unchanged
- [x] Confirm `conversationId` behavior remains unchanged
- [x] Confirm existing multi-turn behavior remains unchanged
- [x] Confirm existing multi-tool behavior remains unchanged
- [ ] Confirm checklist is fully marked

Acceptance criteria:
- Runtime handles slow tools safely
- Runtime handles failed tools explicitly
- Runtime supports partial answers
- Runtime avoids infinite execution
- Runtime remains simple and inspectable

## Validation notes

- `npm run lint`: passed
- `npm test -- --runInBand`: passed
- `npm run test:e2e -- --runInBand`: passed
- `npm run build`: blocked by filesystem permissions in `dist/` (`EACCES: permission denied, rmdir '/home/tutticesar/Code/llm-agent-planner-prototype/dist/api-documentation'`)

`Run all relevant scripts` and `Confirm checklist is fully marked` remain unchecked because the current workspace still has externally-owned build artifacts under `dist/`, which prevent final build validation.

---

## 🧾 Commit Strategy

Each main task should result in one commit.

Suggested commits:
- feat(tools): introduce structured tool execution results
- feat(tools): add latency simulation for mocked order tools
- feat(tools): handle tool execution timeouts
- feat(tools): add retry policy for retryable failures
- feat(turn): append structured tool errors to message flow
- feat(turn): support partial success responses
- feat(turn): improve runtime execution logs
- feat(turn): add runtime budget guards
- test(turn): cover resilient tool execution scenarios

Each commit must include:

Co-authored-by: OpenAI Codex <codex@openai.com>

---

## 🚀 Pull Request

- [ ] Push the branch to origin
- [ ] Create a pull request using GitHub CLI (gh pr create --fill)
- [ ] Manually edit the PR body to comply with:
  `.github/pull_request_template.md`

Acceptance criteria:
- Pull request is successfully created
- PR description follows the template
- All sections are properly filled
- CI passes (if applicable)
