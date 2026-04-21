# Code Quality & Developer Experience Setup

## Overview
This task establishes linting, formatting, testing, and Git hooks to ensure code consistency and fast feedback during development.

---

## ✅ Task 1 — ESLint setup

- [x] Install ESLint and required dependencies
- [x] Configure ESLint for TypeScript
- [x] Ensure lint runs without errors
- [x] Add lint script to `package.json`

**Acceptance criteria:**
- `npm run lint` executes successfully
- No lint errors in the project

---

## ✅ Task 2 — Prettier setup

- [x] Install Prettier
- [x] Create Prettier config file
- [x] Integrate Prettier with ESLint
- [x] Add format script to `package.json`

**Acceptance criteria:**
- `npm run format` formats files correctly
- No conflicts between ESLint and Prettier

---

## ✅ Task 3 — Import/order consistency

- [x] Install `eslint-plugin-perfectionist`
- [x] Configure import/order rules
- [x] Apply rules to existing code

**Acceptance criteria:**
- Imports are consistently ordered
- Lint passes after applying rules

---

## ✅ Task 4 — Testing setup (Jest)

- [x] Ensure Jest is installed and configured
- [x] Add a basic sanity test
- [x] Verify tests run successfully

**Acceptance criteria:**
- `npm run test` passes
- At least one test exists and runs

---

## ✅ Task 5 — Husky (Git hooks)

- [ ] Install Husky
- [ ] Initialize Husky
- [ ] Add pre-commit hook:
  - run lint
  - run format
- [ ] Add pre-push hook:
  - run tests

**Acceptance criteria:**
- Hooks run automatically on commit and push
- Commit fails if lint fails
- Push fails if tests fail

---

## ✅ Task 6 — Package scripts cleanup

- [ ] Ensure scripts exist:
  - lint
  - lint:fix
  - format
  - test
- [ ] Ensure scripts are simple and consistent

**Acceptance criteria:**
- All scripts run without errors

---

## ✅ Task 7 — Final validation

- [ ] Run lint
- [ ] Run format
- [ ] Run tests
- [ ] Validate hooks manually

**Acceptance criteria:**
- All commands pass
- No regressions introduced

---

## 🧾 Commit Strategy

Each task should result in one commit:

- chore(lint): configure eslint with typescript support
- chore(format): configure prettier and integrate with eslint
- chore(lint): add import ordering with eslint-plugin-perfectionist
- chore(test): configure jest and add sanity test
- chore(husky): setup git hooks for lint and test
- chore(scripts): standardize npm scripts

Each commit must include:

Co-authored-by: OpenAI Codex <codex@openai.com>
