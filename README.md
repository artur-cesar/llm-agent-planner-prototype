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
      -> Planner (LLM-driven)
          -> decides next action
      -> ToolExecutorService
          -> executes tools
      -> loop until final answer
```
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
