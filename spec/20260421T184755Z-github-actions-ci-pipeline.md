# GitHub Actions CI Pipeline

## Overview

This repository is a NestJS-based backend prototype that evolves from a simple LLM tool-caller into a planner-based agent capable of multi-step reasoning and execution.

At this stage, the project already has foundational application structure and local developer tooling, but it still lacks a basic continuous integration pipeline to validate repository health on every relevant change.

This task introduces a minimal GitHub Actions CI workflow focused on code health and safety checks, without advancing any future roadmap milestone beyond the CI pipeline itself.

The goal is to establish a stable and reproducible baseline for pull requests and branch protection, using the runtime versions already pinned by the project:

- Node.js `22.22.2`
- npm `10.9.7`

This task is part of roadmap milestone progression for CI pipeline and must remain strictly limited to CI setup and validation.

---

## ✅ Task 1 — Create GitHub Actions workflow

- [x] Create a workflow file under `.github/workflows/`
- [x] Name the workflow clearly for future branch protection stability
- [x] Configure workflow triggers for:
  - `pull_request`
  - `push` on long-lived branches (at least `main`, and `dev` if it already exists)
- [x] Ensure the workflow is minimal and focused on CI validation only

**Acceptance criteria:**
- A GitHub Actions workflow file exists in `.github/workflows/`
- The workflow runs on pull requests
- The workflow name is stable and appropriate for future branch protection usage

---

## ✅ Task 2 — Configure pinned runtime setup

- [ ] Configure Node.js setup using version `22.22.2`
- [ ] Ensure npm version `10.9.7` is used explicitly when necessary
- [ ] If using a matrix, pin the exact Node.js version instead of broad aliases such as `22.x`
- [ ] Avoid loose runtime versioning in the workflow
- [ ] Enable dependency caching compatible with npm usage

**Acceptance criteria:**
- CI uses Node.js `22.22.2`
- CI does not rely on floating Node.js versions
- npm runtime remains aligned with the project expectations

---

## ✅ Task 3 — Install dependencies reproducibly

- [ ] Use `npm ci` instead of `npm install`
- [ ] Ensure dependency installation respects the lockfile
- [ ] Verify the install step is suitable for CI reproducibility
- [ ] Keep install logic simple and deterministic

**Acceptance criteria:**
- Dependencies are installed using `npm ci`
- CI installation is deterministic and compatible with the current lockfile
- No unnecessary installation logic is introduced

---

## ✅ Task 4 — Add core health checks

- [ ] Run formatting validation using the existing formatting script in check mode if applicable
- [ ] Run lint validation using the existing lint script
- [ ] Run automated tests using the existing test script
- [ ] Run e2e tests only if they are already stable and executable in CI without adding new infrastructure
- [ ] Run application build using the existing build script
- [ ] Reuse `package.json` scripts instead of duplicating raw commands when possible

**Acceptance criteria:**
- CI validates formatting, linting, tests, and build as supported by the current project state
- The workflow fails when any core health check fails
- No speculative infrastructure is added just to force e2e execution

---

## ✅ Task 5 — Keep workflow aligned with current roadmap stage

- [ ] Do not add database services to CI
- [ ] Do not add Docker Compose execution in this spec
- [ ] Do not add deploy, release, or publish steps
- [ ] Do not introduce coverage gates unless already required by the repository
- [ ] Keep the pipeline compatible with the current maturity of the project

**Acceptance criteria:**
- CI remains limited to repository health validation
- No unrelated infrastructure or delivery concerns are introduced
- The implementation stays aligned with the current roadmap milestone

---

## ✅ Task 6 — Validate CI readiness locally

- [ ] Run all scripts referenced by the workflow locally when possible
- [ ] Confirm the workflow maps to real project commands
- [ ] Adjust workflow only as needed to match the existing repository scripts
- [ ] Ensure no unrelated files are modified beyond CI-related scope

**Acceptance criteria:**
- Workflow steps correspond to actual project commands
- The CI definition is realistic for repository execution
- No unrelated feature work is introduced

---

## ✅ Final validation

- [ ] Run all relevant scripts
- [ ] Confirm the project remains stable
- [ ] Confirm the CI workflow is correctly added
- [ ] Ensure checklist is fully marked

**Acceptance criteria:**
- All relevant scripts pass
- CI workflow is present and coherent
- Stability is preserved
- No unrelated feature work was introduced

---

## 🧾 Commit Strategy

Each main task should result in one commit.

Suggested commits:

- ci(gha): create github actions workflow
- ci(runtime): pin node 22.22.2 and npm 10.9.7 in workflow
- ci(checks): add install, lint, test, format, and build validation
- ci(scope): keep pipeline aligned with current roadmap stage

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
