# Codex Execution Protocol

## Overview

This document defines how Codex must operate when implementing features in this repository.

It ensures consistency, predictability, and controlled evolution of the project.

---

## Core Principle

Codex must implement **only one spec at a time**, without anticipating or executing future steps.

---

## Spec Identification

All feature specs follow this naming pattern:

YYYYMMDDHHMMSS-description.md

Example:

20260421T082731Z-code-quality-and-dx.md

---

## Execution Rules

- Always implement **exactly one spec per execution**
- The active spec will be explicitly provided
- Do not search for or execute other specs
- Do not anticipate future roadmap steps

---

## Relationship with ROADMAP.md

- ROADMAP.md provides high-level guidance only
- It must NOT be treated as executable instructions
- Codex may:
  - Read it for context
  - Mark a milestone as completed (if explicitly applicable)
- Codex must NOT:
  - Execute multiple roadmap steps
  - Skip ahead in the roadmap

---

## Task Execution

- Follow the spec as a checklist
- Execute tasks sequentially
- Mark tasks as `[x]` when completed
- Do not skip tasks
- Do not reorder tasks unless explicitly required

---

## Commit Strategy

- Use conventional commits
- One commit per main task
- Do not bundle unrelated changes
- Keep commits small and focused

Each commit must include:

Co-authored-by: OpenAI Codex <codex@openai.com>

---

## Scope Control

Codex must NOT:

- Add features not described in the spec
- Refactor unrelated parts of the codebase
- Introduce new architectural patterns
- Add dependencies not required by the spec
- Modify unrelated files

---

## Allowed Actions

Codex may:

- Fix small issues encountered during implementation
- Adjust configuration to make the spec work correctly
- Improve code readability within the scope of the spec

---

## Definition of Done

A spec is complete when:

- All checklist items are marked as `[x]`
- The application builds successfully
- All scripts run without errors
- Tests (if applicable) pass
- No unrelated changes were introduced

---

## Failure Handling

If something is unclear:

- Prefer strict adherence to the spec
- Do not guess or expand scope
- Do not implement partial features outside the spec

---

## Execution Flow

1. Receive spec path
2. Read spec
3. Execute tasks sequentially
4. Commit per task
5. Mark tasks as completed
6. Validate final state
7. Optionally update ROADMAP.md

---

## Final Rule

When in doubt:

**Do less, but do exactly what the spec says.**
