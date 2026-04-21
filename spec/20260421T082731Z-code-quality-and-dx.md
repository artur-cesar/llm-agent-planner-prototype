# Node.js 22.22.2 & npm 10.9.7 Migration

## Overview

This task upgrades the project runtime from Node.js `22.11.0` to `22.22.2`, and npm from `10.9.0` to `10.9.7` (if npm is explicitly pinned).

The goal is to remove compatibility friction with modern tooling while preserving strict reproducibility (`engine-strict=true`) and keeping changes minimal.

---

## ✅ Task 1 — Update Node.js version pin

- [ ] Update `.nvmrc` to `22.22.2`
- [ ] Update `package.json` → `engines.node` to `22.22.2`
- [ ] Search for any references to `22.11.0` in the repository
- [ ] Update all relevant references to `22.22.2`

**Acceptance criteria:**
- All Node version references point to `22.22.2`
- No remaining references to `22.11.0` where migration is required

---

## ✅ Task 2 — Update npm version pin (if applicable)

- [ ] Check if `package.json` includes `engines.npm`
- [ ] If present, update from `10.9.0` to `10.9.7`
- [ ] Check for `packageManager` field in `package.json`
- [ ] If it references an older npm version, update it only if necessary

**Acceptance criteria:**
- npm is updated to `10.9.7` if it was previously pinned
- No unnecessary npm pinning introduced

---

## ✅ Task 3 — Clean install with new runtime

- [ ] Remove `node_modules`
- [ ] Remove lockfile if required (`package-lock.json`)
- [ ] Reinstall dependencies using Node `22.22.2`
- [ ] Ensure installation works with `engine-strict=true`

**Acceptance criteria:**
- `npm install` runs successfully
- No engine mismatch errors
- Lockfile is consistent with the new runtime

---

## ✅ Task 4 — Fix dependency compatibility issues

- [ ] Run:
  - `npm run lint`
  - `npm run test`
  - `npm run format`
- [ ] Identify any failures caused by the Node/npm upgrade
- [ ] Fix issues with minimal changes:
  - update only necessary dependencies
  - remove artificial pins introduced for Node `22.11.0`
- [ ] Avoid broad or unnecessary dependency upgrades

**Acceptance criteria:**
- All scripts pass without errors
- No unnecessary dependency churn
- Tooling works correctly under Node `22.22.2`

---

## ✅ Task 5 — Validate tooling compatibility

- [ ] Verify ESLint works correctly
- [ ] Verify Jest works correctly
- [ ] Verify Husky hooks still execute correctly
- [ ] Verify TypeScript compiles without issues

**Acceptance criteria:**
- All tooling behaves as expected
- No runtime or config regressions

---

## ✅ Task 6 — Update documentation

- [ ] Update `README.md`:
  - Node version → `22.22.2`
  - npm version → `10.9.7` (if relevant)
- [ ] Ensure setup instructions reflect the new runtime

**Acceptance criteria:**
- README reflects the correct versions
- Instructions are accurate and minimal

---

## ✅ Task 7 — Final validation

- [ ] Run:
  - `npm install`
  - `npm run start:dev`
  - `npm run lint`
  - `npm run test`
- [ ] Validate project boots and runs correctly
- [ ] Ensure no regressions were introduced

**Acceptance criteria:**
- Project runs successfully under Node `22.22.2`
- All scripts pass
- No unexpected behavior changes

---

## 🧾 Commit Strategy

Each task should result in one commit:

- chore(node): upgrade node version to 22.22.2
- chore(npm): upgrade npm version to 10.9.7 (if pinned)
- chore(deps): reinstall dependencies under node 22.22.2
- chore(deps): fix compatibility issues after node upgrade
- chore(tooling): validate tooling under new runtime
- docs(readme): update node and npm versions

Each commit must include:

Co-authored-by: Codex <open-api.com.br>
