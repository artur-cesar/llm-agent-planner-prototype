# LLM Order Planner Prototype — Master Roadmap

## Overview

This repository is part of a series of structured experiments exploring LLM-based application architectures.

The goal is to evolve from a simple tool-calling system into a planner-based agent capable of multi-step reasoning and execution.

This document acts as a **product-level roadmap**, guiding implementation across multiple feature specs.

---

## 🎯 High-Level Goal

Build a NestJS-based backend that:

- Supports multi-turn conversations
- Integrates with LLM providers (starting with Anthropic)
- Evolves from simple response generation to planner-based decision making
- Demonstrates real-world agent execution patterns
- Is production-structured (CI, linting, testing, observability, API docs)

---

## 🗺️ Milestones

### ✅ 1. Project Foundation

- [x] NestJS bootstrap
- [x] Node version pinning
- [x] Environment configuration
- [x] Code quality setup (ESLint, Prettier, Husky, Jest)
- [x] CI pipeline

---

### 🧱 2. Infrastructure & Persistence

- [x] Docker Compose setup
- [x] PostgreSQL integration
- [x] TypeORM configuration
- [x] Database connection validation

---

### 💬 3. Conversation System

- [x] Conversation entity
- [x] Message entity
- [x] Persistence of multi-turn conversations
- [x] Message role support (user, assistant, tool)

---

### 🧠 4. LLM Abstraction Layer

- [x] Define `LlmGateway` interface
- [x] Implement Fake LLM
- [x] Integrate LLM into `/ask` flow

---

### 🌐 5. Real LLM Integration (Anthropic)

- [ ] Implement Anthropic provider
- [ ] Replace or extend Fake LLM usage
- [ ] Validate real responses

---

### 🔁 6. Ask Endpoint (Core Flow)

- [ ] Implement POST `/ask`
- [ ] Persist user message
- [ ] Generate assistant response
- [ ] Persist assistant message
- [ ] Support conversationId for multi-turn

---

### 🛠️ 7. Tooling Layer

- [ ] Implement tool definitions
- [ ] Implement tool executor
- [ ] Add:
  - getOrderStatus
  - getOrderItems

---

### 🧩 8. Planner Introduction (Core Differentiator)

- [ ] Introduce planner abstraction
- [ ] Allow decision between:
  - direct answer
  - single tool call
  - multiple tool calls

---

### 🔄 9. Planner Execution Loop

- [ ] Implement execution loop:
  - LLM decides action
  - tool executes
  - result feeds next step
- [ ] Support multi-step reasoning

---

### 📊 10. Observability

- [ ] Add structured logs
- [ ] Log planner decisions
- [ ] Log tool calls and responses

---

### 📚 11. API Documentation

- [ ] Integrate OpenAPI
- [ ] Add Swagger UI
- [ ] Document `/ask`

---

## 📌 Execution Rules

- Each milestone must be implemented through a dedicated **feature spec**
- Feature specs must:
  - follow structured template
  - include checklist tasks
  - define clear commit boundaries

---

## 🔁 Workflow

1. Pick next incomplete milestone
2. Create feature spec
3. Execute via Codex
4. Mark milestone as complete
5. Move to next

---

## 🚫 Non-goals

- Do not overengineer abstractions prematurely
- Do not introduce dynamic plugin systems
- Do not optimize before planner is working
- Do not skip milestones

---

## 🧠 Key Learning Focus

- LLM tool calling vs planner-based execution
- Prompt influence vs system architecture
- Multi-turn conversation persistence
- Controlled agent execution loops
- Trade-offs between simplicity and flexibility

---

## 📦 Relationship with Tool Caller Prototype

This project builds upon lessons learned from the previous repository:

- Tool-caller handled single tool per turn
- This project introduces planning and orchestration
- Demonstrates limitations of naive tool-calling approaches

---

## ✅ Definition of Success

- The system can handle:
  - multi-turn conversations
  - multi-step reasoning
  - multiple tool calls in sequence
- The architecture is clean, testable, and extensible
- The repository serves as a strong technical reference for interviews and discussions

---

## 🔧 Cross-Cutting Tasks (Non-Milestone Work)

These tasks are not tied to a specific milestone but are required to maintain project stability, tooling compatibility, and developer experience.

They may be executed at any point in the roadmap when needed.

Examples include:

- Runtime upgrades (Node.js, npm)
- Dependency compatibility fixes
- Tooling adjustments (ESLint, Jest, Husky)
- Security patches
- Lockfile or environment corrections

### Rules for Cross-Cutting Tasks:

- Must be implemented via a dedicated feature spec
- Must NOT mark any roadmap milestone as completed
- Must NOT trigger execution of other roadmap steps
- Must NOT introduce new product features
- Must focus strictly on stability or compatibility

These tasks exist outside the linear roadmap progression and should be treated as isolated improvements.
