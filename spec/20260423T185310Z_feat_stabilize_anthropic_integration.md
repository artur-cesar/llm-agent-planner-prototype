# 20260423_feat_integrate_anthropic_provider

## Overview

This task introduces the first real LLM provider integration for the project by implementing Anthropic behind the existing LLM abstraction.

Right now, the application only uses a fake gateway that returns a mocked response. That is useful for early development, but it does not validate real provider behavior, request formatting, or production-like response handling.

This adjustment is needed to:
- make the LLM abstraction real
- validate end-to-end interaction with an actual provider
- prepare the project for later planner work on top of a real model
- keep the fake provider available for tests and controlled scenarios

This is a roadmap milestone task, not a cross-cutting stabilization task:
- it introduces a real capability that does not exist yet
- it advances the project from fake-only LLM behavior to real provider integration

---

## ✅ Task 1 — Implement Anthropic gateway

- [x] Install and configure the Anthropic SDK
- [x] Implement `AnthropicGateway` under `src/llm/anthorpic/anthropic.gateway.ts`
- [x] Read Anthropic API key from environment configuration
- [x] Read model name from environment configuration
- [x] Implement the gateway using the existing `llm-gateway.interface.ts`
- [x] Map internal request input into Anthropic request format
- [x] Return internal LLM response shape compatible with the current `AskService`

**Acceptance criteria:**
- `AnthropicGateway` compiles and implements the LLM interface correctly
- The gateway can call Anthropic successfully with valid credentials
- The returned data is converted into the internal response contract expected by the app

---

## ✅ Task 2 — Wire Anthropic into the LLM module

- [x] Update `llm.module.ts` to register Anthropic as a provider
- [x] Keep the fake gateway available for tests or controlled local usage
- [x] Define how the runtime chooses the active provider
- [x] Introduce or update provider selection constants/tokens in `llm.constants.ts`
- [x] Ensure `AskService` can use the selected provider without code changes

**Acceptance criteria:**
- Anthropic can be used as the active runtime provider
- Fake gateway remains available for tests
- `AskService` continues to depend only on the abstraction, not on a concrete provider

---

## ✅ Task 3 — Update Ask flow to use real LLM responses

- [x] Ensure `/ask` works with Anthropic as the active provider
- [x] Replace fake-only runtime behavior with real provider execution
- [x] Preserve the current response DTO contract
- [x] Validate that user input is passed through the real gateway and a real model response is returned

**Acceptance criteria:**
- Calling `POST /ask` with Anthropic configured returns a real LLM response
- HTTP contract remains unchanged
- No fake response string remains in runtime when Anthropic is enabled

---

## ✅ Task 4 — Add provider-specific tests

- [x] Add unit tests for `AnthropicGateway`
- [x] Mock Anthropic SDK interactions in tests
- [x] Cover successful text response mapping
- [x] Cover safe fallback behavior when Anthropic returns unexpected content
- [x] Keep existing fake gateway tests working
- [x] Ensure no real external API call is performed in automated tests

**Acceptance criteria:**
- Anthropic gateway behavior is covered by automated tests
- Tests do not depend on real Anthropic API access
- Fake gateway testability is preserved

---

## ✅ Task 5 — Validate local developer setup

- [ ] Add required Anthropic environment variables to local setup/docs as needed
- [ ] Ensure the application fails clearly if Anthropic is selected but credentials are missing
- [ ] Confirm local manual test flow for `/ask`

**Acceptance criteria:**
- Developer setup is clear enough to run Anthropic locally
- Missing credentials produce a clear and actionable failure
- Manual local test of `/ask` works with Anthropic enabled

---

## ✅ Final validation

- [ ] Run all relevant scripts
- [ ] Confirm the project remains stable
- [ ] Confirm Anthropic integration works end-to-end
- [ ] Confirm checklist is fully marked

**Acceptance criteria:**
- All relevant scripts pass
- Anthropic integration works through `/ask`
- No unrelated refactor or planner work was introduced

---

## 🧾 Commit Strategy

Each main task should result in one commit.

Suggested commits:

- feat(llm): implement anthropic gateway
- feat(llm): wire anthropic provider in llm module
- feat(ask): enable ask flow with anthropic provider
- test(llm): cover anthropic gateway behavior
- docs(llm): document anthropic local configuration

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
