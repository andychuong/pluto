# /pluto-list - Session Summary

Display a comprehensive summary of the current Pluto session including work-in-progress status, consolidation estimate, and commit history.

## Usage
```
/pluto-list
```

## What It Does

Provides a complete overview of the current session:
1. Session metadata (ID, start time, base commit)
2. Work-in-progress statistics
3. Consolidation estimate
4. Micro-commit summary
5. Files changed summary
6. Recent activity from session log

## Output Format

```
=== Pluto Session Summary ===

Session: ses_7x9k2m
Started: 2024-01-15 10:30:00 UTC (2h 15m ago)
Base: abc123d

---

WORK IN PROGRESS

| Metric        | Count |
|--------------|-------|
| Micro-commits | 23    |
| Files touched | 12    |
| Prompts       | 8     |

---

CONSOLIDATION ESTIMATE

Current: 23 micro-commits → Estimated: 4-6 consolidated commits

| Type(Scope)   | Micro-commits | Est. Consolidated |
|--------------|---------------|-------------------|
| feat(auth)    | 8            | 1                 |
| test(auth)    | 4            | 1                 |
| feat(api)     | 7            | 1                 |
| test(api)     | 3            | 1 (or merge)      |
| docs          | 1            | 1                 |
| **Total**     | **23**       | **4-5**           |

---

FILES CHANGED

| File                          | Status   | Commits |
|------------------------------|----------|---------|
| src/middleware/auth.ts       | new      | 8       |
| src/types/auth.ts            | new      | 3       |
| src/utils/hash.ts            | new      | 4       |
| tests/auth.test.ts           | new      | 4       |
| docs/API.md                  | modified | 2       |
| src/routes/protected.ts      | new      | 2       |
| ... +6 more files            |          |         |

---

RECENT ACTIVITY

| Time  | Type(Scope) | Description                              |
|-------|------------|------------------------------------------|
| 10:52 | feat(api)   | add rate limiting to protected routes    |
| 10:48 | test(auth)  | add JWT expiration test                  |
| 10:45 | feat(auth)  | add token refresh endpoint               |
| 10:42 | fix(auth)   | handle expired token edge case           |
| 10:38 | feat(auth)  | add JWT middleware                       |

---

NEXT STEPS:
  • Continue working: keep making micro-commits
  • Review plan: /consolidate-plan to see proposed grouping
  • Consolidate: /consolidate to rewrite history
  • View log: read .ai-git/pluto-log-ses_7x9k2m.md
```

## Implementation Steps

### 1. Check for Active Session

```bash
if [ ! -f .ai-git/current-session ]; then
  echo "No active Pluto session."
  echo "Start one with /pluto-start"
  exit 0
fi

SESSION_ID=$(cat .ai-git/current-session)
BASE_COMMIT=$(cat .ai-git/session-base)
```

### 2. Gather Session Statistics

```bash
# Count commits since base
COMMIT_COUNT=$(git rev-list --count ${BASE_COMMIT}..HEAD)

# Count prompts from log
PROMPT_COUNT=$(grep -c "^## Prompt Entry" .ai-git/pluto-log-${SESSION_ID}.md)

# Get files changed
FILES_CHANGED=$(git diff --name-only ${BASE_COMMIT}..HEAD | wc -l)

# Get session start time from log
START_TIME=$(grep "Started:" .ai-git/pluto-log-${SESSION_ID}.md | head -1 | sed 's/.*Started: //')
```

### 3. Calculate Consolidation Estimate

Analyze the commit messages to estimate consolidated commit count:

```bash
# Group by type(scope)
git log ${BASE_COMMIT}..HEAD --pretty=format:'%s' | \
  sed -E 's/^([a-z]+\([^)]+\)).*/\1/' | \
  sort | uniq -c | sort -rn
```

Use this heuristic:
- Same `type(scope)` → likely 1 consolidated commit
- Test commits → separate from feature commits
- Docs → separate commit
- Fixes → fold into related feature

**Estimation formula:**
```
estimated = unique_type_scope_pairs + (fix_commits that are standalone) + (refactor commits)
```

### 4. Show Files with Commit Counts

```bash
# For each changed file, count how many commits touched it
git diff --name-only ${BASE_COMMIT}..HEAD | while read file; do
  COUNT=$(git log ${BASE_COMMIT}..HEAD --oneline -- "$file" | wc -l)
  STATUS=$(git diff ${BASE_COMMIT} --name-status -- "$file" | cut -f1)
  echo "  $file ($STATUS, $COUNT commits)"
done
```

### 5. Show Recent Activity

```bash
# Extract last 5 commit entries from log
git log ${BASE_COMMIT}..HEAD --pretty=format:'[%ar] %s' -5
```

## Consolidation Estimation Logic

The estimate groups commits intelligently:

### Grouping Rules:
1. **Same type(scope)** → Single commit
   - `feat(auth): add middleware` + `feat(auth): fix typo` → 1 commit

2. **Related tests** → Separate or combined
   - Tests for a feature can be in same commit OR separate
   - Estimate both options

3. **Fixes** → Fold into original
   - `fix(auth): handle edge case` → folds into `feat(auth)`

4. **Docs** → Usually separate
   - `docs(api): update` → standalone commit

### Example Analysis:
```
Micro-commits breakdown:
  feat(auth): 8 commits → 1 consolidated
  test(auth): 4 commits → 1 consolidated (or fold into feat)
  feat(api): 7 commits → 1 consolidated
  test(api): 3 commits → 1 consolidated (or fold into feat)
  docs: 1 commit → 1 consolidated

Estimate: 4-5 commits (depending on test grouping)
```

## Edge Cases

### No Commits Yet
```
=== Pluto Session Summary ===

Session: ses_7x9k2m
Started: 2024-01-15 10:30:00 UTC (5m ago)
Base: abc123d

| Metric        | Count |
|--------------|-------|
| Micro-commits | 0     |
| Files touched | 0     |
| Prompts       | 0     |

No commits yet. Start working!
```

### Large Session
```
=== Pluto Session Summary ===

⚠ Large session detected

| Metric        | Count |
|--------------|-------|
| Micro-commits | 87    |
| Files touched | 45    |
| Prompts       | 23    |

Consider running /consolidate-plan to review proposed structure.
Consolidating many commits at once increases complexity.
```

### Session Without Log File
```
⚠ Session log file missing: .ai-git/pluto-log-ses_7x9k2m.md

This may be an old session format. 
You can still consolidate, but detailed activity history unavailable.
```

## Display Priorities

Order information by usefulness:
1. **Session ID** - needed for other commands
2. **WIP stats** - quick overview
3. **Consolidation estimate** - most valuable insight
4. **Files changed** - shows scope
5. **Recent activity** - context for what's been done

## Integration with Other Commands

This command provides info to help decide:
- **Ready to consolidate?** Use count and estimate
- **Need more detail?** Run `/consolidate-plan`
- **Review work?** Read log file directly
- **Too many commits?** Consider consolidating now

## Important Notes

1. **Estimation is a heuristic** - actual consolidation may differ
2. **Shows current state** - not updated until command runs
3. **Log file required** - for full details (prompts, timing)
4. **Works with any session size** - from 1 to 100+ commits
5. **Quick at-a-glance** - meant to be fast, not exhaustive

## Example Output (Real Session)

```
=== Pluto Session Summary ===

Session: ses_d02eecab
Started: 2024-01-15 14:22:10 UTC (3m ago)
Base: 2fbb770

---

WORK IN PROGRESS

| Metric        | Count |
|--------------|-------|
| Micro-commits | 1     |
| Files touched | 1     |
| Prompts       | 1     |

---

CONSOLIDATION ESTIMATE

Current: 1 micro-commit → Estimated: 1 consolidated commit

| Type(Scope)      | Micro-commits | Est. Consolidated |
|-----------------|---------------|-------------------|
| feat(commands)   | 1            | 1                 |
| **Total**        | **1**        | **1**             |

---

FILES CHANGED

| File                                | Status | Commits |
|------------------------------------|--------|---------|
| .claude/commands/pluto-list.md     | new    | 1       |

---

RECENT ACTIVITY

| Time         | Type(Scope)    | Description                       |
|--------------|---------------|-----------------------------------|
| 2 minutes ago | feat(commands) | add pluto-list summary command   |

---

NEXT STEPS:
  • Continue working on current task
  • Run /pluto-list again to see updated stats
  • When ready: /consolidate-plan to review grouping
```
