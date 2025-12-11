# /qa — Quality Assurance Check

Validate consolidated commits sequentially, enabling failsafe recovery on failure.

## Usage

```
/qa [--build-only] [--semantic-only] [--continue-on-fail]
```

## Behavior

Run QA checks on consolidated commits **in sequence**, stopping at first failure to enable failsafe recovery.

1. Walk through each consolidated commit in order
2. For each commit: checkout, build, test, verify semantics
3. On pass: mark as verified, continue to next
4. On fail: stop, report failure, trigger failsafe (if in consolidation flow)

## Sequential Checking

QA runs commits **one at a time in order**:

```
[A] → checkout → build → test → semantic check → ✓ VERIFIED
                                                    │
                                                    ▼
[B] → checkout → build → test → semantic check → ✓ VERIFIED
                                                    │
                                                    ▼
[C] → checkout → build → ✗ FAIL
                           │
                           ▼
                    STOP HERE
                    Report: A, B verified
                    Trigger failsafe for C, D, E
```

**Why sequential?**
- Earlier commits are dependencies for later ones
- Stopping early preserves known-good state
- Enables partial success and failsafe recovery

## Checks Performed

### Build Check

```bash
git stash
git checkout <commit-sha>
<build-command>  # auto-detected or configured
BUILD_RESULT=$?
git checkout -
git stash pop
```

**Build command detection:**
1. `package.json` → `npm run build`
2. `Cargo.toml` → `cargo build`
3. `Makefile` → `make`
4. `pyproject.toml` → `python -m build`
5. `.ai-git/config.json` → custom command
6. Fallback: ask user

### Test Check

Same process, but with test command:
- `npm test`
- `cargo test`
- `pytest`
- etc.

**Note:** Tests are optional. Some commits may not have tests yet. Focus on regressions, not coverage.

### Semantic Check (via qa-agent)

For each commit, verify:

1. **Message accuracy:** Does the commit message match the diff?
2. **Scope appropriateness:** Is this one logical change?
3. **Size bounds:** Not too large (>500 lines suspicious), not too small

## Output Format

### All Passing

```
## QA Report

**Commits:** 4
**Status:** ✓ All passing

| Commit | Build | Tests | Semantic |
|--------|-------|-------|----------|
| [A] feat(auth): add JWT middleware | ✓ | ✓ | ✓ |
| [B] test(auth): add test suite | ✓ | ✓ | ✓ |
| [C] feat(api): add protected routes | ✓ | ✓ | ✓ |
| [D] docs: update API docs | ✓ | ✓ | ✓ |

Ready to push.
```

### Failure Detected

```
## QA Report

**Commits:** 4 planned, 2 verified
**Status:** ⚠ Failure at commit 3

### Verified ✓

| Commit | Build | Tests | Semantic |
|--------|-------|-------|----------|
| [A] feat(auth): add JWT middleware | ✓ | ✓ | ✓ |
| [B] test(auth): add test suite | ✓ | ✓ | ✓ |

### Failed ✗

| Commit | Build | Tests | Semantic |
|--------|-------|-------|----------|
| [C] feat(api): add protected routes | ✗ | ⊘ | - |

**Error:**
```
Cannot find module '../middleware/auth'
at Object.<anonymous> (src/routes/user.ts:3:1)
```

### Not Tested

| Commit |
|--------|
| [D] docs: update API docs |

---

**Failsafe activated:** Attempting to reconsolidate remaining 
micro-commits into fewer commits...
```

---

## Failsafe Integration

When QA fails during `/consolidate`, it triggers the failsafe:

```
/consolidate runs:
  1. Consolidate 30 micros → 5 commits [A,B,C,D,E]
  2. QA runs sequentially
  3. A passes, B passes, C FAILS
  4. Failsafe activates:
     - Lock in A, B (verified)
     - Reconsolidate remaining micros → 2 commits [C',D']
  5. QA runs on C', D'
  6. If pass: done (4 commits)
     If fail: retry with 1 commit, or preserve micros
```

QA must report:
- Which commits passed (these are safe to keep)
- Where failure occurred
- What the error was (for reconsolidation hints)

## Reconsolidation Hints

When QA fails, provide hints to the consolidation agent:

```json
{
  "failed_commit": "C",
  "error_type": "missing_import",
  "error_detail": "Cannot find module '../middleware/auth'",
  "likely_cause": "Dependency in earlier commit not available",
  "suggestion": "Include auth middleware in same commit, or reorder"
}
```

The consolidation agent uses these hints when regrouping:
- Missing import → group with the file that exports it
- Type error → group with type definitions
- Test failure → check if test depends on later code

---

## Flags

| Flag | Description |
|------|-------------|
| `--build-only` | Skip test and semantic checks |
| `--semantic-only` | Skip build and test checks |
| `--continue-on-fail` | Don't stop at first failure, check all commits |

**Note:** `--continue-on-fail` disables failsafe (can't do partial recovery if we don't stop early).

---

## Standalone Usage

QA can be run independently of consolidation:

```
/qa                    # Check current consolidated commits
/qa --build-only       # Quick build verification
/qa --semantic-only    # Just check commit message quality
```

When run standalone (not from `/consolidate`), failures are reported but failsafe is not triggered—user must decide next steps.

---

## Configuration

In `.ai-git/config.json`:

```json
{
  "qa": {
    "build_command": "npm run build",
    "test_command": "npm test",
    "skip_tests": false,
    "semantic_check": true,
    "max_commit_lines": 500
  }
}
```

---

## Edge Cases

### No Build System

If no build command detected:
- Warn user
- Skip build check
- Rely on semantic check only
- Suggest configuring build command

### Tests Don't Exist Yet

If test command fails with "no tests found":
- Treat as pass (not a regression)
- Note in report: "No tests configured"

### Flaky Tests

If tests fail intermittently:
- Retry once before failing
- Report if flaky detected
- Suggest investigating test stability

### Long Build Times

If builds are slow (>60s):
- Warn user before starting
- Show progress
- Offer `--build-only` for faster iteration
