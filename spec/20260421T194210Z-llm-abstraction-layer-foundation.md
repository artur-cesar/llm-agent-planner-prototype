# LLM Abstraction Layer Foundation

## Overview

This repository is a NestJS-based backend prototype that evolves from a simple LLM tool-caller into a planner-based agent capable of multi-step reasoning and execution.

At this stage, the project needs an explicit LLM abstraction layer so the application can depend on a stable internal contract instead of provider-specific implementations.

This spec introduces the initial LLM foundation by defining a gateway interface, adding a fake implementation for controlled development and testing, and integrating that abstraction into the existing `POST /ask` flow.

The goal is to introduce:

- a provider-agnostic `LlmGateway` contract
- a `FakeLlmGateway` implementation
- internal wiring for LLM-based answer generation in `/ask`

This spec must remain focused and must not introduce:

- real provider integration yet
- Anthropic-specific implementation yet
- planner logic
- tool execution orchestration
- provider selection strategies beyond what is strictly needed for this stage
- prompt architecture expansion beyond what is necessary to support the fake gateway

The `llm` layer introduced by this spec is responsible only for the application-facing abstraction and its initial fake implementation. It must not become a generic container for planner, prompt orchestration, or tool execution concerns.

---

## ✅ Task 1 — Define LlmGateway contract

- [x] Create an internal `LlmGateway` interface
- [x] Define the minimal method contract required by the current `/ask` flow
- [x] Keep the contract provider-agnostic
- [x] Add supporting request/response types only if necessary
- [x] Keep the abstraction narrow and aligned with the current roadmap stage

**Acceptance criteria:**
- `LlmGateway` exists as an internal application contract
- The contract is minimal and provider-agnostic
- The abstraction is suitable for future Anthropic integration without premature complexity

---

## ✅ Task 2 — Implement FakeLlmGateway

- [x] Create a `FakeLlmGateway` implementation under the `llm` module
- [x] Make the fake implementation deterministic and simple
- [x] Ensure the fake gateway satisfies the `LlmGateway` contract
- [x] Keep behavior appropriate for local development and controlled testing
- [x] Avoid encoding future planner behavior into the fake gateway

**Acceptance criteria:**
- `FakeLlmGateway` exists and implements `LlmGateway`
- Fake behavior is deterministic enough for local validation
- No provider-specific behavior leaks into the abstraction

---

## ✅ Task 3 — Add LLM module wiring

- [x] Create or update the `llm` module structure as needed
- [x] Register the `LlmGateway` binding using `FakeLlmGateway`
- [x] Ensure the application can inject the abstraction instead of a concrete implementation
- [x] Keep dependency wiring clear and minimal

**Acceptance criteria:**
- The application can resolve `LlmGateway` through NestJS dependency injection
- `FakeLlmGateway` is the active implementation for this stage
- Wiring is ready for future provider replacement or extension

---

## ✅ Task 4 — Integrate LLM abstraction into /ask flow

- [ ] Update the current `/ask` flow to depend on `LlmGateway`
- [ ] Ensure assistant response generation goes through the abstraction
- [ ] Keep integration minimal and aligned with the current endpoint behavior
- [ ] Do not introduce planner or tool loop behavior in this spec

**Acceptance criteria:**
- `/ask` uses `LlmGateway` for response generation
- The endpoint remains functional
- No unrelated orchestration changes are introduced

---

## ✅ Task 5 — Keep module boundaries explicit

- [ ] Keep the `llm` folder focused on gateway/provider concerns only
- [ ] Avoid moving planner, tool, or turn orchestration responsibilities into the `llm` layer
- [ ] Add helper files or types only when directly required by the gateway abstraction
- [ ] Keep naming and structure clear for future Anthropic implementation

**Acceptance criteria:**
- `llm` remains scoped to abstraction and provider implementation concerns
- No unrelated AI/application flow responsibilities are introduced in this layer
- Folder structure is clear and ready for future provider expansion

---

## ✅ Task 6 — Validate LLM integration baseline

- [ ] Run all relevant scripts affected by the change
- [ ] Validate that the application still builds successfully
- [ ] Validate that `/ask` works with the fake gateway
- [ ] Fix only issues directly caused by this spec

**Acceptance criteria:**
- Application builds successfully
- Lint passes
- `/ask` works with the fake implementation
- No unrelated regressions are introduced

---

## ✅ Final validation

- [ ] Run all relevant scripts
- [ ] Confirm the project remains stable
- [ ] Confirm the LLM abstraction layer is in place
- [ ] Ensure checklist is fully marked

**Acceptance criteria:**
- All relevant scripts pass
- LLM abstraction layer is correctly introduced
- Stability is preserved
- No unrelated feature work was introduced

---

## 🧾 Commit Strategy

Each main task should result in one commit.

Suggested commits:

- feat(llm): define llm gateway contract
- feat(llm): add fake llm gateway implementation
- feat(llm): wire llm module with fake gateway
- feat(ask): integrate llm gateway into ask flow
- chore(llm): keep llm module boundaries explicit

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
- CI passes
