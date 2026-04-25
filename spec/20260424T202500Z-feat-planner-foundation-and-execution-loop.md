# Feat Planner foundation and multi-tool execution loop

## Overview

This feature introduces the first planner foundation on top of the existing multi-turn tool-calling system.

The project already supports:
- multi-turn conversations
- persisted messages
- `x-user-id` header to simulate authentication
- `conversationId` in the request body to continue an existing conversation
- a shared LLM response contract
- tool definitions and execution
- a working `/ask` flow
- two mocked order tools:
  - `getOrderStatus`
  - `getOrderItems`

The current system works when the user asks for one tool-backed answer.

Example that works:
- User asks: "What is the status of order 123?"
- System calls `getOrderStatus`
- System returns the final answer

However, the current system fails or is unsupported when the user asks for multiple tool-backed answers in the same turn.

Example that must be supported by this feature:
- User asks: "What is the status and items of order 123?"
- System should call `getOrderStatus`
- System should call `getOrderItems`
- System should return one final answer combining both results

This feature introduces:
- a planner abstraction responsible for deciding the next action
- a turn execution loop capable of handling multiple tool calls
- a dedicated orchestration layer (`TurnRunnerService`)

The immediate goal is not to build an advanced autonomous agent.

The immediate goal is to support multiple tool calls inside the same user turn while keeping the architecture ready for future planner-based execution.

---

## ✅ Task 1 — Introduce planner abstraction

- [x] Create a dedicated `planner/` directory
- [x] Define `PlannerDecision` type supporting:
  - `final_answer`
  - `tool_call`
- [x] Define `Planner` interface with a `decide` method
- [x] Ensure planner input includes:
  - messages
  - tools
  - system prompt
- [x] Keep the abstraction minimal and explicit

**Acceptance criteria:**
- Planner contract is clearly defined
- Planner supports both direct answers and tool calls
- Planner does not depend on provider-specific formats
- Planner can be reused by the execution loop for repeated decisions

---

## ✅ Task 2 — Implement LLM-based planner

- [x] Create `LlmPlanner` implementation
- [x] Inject `LlmGateway` into the planner
- [x] Call `generateAnswer` internally
- [x] Map `LlmResponse` to `PlannerDecision`
- [x] Support both:
  - `final_answer`
  - `tool_call`
- [x] Keep logic as a thin adapter

**Acceptance criteria:**
- Planner delegates decision-making to LLM
- Mapping between LLM response and planner decision is consistent
- No additional reasoning logic is introduced
- LLM remains responsible for deciding whether another tool is needed

---

## ✅ Task 3 — Introduce TurnRunnerService

- [x] Create `turn/` directory
- [x] Implement `TurnRunnerService`
- [x] Define `run` method receiving:
  - messages
  - system prompt
  - tools
- [x] Move orchestration logic out of `AskService`
- [x] Keep responsibilities focused on execution

**Acceptance criteria:**
- TurnRunnerService owns turn execution
- AskService no longer contains LLM/tool orchestration logic
- Clear separation exists between:
  - HTTP/application flow
  - conversation persistence
  - turn execution

---

## ✅ Task 4 — Implement multi-tool execution loop

- [x] Call planner to get the next decision
- [x] If decision is `final_answer`:
  - return immediately
- [x] If decision is `tool_call`:
  - execute tool via `ToolExecutorService`
  - append assistant tool-call message to working message list
  - append tool result message to working message list
  - call planner again with updated context
- [x] Repeat until final answer is reached
- [x] Support multiple tool calls in sequence

**Acceptance criteria:**
- User can ask for order status only
- User can ask for order items only
- User can ask for order status and order items in the same prompt
- System can execute `getOrderStatus` and `getOrderItems` in the same assistant turn
- Final answer can combine results from multiple tool calls
- Execution loop is deterministic and simple

---

## ✅ Task 5 — Add loop safety and guards

- [x] Add max iteration limit
- [x] Suggested default: 5
- [x] Throw explicit error if limit is reached
- [x] Handle unsupported tools explicitly
- [x] Fail fast on execution errors
- [x] Avoid silent failures

**Acceptance criteria:**
- Infinite loops are prevented
- Unsupported tools are handled safely
- Errors are explicit and predictable
- The system does not fake a final answer after execution failure

---

## ✅ Task 6 — Integrate TurnRunner into AskService

- [x] Inject `TurnRunnerService` into `AskService`
- [x] Remove existing LLM/tool execution logic from `AskService`
- [x] Delegate turn execution to TurnRunner
- [x] Keep conversation resolution in `AskService`
- [x] Keep user message persistence in `AskService`
- [x] Keep `x-user-id` handling unchanged
- [x] Keep `conversationId` continuation behavior unchanged
- [x] Persist generated assistant and tool messages after execution

**Acceptance criteria:**
- AskService becomes thinner and focused on application flow
- TurnRunner handles all planner/tool execution logic
- Existing direct answer flow remains compatible
- Existing multi-turn flow remains compatible
- Existing single-tool flow remains compatible

---

## ✅ Task 7 — Ensure multi-step message handling

- [x] Append assistant tool-call messages correctly
- [x] Append tool result messages correctly
- [x] Preserve message ordering
- [x] Preserve message roles:
  - user
  - assistant
  - tool
- [x] Preserve tool metadata:
  - tool name
  - tool arguments
  - tool use id, when available
- [x] Ensure generated messages are reused in subsequent planner calls
- [x] Keep compatibility with existing message mapping

**Acceptance criteria:**
- Message history remains consistent across steps
- LLM receives correct context after each tool execution
- Role mapping remains stable
- Tool results are available to the next planner decision

---

## ✅ Task 8 — Add and update tests

- [x] Add tests for planner decision mapping
- [x] Add tests for TurnRunner execution loop
- [x] Cover direct answer flow
- [x] Cover single tool call flow:
  - `getOrderStatus`
  - `getOrderItems`
- [x] Cover multiple tool calls in one turn:
  - user asks for status and items of the same order
  - system executes `getOrderStatus`
  - system executes `getOrderItems`
  - final answer includes both status and items
- [x] Test max iteration guard
- [x] Test unsupported tool behavior
- [x] Keep existing tests passing

**Acceptance criteria:**
- Planner and execution loop are covered by tests
- Multi-tool scenario is explicitly validated
- Existing behavior remains protected
- The original failure case is covered by a test

---

## ✅ Final validation

- [ ] Run all relevant scripts
- [x] Validate `/ask` for:
  - direct answer
  - single tool call
  - multiple tool calls
  - multi-turn conversation continuation
- [x] Confirm `x-user-id` behavior remains unchanged
- [x] Confirm `conversationId` behavior remains unchanged
- [x] Confirm no regression in existing flows
- [ ] Confirm checklist is fully marked

**Acceptance criteria:**
- System supports multiple tool calls in the same user turn
- System supports multi-step reasoning through repeated planner decisions
- Existing flows still work
- No planner overengineering was introduced

Validation note:
- `npm run lint` passed
- `npm test -- --runInBand` passed
- `npm run build` is blocked locally because the existing `dist/` directory is owned by `root` and cannot be rewritten in this environment

---

## 🧾 Commit Strategy

Each main task should result in one commit.

Suggested commits:

- feat(planner): introduce planner abstraction and decision types
- feat(planner): implement llm-based planner
- feat(turn): introduce turn runner service
- feat(turn): implement multi-tool execution loop
- feat(turn): add loop guards and safety checks
- refactor(ask): delegate execution to turn runner
- test(turn): cover planner and multi-tool execution scenarios

Each commit must include:

Co-authored-by: OpenAI Codex <codex@openai.com>

---

## 🚀 Pull Request

After completing all tasks and committing changes:

- [ ] Push the branch to origin
- [ ] Create a pull request using GitHub CLI (`gh pr create --fill`)
- [ ] Manually edit the PR body to fully comply with:
  `.github/pull_request_template.md`

**Acceptance criteria:**
- Pull request is successfully created
- PR description follows `.github/pull_request_template.md`
- All sections are properly filled
- CI, if available, passes
