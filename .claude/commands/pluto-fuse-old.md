# /pluto-fuse - Fuse Micro-Commits

Convert micro-commits from a Pluto session into clean, fused commits.

## Usage

```
/pluto-fuse
```

## Overview

This command takes all micro-commits from the current session and fuses them into logical, meaningful commits through a simple three-step process:

1. **Analyze & Propose** - Review micro-commits and suggest consolidation groupings
2. **User Review** - Show the plan and get confirmation
3. **Execute & Verify** - Rewrite git history and run QA checks

## Step-by-Step Behavior

### Step 1: Analyze Micro-Commits

First, gather and analyze all micro-commits from the current session:

```bash
# Get current session
SESSION_ID=$(cat .ai-git/current-session)
BASE_COMMIT=$(git log --grep="session: $SESSION_ID" --format="%H" | tail -1)^

# List all micro-commits in this session
git log $BASE_COMMIT..HEAD --oneline
```

Analyze the commits by examining:
- Commit messages (type, scope, description)
- Session metadata (prompt, reason, files touched)
- File changes and dependencies
- Temporal relationships

### Step 2: Propose Consolidation Plan

Group micro-commits into logical fused commits based on:

**Group together:**
- Same feature or functionality
- Implementation + immediate bug fixes
- Related files (source + tests + types)
- Fix-ups (typos, missing imports, etc.)

**Keep separate:**
- Different features
- Refactoring vs new features
- Config/dependency changes vs application code

Present the plan to the user:

```
## Consolidation Plan

Session: ses_0b3bcb00
Micro-commits: 23
Proposed commits: 4

---

### Commit 1: feat(auth): add JWT authentication middleware

Combines: abc123d, def456e, ghi789f, jkl012m, mno345p, qrs678t

Files:
- src/middleware/auth.ts (new)
- src/types/auth.ts (new)
- src/errors/AuthError.ts (new)

Reasoning: Core authentication feature. Includes initial implementation 
plus fixes for import errors (def456e) and type definitions (mno345p).

Historical references: abc123d, def456e, ghi789f, jkl012m, mno345p, qrs678t

---

### Commit 2: test(auth): add authentication test suite

Combines: tuv901w, xyz234a

Files:
- src/middleware/__tests__/auth.test.ts (new)

Reasoning: Test coverage for authentication middleware.

Historical references: tuv901w, xyz234a

---

(continue for remaining commits...)

---

Do you want to proceed with this consolidation? (yes/no)
```

### Step 3: Execute Consolidation

Once the user confirms, execute the consolidation:

#### 3a. Save Recovery Point

```bash
# Save current state for recovery
echo "$(git rev-parse HEAD) $(date -Iseconds) pre-fuse session:$SESSION_ID" >> .ai-git/recovery
```

#### 3b. Perform Interactive Rebase

```bash
# Start interactive rebase from base commit
git rebase -i $BASE_COMMIT
```

For each fused commit group:
1. `pick` the first micro-commit in the group
2. `fixup` (or `squash`) all subsequent micro-commits
3. `reword` to set the final fused commit message

#### 3c. Annotate Session Log

After consolidation, update the session log with mapping information:

```bash
cat >> .ai-git/pluto-log-${SESSION_ID}.md << 'EOF'

## Consolidation Summary
- **Timestamp**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Micro-commits fused**: 23
- **Final commits**: 4

### fused Commits

1. **feat(auth): add JWT authentication middleware** (new: 9a8b7c6)
   - Historical micro-commits: abc123d, def456e, ghi789f, jkl012m, mno345p, qrs678t
   - Files: src/middleware/auth.ts, src/types/auth.ts, src/errors/AuthError.ts

2. **test(auth): add authentication test suite** (new: 5d4e3f2)
   - Historical micro-commits: tuv901w, xyz234a
   - Files: src/middleware/__tests__/auth.test.ts

(etc...)

---
EOF
```

#### 3d. Run QA Checks

Run QA verification on the fused commits:

```bash
# Check each commit sequentially
for commit in $(git log $BASE_COMMIT..HEAD --format="%H"); do
  git checkout $commit
  
  # Run basic checks (can be expanded)
  if [ -f package.json ]; then
    npm install --silent
    npm test
  fi
  
  if [ $? -ne 0 ]; then
    echo "QA failed at commit $commit"
    # Note: Manual intervention needed
    break
  fi
done
```

If QA fails on any commit, report the issue and suggest options:
- Abort and recover
- Fix the issue manually
- Skip QA for this session

### Step 4: Report Results

Show a clear summary of what happened:

```
Consolidation complete

23 micro-commits fused into 4 commits

  [9a8b7c6] feat(auth): add JWT authentication middleware
  [5d4e3f2] test(auth): add authentication test suite
  [1c2d3e4] feat(api): add protected route handlers
  [8f7e6d5] docs: update API documentation

Session log updated with historical micro-commit references.

Recovery point saved. Use /pluto-recover if you need to undo.
```

## Important Rules

1. **Always get user confirmation** before rewriting git history
2. **Save recovery points** before any destructive operations
3. **Annotate the session log** with historical commit references for traceability
4. **Keep each commit atomic** - one logical change per commit
5. **Ensure commits build** - don't fuse broken intermediate states
6. **Order by dependency** - dependencies before features

## Error Handling

If something goes wrong during consolidation:

```bash
# Abort rebase if in progress
if [ -d .git/rebase-merge ]; then
  git rebase --abort
fi

# Offer recovery
echo "Consolidation failed. Use /pluto-recover to restore previous state."
```

## Recovery

Users can recover from a failed consolidation:

```bash
# Show recent recovery points
tail -5 .ai-git/recovery

# Restore to a specific point
git reset --hard <commit-hash>
```

## Files Modified

- `.ai-git/pluto-log-${SESSION_ID}.md` - Updated with consolidation summary and micro-commit references
- `.ai-git/recovery` - New recovery point added
- Git history - Rewritten from base commit to HEAD

## Example Session Log Annotation

After consolidation, the session log will include a mapping section:

```markdown
## Consolidation Summary
- **Timestamp**: 2025-12-12 15:30:00 UTC
- **Micro-commits fused**: 23
- **Final commits**: 4

### fused Commits

1. **feat(auth): add JWT authentication middleware** (9a8b7c6)
   - Historical: abc123d, def456e, ghi789f, jkl012m, mno345p, qrs678t
   - Files: src/middleware/auth.ts, src/types/auth.ts, src/errors/AuthError.ts
   - Original prompts: "Add JWT middleware", "Fix import error", "Add types"

2. **test(auth): add authentication test suite** (5d4e3f2)
   - Historical: tuv901w, xyz234a
   - Files: src/middleware/__tests__/auth.test.ts
   - Original prompts: "Add auth tests", "Fix test timeout"

...
```

This creates a permanent record of which micro-commits were combined into each fused commit.

## Notes

- Consolidation is a **destructive operation** - it rewrites git history
- Always done locally before pushing
- Session log preserves the full micro-commit history for reference
- QA checks are recommended but can be skipped with user consent
- If consolidation fails partway through, the rebase is aborted and user can recover


