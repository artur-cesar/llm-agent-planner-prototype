# <Implementation Title>

## Overview

Describe:

- what is being adjusted
- why the adjustment is needed
- why this is not a roadmap milestone
- what stability or compatibility issue this task addresses

This is a Cross-Cutting Task and must not affect roadmap milestone progression.

---

## ✅ Task 1 — <Task title>

- [ ] <subtask 1>
- [ ] <subtask 2>
- [ ] <subtask 3>

**Acceptance criteria:**
- <expected outcome 1>
- <expected outcome 2>

---

## ✅ Task 2 — <Task title>

- [ ] <subtask 1>
- [ ] <subtask 2>
- [ ] <subtask 3>

**Acceptance criteria:**
- <expected outcome 1>
- <expected outcome 2>

---

## ✅ Task 3 — <Task title>

- [ ] <subtask 1>
- [ ] <subtask 2>
- [ ] <subtask 3>

**Acceptance criteria:**
- <expected outcome 1>
- <expected outcome 2>

---

## ✅ Final validation

- [ ] Run all relevant scripts
- [ ] Confirm the project remains stable
- [ ] Ensure no roadmap milestone was advanced
- [ ] Confirm checklist is fully marked

**Acceptance criteria:**
- All relevant scripts pass
- Stability is preserved
- No unrelated feature work was introduced

---

## 🧾 Commit Strategy

Each main task should result in one commit.

Suggested commits:

- <type(scope): message>
- <type(scope): message>
- <type(scope): message>

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
