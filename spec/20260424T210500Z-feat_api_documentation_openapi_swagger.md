# Feat API documentation with OpenAPI and Swagger

## Overview

This feature introduces API documentation for the project using OpenAPI and Swagger UI.

The project currently exposes a working `/ask` endpoint that supports:
- multi-turn conversations
- tool calling
- planner-based execution
- conversation persistence via `conversationId`
- simulated authentication via `x-user-id`

However, there is no formal API documentation, which makes it harder to:
- explore the API
- understand request/response contracts
- test endpoints interactively
- present the project in interviews or discussions

This feature adds:
- OpenAPI integration
- Swagger UI
- documentation for the `/ask` endpoint

The goal is to provide a clear, interactive, and accurate representation of the API without introducing unnecessary complexity.

---

## ✅ Task 1 — Integrate OpenAPI

- [x] Install required Swagger/OpenAPI dependencies
- [x] Configure Swagger module in `main.ts`
- [x] Define API metadata:
  - title
  - description
  - version
- [x] Ensure application boots correctly with Swagger enabled

**Acceptance criteria:**
- OpenAPI document is generated successfully
- Swagger configuration is centralized and minimal
- Application starts without errors

---

## ✅ Task 2 — Add Swagger UI

- [x] Expose Swagger UI endpoint (e.g. `/docs`)
- [x] Ensure UI loads correctly in the browser
- [x] Ensure all registered controllers appear in the UI

**Acceptance criteria:**
- Swagger UI is accessible via browser
- UI lists available endpoints
- UI reflects current API structure

---

## ✅ Task 3 — Document `/ask` endpoint

- [x] Add Swagger decorators to `AskController`
- [x] Document request DTO:
  - `prompt`
  - `conversationId` (optional)
- [x] Document response DTO:
  - `content`
  - `conversationId`
- [x] Add endpoint description explaining:
  - multi-turn behavior
  - tool-calling capability
- [x] Document `x-user-id` header

**Acceptance criteria:**
- `/ask` endpoint is fully documented
- Request and response schemas are visible in Swagger UI
- Header requirements are visible
- Endpoint description explains behavior clearly

---

## ✅ Task 4 — Improve DTO documentation

- [x] Add Swagger decorators to DTO fields
- [x] Provide example values for:
  - prompt
  - conversationId
- [x] Provide example responses

**Acceptance criteria:**
- Swagger UI shows meaningful examples
- DTOs are self-explanatory
- API is usable without reading source code

---

## ✅ Task 5 — Validate documentation accuracy

- [ ] Test `/ask` endpoint via Swagger UI
- [x] Validate:
  - new conversation flow
  - existing conversation flow
  - multi-tool execution flow
- [x] Ensure examples match real responses

**Acceptance criteria:**
- Swagger UI can be used to execute real requests
- Documentation matches actual behavior
- No mismatch between DTOs and runtime responses

---

## ✅ Final validation

- [ ] Run all relevant scripts
- [x] Confirm Swagger UI loads correctly
- [x] Confirm `/ask` documentation is complete
- [x] Confirm no regression in API behavior
- [ ] Confirm checklist is fully marked

**Acceptance criteria:**
- API documentation is accessible and accurate
- `/ask` is fully documented
- Project remains stable

## Validation notes

- `npm run lint`: passed
- `npm test -- --runInBand`: passed
- `npm run test:e2e -- --runInBand`: passed
- `npm run build`: blocked by filesystem permissions in `dist/` (`EACCES: permission denied, rmdir '/home/tutticesar/Code/llm-agent-planner-prototype/dist/api-documentation'`)

`Test /ask endpoint via Swagger UI` remains unchecked because the current validation path verifies generated OpenAPI output and registered Swagger routes in automated tests, but does not execute interactive browser requests in this environment.

---

## 🧾 Commit Strategy

Each main task should result in one commit.

Suggested commits:

- feat(api): integrate openapi and swagger
- feat(api): expose swagger ui endpoint
- feat(api): document ask endpoint
- feat(api): improve dto documentation
- test(api): validate swagger usage and examples

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
