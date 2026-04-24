# Feat Multi-turn tool calling foundation

## Overview

This feature evolves the current `/ask` flow from a simple prompt-response endpoint into a persisted multi-turn tool-calling foundation.

The project already has:
- a working `POST /ask` endpoint
- a real Anthropic gateway
- a fake gateway for tests
- conversation and message persistence structure
- a mocked order repository with:
  - `getOrderStatus`
  - `getOrderItems`

The next step is to connect these parts into a single coherent flow that supports:
- persisted conversations
- follow-up clarification across turns
- tool definitions
- tool execution
- a shared LLM response contract across Fake and Anthropic gateways

This feature is needed before planner introduction because planner work depends on a stable baseline for:
- multi-turn message persistence
- LLM decisions
- tool execution
- follow-up responses

---

## ✅ Task 1 — Introduce a shared LLM response contract for tool calling

- [x] Define a shared internal LLM response contract that both gateways must return
- [x] Support at least:
  - `final_answer`
  - `tool_call`
- [x] Include fields needed for tool execution, such as:
  - `content`
  - `toolName`
  - `toolUseId` (if applicable)
  - `arguments`
- [x] Update the Fake gateway to follow the shared contract
- [x] Update the Anthropic gateway to follow the shared contract

**Acceptance criteria:**
- Fake and Anthropic gateways return the same internal response shape
- `AskService` can depend only on the abstraction, not provider-specific formats
- Contract supports both direct responses and tool-calling flows

---

## ✅ Task 2 — Add tool definitions and tool executor

- [x] Create tool definition types under a dedicated `tools/` area
- [x] Implement tool definitions for:
  - `getOrderStatus`
  - `getOrderItems`
- [x] Ensure each tool definition includes:
  - name
  - description
  - input schema
- [x] Implement `ToolExecutorService`
- [x] Support explicit dispatch for:
  - `getOrderStatus`
  - `getOrderItems`
- [x] Reuse the existing mocked `OrderRepository`

**Acceptance criteria:**
- Tool definitions exist and are structured consistently
- Tool executor can execute both supported tools
- Unsupported tool names are handled safely
- Order data remains mocked and centralized in `OrderRepository`

---

## ✅ Task 3 — Persist conversations and messages in `/ask`

- [x] Update `/ask` request DTO to support:
  - `prompt: string`
  - `conversationId?: string`
- [x] Update `/ask` response DTO to return:
  - `conversationId`
  - `content`
- [x] If `conversationId` is not provided:
  - create a new conversation
- [x] If `conversationId` is provided:
  - load the conversation
- [x] Persist incoming user message
- [x] Persist assistant final answers
- [x] Keep message ordering correct and stable

**Acceptance criteria:**
- `/ask` supports both new and existing conversations
- User and assistant messages are persisted correctly
- Response always includes `conversationId`
- Existing prompt-response behavior still works in the new structure

---

## ✅ Task 4 — Build multi-turn conversation context for the LLM

- [x] Load persisted message history for a conversation
- [x] Convert persisted messages into the LLM message format
- [x] Include the current user message in the next LLM request
- [x] Ensure message roles are mapped correctly
- [x] Preserve role ordering and turn continuity

**Acceptance criteria:**
- LLM receives the full persisted context needed for multi-turn replies
- Follow-up prompts can depend on previous assistant clarifications
- Message role mapping is consistent across providers

---

## ✅ Task 5 — Pass tools to the LLM and support tool-calling flow

- [x] Pass tool definitions to the active LLM gateway
- [x] Ensure both Fake and Anthropic gateways can receive tools
- [x] If the LLM returns `final_answer`:
  - persist assistant message
  - return response
- [x] If the LLM returns `tool_call`:
  - execute the requested tool
  - persist tool-related messages as needed
  - call the LLM again with updated context
  - persist final assistant response
  - return response
- [x] Keep the flow simple and linear for now

**Acceptance criteria:**
- Tool definitions are available to the LLM
- Both providers support the same tool-calling contract
- Tool execution works end-to-end through `/ask`
- Final assistant answer is returned after tool execution when applicable

---

## ✅ Task 6 — Support clarification-based multi-turn behavior

- [x] Ensure the system can respond directly when the order ID is missing
- [x] Persist the assistant clarification message
- [x] On the next user turn, reuse the persisted conversation context
- [x] Allow the LLM to infer that the follow-up prompt answers the previous clarification
- [x] Validate flows such as:
  - user asks for order status without ID
  - assistant asks which order
  - user provides order ID
  - assistant answers using the correct tool

**Acceptance criteria:**
- Clarification-first multi-turn flow works end-to-end
- `conversationId` links the follow-up correctly
- The assistant can continue from previous context without losing the thread

---

## ✅ Task 7 — Add and update tests

- [x] Add/update tests for DTO and `/ask` flow
- [x] Cover direct answer flow
- [x] Cover multi-turn clarification flow
- [x] Cover tool call flow for:
  - `getOrderStatus`
  - `getOrderItems`
- [x] Cover unsupported tool behavior where relevant
- [x] Keep Fake gateway tests passing
- [x] Keep Anthropic gateway tests aligned with the shared contract

**Acceptance criteria:**
- Main ask flow behaviors are covered
- Tool-calling and multi-turn scenarios are tested
- Existing working behavior remains protected by tests

---

## ✅ Final validation

- [x] Run all relevant scripts
- [x] Confirm the project remains stable
- [x] Confirm `/ask` works for:
  - direct answer
  - clarification-based multi-turn
  - tool execution
- [x] Confirm checklist is fully marked

**Acceptance criteria:**
- All relevant scripts pass
- `/ask` supports persisted multi-turn conversations
- Supported tools execute correctly
- No planner logic was introduced prematurely

---

## 🧾 Commit Strategy

Each main task should result in one commit.

Suggested commits:

- feat(llm): define shared tool-calling response contract
- feat(tools): add tool definitions and executor
- feat(ask): persist conversations and messages in ask flow
- feat(ask): build llm context from persisted conversation history
- feat(ask): support tool-calling flow in ask endpoint
- feat(ask): support clarification-based multi-turn flow
- test(ask): cover multi-turn and tool-calling scenarios

Each commit must include:

Co-authored-by: OpenAI Codex <codex@openai.com>

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
- CI (if available) passes
