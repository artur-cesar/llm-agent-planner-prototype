# PostgreSQL, TypeORM and Docker Compose Foundation

## Overview

This repository is a NestJS-based backend prototype that evolves from a simple LLM tool-caller into a planner-based agent capable of multi-step reasoning and execution.

At this stage, the project needs a minimal but functional infrastructure layer to support persistence and enable real local execution.

This spec introduces:

- PostgreSQL integration using TypeORM
- A dedicated datasource for migrations
- Initial migration commands
- A Docker Compose setup to run both the application and database

The goal is to enable a **real, runnable environment**, allowing the application to connect to PostgreSQL and validate the database integration early.

This spec must remain focused and must not introduce:
- domain entities
- complex Docker networking
- healthchecks or retry strategies
- production-grade container hardening

---

## ✅ Task 1 — Add PostgreSQL and TypeORM dependencies

- [x] Add required dependencies for PostgreSQL + TypeORM
- [x] Ensure compatibility with current NestJS and TypeScript setup
- [x] Avoid unrelated persistence libraries

**Acceptance criteria:**
- PostgreSQL and TypeORM dependencies are installed
- No unnecessary libraries are introduced

---

## ✅ Task 2 — Configure TypeORM in NestJS

- [x] Integrate TypeORM into the NestJS application
- [x] Configure PostgreSQL connection using environment variables
- [x] Keep configuration minimal and extendable
- [x] Do not introduce domain entities yet

**Acceptance criteria:**
- Application is ready to connect to PostgreSQL
- Configuration is environment-driven
- No domain modeling introduced prematurely

---

## ✅ Task 3 — Create dedicated TypeORM datasource

- [x] Create a standalone datasource file for migrations
- [x] Ensure compatibility with PostgreSQL
- [x] Keep datasource reusable and explicit

**Acceptance criteria:**
- Datasource exists and is valid for migration usage
- Configuration is clean and separated from app concerns

---

## ✅ Task 4 — Add migration commands

- [x] Add migration-related scripts to `package.json`
- [x] Ensure scripts reference the correct datasource
- [x] Keep command names clear and minimal

**Acceptance criteria:**
- Migration commands are available via `package.json`
- Commands are correctly wired to the datasource

---

## ✅ Task 5 — Add environment configuration

- [x] Define required PostgreSQL environment variables
- [x] Ensure `.env` is the source of truth
- [x] Keep environment surface minimal

**Acceptance criteria:**
- Database configuration is environment-driven
- `.env` is used consistently

---

## ✅ Task 6 — Create Docker Compose setup

- [ ] Create `compose.yml`
- [ ] Define service `llm-planner-database`:
  - use PostgreSQL image
  - define `container_name`
  - define named volume for data persistence
- [ ] Define service `llm-planner-application`:
  - build from local Dockerfile or use node base image
  - define `container_name`
  - mount project directory
  - mount named volume for `node_modules`
- [ ] Use `.env` as the main environment source
- [ ] Define `environment` section only for:
  - hostnames
  - ports
  - internal connectivity (even if duplicated from `.env`)
- [ ] mount network and use it in both services
- [ ] Ensure services can communicate via service name

**Acceptance criteria:**
- `compose.yml` exists with two services:
  - `llm-planner-application`
  - `llm-planner-database`
- PostgreSQL uses a named volume
- Node uses a named volume for `node_modules`
- `.env` is used as the primary config source
- Containers can resolve each other via service names
- The services uses de same named network

---

## ✅ Task 7 — Validate application ↔ database connection

- [ ] Start services using Docker Compose
- [ ] Ensure application boots successfully
- [ ] Ensure TypeORM connects to PostgreSQL
- [ ] Fix only issues directly related to connection

**Acceptance criteria:**
- Application starts without crashing
- Database connection is successfully established
- No unrelated fixes or refactors introduced

---

## ✅ Final validation

- [ ] Run all relevant scripts
- [ ] Confirm project builds successfully
- [ ] Confirm containers start correctly
- [ ] Ensure checklist is fully marked

**Acceptance criteria:**
- Application builds successfully
- Docker Compose runs both services
- Database connection works
- No unrelated changes introduced

---

## 🧾 Commit Strategy

Each main task should result in one commit.

Suggested commits:

- chore(db): add postgres and typeorm dependencies
- feat(db): configure typeorm integration
- chore(migrations): add typeorm datasource
- chore(scripts): add migration commands
- chore(env): add postgres environment variables
- feat(docker): add docker compose with app and database
- fix(db): ensure application connects to postgres

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
