# Conversation Persistence Foundation

## Overview

This repository is a NestJS-based backend prototype that evolves from a simple LLM tool-caller into a planner-based agent capable of multi-step reasoning and execution.

At this stage, the project needs the persistence foundation required to support future multi-turn conversations in the existing `POST /ask` flow.

This spec introduces the internal conversation persistence model only. It must establish the database structures and supporting application services needed for future multi-turn behavior, while keeping scope intentionally narrow.

The goal is to introduce:

- `Conversation` persistence
- `Message` persistence
- explicit message role support
- extensibility for future execution metadata
- internal service and helper support for future multi-turn usage

This spec must remain focused and must not introduce:

- new REST endpoints for conversations or messages
- new controllers
- CRUD APIs for conversation management
- planner logic
- tool execution orchestration
- modeling of planner steps or tool execution structures
- integration into the `/ask` flow yet

The conversation system introduced by this spec is an internal persistence foundation for future multi-turn support in the existing `/ask` endpoint.

---

## ✅ Task 1 — Create Conversation entity

- [x] Create a `Conversation` entity
- [x] Use a UUID primary key
- [x] Add `userId` field (string or UUID, based on current project context)
- [x] Add `systemPrompt` field (nullable)
- [x] Add timestamp fields (createdAt, updatedAt)
- [x] Keep structure minimal and extensible

**Acceptance criteria:**
- Conversation entity exists
- It is valid for TypeORM persistence
- Structure supports future multi-turn and prompt tracking

---

## ✅ Task 2 — Create Message entity

- [x] Create a `Message` entity
- [x] Use a UUID primary key
- [x] Add `content` field (text)
- [x] Add `role` field
- [x] Add `metadata` field (JSON, nullable)
- [x] Add `createdAt` timestamp
- [x] Associate message with a conversation (many-to-one)
- [x] Ensure proper foreign key setup

**Acceptance criteria:**
- Message entity exists
- Relationship with Conversation is correctly defined
- Message structure supports future extensibility via metadata
- No direct coupling to tool execution structures

---

## ✅ Task 3 — Add explicit message role support

- [x] Define supported roles:
  - `user`
  - `assistant`
  - `tool`
- [x] Implement roles using enum or equivalent explicit type
- [x] Ensure role is persisted consistently

**Acceptance criteria:**
- Message roles are explicit and constrained
- Invalid roles are not accepted
- Model supports future tool-related messages without schema changes

---

## ✅ Task 4 — Create migrations for conversation persistence

- [x] Add migration for `Conversation`
- [x] Add migration for `Message`
- [x] Ensure relationship between both tables is correctly represented
- [x] Keep migration scope limited to this spec

**Acceptance criteria:**
- Migration files exist and are valid
- Database schema matches entity definitions
- No unrelated schema changes introduced

---

## ✅ Task 5 — Add internal service and helper support

- [x] Create internal services to support conversation persistence
- [x] Add helper files or types as needed (e.g. message role typing)
- [x] Use TypeORM standard repository injection (no custom repositories)
- [x] Keep services focused on persistence only

**Acceptance criteria:**
- Services support future multi-turn operations
- No unnecessary abstractions introduced
- Code remains minimal and clear

---

## ✅ Task 6 — Register persistence structures in the application

- [x] Register entities in TypeORM configuration
- [x] Ensure compatibility with datasource and migrations
- [x] Verify application recognizes new persistence structures
- [x] Do not integrate with `/ask` in this spec

**Acceptance criteria:**
- Entities are correctly registered
- Migrations are properly wired
- No changes to API behavior

---

## ✅ Task 7 — Validate persistence foundation

- [ ] Run relevant scripts (build, lint, etc.)
- [ ] Validate project builds successfully
- [ ] Validate migration wiring
- [ ] Fix only issues caused by this spec

**Acceptance criteria:**
- Application builds successfully
- Lint passes
- Migration setup is valid
- No unrelated regressions introduced

---

## ✅ Final validation

- [ ] Run all relevant scripts
- [ ] Confirm project stability
- [ ] Confirm persistence foundation is in place
- [ ] Ensure checklist is fully marked

**Acceptance criteria:**
- All scripts pass
- Persistence foundation is correctly introduced
- No unrelated changes introduced

---

## 🧾 Commit Strategy

Each main task should result in one commit.

Suggested commits:

- feat(conversation): add conversation entity with user and system prompt
- feat(message): add message entity with role and metadata support
- feat(message): implement message role enum
- chore(migrations): add conversation and message migrations
- feat(conversation): add internal persistence services
- chore(typeorm): register conversation entities

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
- CI passes
