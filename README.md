# LLM Order Planner Prototype

## 🔎 Overview

This project is a backend prototype built with NestJS to explore LLM-based application architectures.

It evolves from a simple tool-calling system into a planner-based execution model capable of:

- multi-turn conversations
- tool calling
- multi-step reasoning
- sequential execution of multiple tools within a single user request

The system persists conversations and maintains context across requests using:

- `x-user-id` (simulated authentication)
- `conversationId` (multi-turn continuity)

---

## 🧭 Spec-Driven Development With Codex

This project is developed using a **spec-driven workflow**.

Each feature is defined as a structured specification and then implemented step-by-step using Codex.

Key principles:

- break features into explicit tasks
- define acceptance criteria before coding
- implement in small, verifiable steps
- avoid premature abstraction
- keep architecture aligned with real problems

Specs live under the `spec/` directory and guide the evolution of the system.

---

## ⚙️ Stack

- Node.js
- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- Docker
- Anthropic (Claude) API
- Jest (testing)
- OpenAPI (Swagger)

---

## ▶️ How To Run

```bash
# install dependencies
npm install

# configure ANTHROPIC_API_KEY and ANTHROPIC_MODEL in your environment
# LLM_PROVIDER defaults to anthropic; no fake provider is available

# run database (docker)
docker-compose up -d

# run migrations (if needed)
npm run migration:run

# start app
npm run start:dev
```

## 🌐 Docs (OpenAPI + Swagger)
Once the app is running, access:

```bash
http://localhost:3000/docs
```
Swagger UI allows you to:
- explore the /ask endpoint
- test requests interactively
- understand request/response contracts

## 🧠 What The Code Does

At a high level:
- Receives a user prompt via /ask
- Persists the message in a conversation
- Builds full conversation context
- Delegates execution to a planner-based runtime

Execution flow:
```bash
AskService
  -> TurnRunnerService
      -> LlmGateway (Anthropic)
          -> returns the next LLM decision
      -> ToolExecutorService
          -> executes tools
      -> loop until final answer
```
`TurnRunnerService` owns the loop and calls `LlmGateway` directly. Planning means the model chooses the next action after each result; there is no separate planner class or precomputed execution plan.

Messages in memory have explicit variants for user text, assistant text, tool calls, and tool results. `src/conversations/message.mapper.ts` converts these variants to and from the existing database format. Tool results remain structured in memory and are serialized only at the storage/provider boundaries. Invalid stored tool metadata raises an error with the message ID instead of silently creating empty tool identifiers. No database migration is needed for this refactor.

The system can:
- respond directly
- call one tool
- call multiple tools sequentially
- combine results into a final response

## 📬 API Definition
POST `/ask`
Request:
```json
{
  "prompt": "string",
  "conversationId": "string (optional)"
}
```
Headers:
```
x-user-id: string
```

Response:
```json
{
  "content": "string",
  "conversationId": "string"
}
```
📬 API Examples
Direct answer
```json
{
  "prompt": "Explain agents in one sentence"
}
```
Single tool call
```json
{
  "prompt": "What is the status of order 123?"
}
```

Multi-tool execution (core feature)
```json
{
  "prompt": "What is the status and items of order 123?"
}
```
Expected behavior:
- system calls getOrderStatus
- system calls getOrderItems
- system returns a combined answer

**Multi-turn conversation**
First request:
```json
{
  "prompt": "What is the status of my order?"
}
```

Response:

```json
{
  "content": "Which order?",
  "conversationId": "abc-123"
}
```

Follow-up:

```json
{
  "prompt": "Order 123",
  "conversationId": "abc-123"
}
```
## 📦 Previous Prototype

This project builds on:

👉 https://github.com/artur-cesar/tool-caller-prototype

The previous system:
- supported tool calling
-  but only allowed:
  - 0 tool calls (direct answer)
  - 1 tool call per turn

Limitation:

```bash
User: "status AND items of order 123"
→ system could not execute both tools in the same turn
```

## 🚀 What This Prototype Solves

This version introduces a planner-based execution loop that enables:

- multiple tool calls in the same turn
- step-by-step reasoning
- result composition across tools

In short:

```bash
Before:
LLM → 0 or 1 tool → response

Now:
LLM → tool → LLM → tool → LLM → response
```
## 🧠 Why This Matters

This is the foundation for:
- planner-based agents
- autonomous workflows
- real-world LLM orchestration systems

The architecture is intentionally simple, explicit, and extensible.

## LLM integration reference

`LlmGateway` defines the provider contract. The Anthropic gateway and factory are the reference implementation for adding another provider. Tests use programmed responses or a mocked Anthropic client and do not call the external API.

## Conversation ownership

`x-user-id` is a simulated identity, not authentication. Conversations are retrieved by both `conversationId` and the trimmed user identifier. Reuse the same identifier on follow-up requests. An omitted or blank header uses `anonymous-user`. A missing conversation or one owned by another user returns 404 before reading or writing messages.

## Turn persistence and concurrency

Run `npm run migration:run` before starting the updated application. The new migration adds a generated message sequence used to reload conversation history in insertion order. Legacy rows are backfilled using the previous timestamp/UUID order; the original order of tied legacy timestamps cannot be recovered. Sequence gaps after rollback are expected.

The user prompt is saved before calling the LLM. All generated messages are saved together in a short database transaction after the turn finishes. If the LLM or batch persistence fails, the prompt remains, and generated messages are not partially stored. This does not undo tool execution or automatically retry the request. No database transaction remains open during LLM calls.

Overlapping requests for the same conversation return HTTP 409 before saving the second prompt. The guard is released after success or failure. This guard is local to the application process; running multiple instances requires shared coordination. Different conversations can run independently.

### PostgreSQL persistence tests

The persistence suite runs only when `TEST_DATABASE_URL` is set. Use a disposable, isolated PostgreSQL database: the suite applies and reverts migrations and inserts test data. Never point it at the application's database.

```bash
TEST_DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/TEST_DATABASE npm run test:e2e -- --runInBand
```

Without that variable, the persistence suite is skipped and the existing HTTP documentation tests still run.

## Live container logs

Docker Compose includes Dozzle at http://localhost:8080, bound to the local machine and filtered to containers in this Compose project. Start it separately with `docker compose up -d llm-planner-dozzle`. Select `llm-planner-application` to follow application logs in real time. See the [Dozzle setup guide](https://dozzle.dev/guide/getting-started).

## Tool registration and execution

`src/tools/tool-registry.ts` is the static catalog: each entry pairs a tool definition with its implementation. `AskService` sends definitions from this registry to the LLM, and `ToolExecutorService` resolves the requested name from the same registry. To add a tool, add its definition and handler to this list; no separate name list or dispatch switch is needed.

The executor validates the current string-only input schemas, dispatches calls, enforces the timeout, retries retryable failures, and returns structured results. `ToolExecutionFailure` lets an implementation classify an expected failure; unexpected exceptions are normalized without exposing their internal messages. Latency and failure simulations live in test doubles, not in the executor. The order repository still provides the study's in-memory order data.

All registered tools are read-only. `Promise.race` limits how long the executor waits; it does **not** cancel the underlying operation. A timed-out attempt can finish later, including while a retry is running. Do not reuse this retry policy for operations with side effects without first defining cancellation/idempotency behavior. The timeout test explicitly verifies that the underlying operation can continue after the timeout result.
