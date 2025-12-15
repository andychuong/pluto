# /pluto-spin-weave - Spin and Weave in One Step

Consolidate fibers into clean threads AND merge with target branch to produce PR-ready code in one operation.

## Usage

```
/pluto-spin-weave [--target <branch>] [--no-qa] [--no-failsafe]
```

**Default target:** `origin/main`

---

## What It Does

This command combines `/pluto-spin` and `/pluto-weave` into a single streamlined workflow:

1. Consolidates all fibers into clean threads (spin)
2. Merges those threads with the target branch (weave)
3. Validates the final state with QA
4. Produces PR-ready code

**Key simplification:** Only one QA validation at the very end, not after each step.

---

## Terminology

- **Fibers**: Individual atomic work commits (what pluto-start creates)
- **Threads**: Clean, meaningful commits after spinning
- **Weave**: Merging threads with remote changes
- **Spin-Weave**: The complete operation in one command

---

## Step 1: Pre-Flight Checks

Run comprehensive checks before starting:

```bash
# Check for uncommitted changes
git status --porcelain

# Check for fibers to spin
git log origin/main..HEAD --format="%H %s"

# Verify target branch exists
git fetch origin
TARGET=${TARGET:-origin/main}
git rev-parse --verify ${TARGET}
```

**Fail conditions:**

- **Uncommitted changes**: "Cannot spin-weave with uncommitted changes. Run `/pluto-rewrite` to convert your changes into fibers first."
- **No fibers found**: "Nothing to spin - no commits ahead of ${TARGET}. If you have uncommitted changes, run `/pluto-rewrite` first."
- **Target branch doesn't exist**: "Target branch ${TARGET} not found."

**Success:** Proceed to Step 2.

---

## Step 2: Gather Context

Collect all information needed for planning:

### 2a. Local Fibers and Threads

```bash
# Get all commits since last push
git log ${TARGET}..HEAD --format="%H|%s" --reverse
```

For each commit, extract:
- Commit message
- Full body for metadata: `git log -1 --format="%b" <hash>`
- Files changed: `git diff-tree --no-commit-id --name-only -r <hash>`

**Identify commit types:**
- **Session start**: Message starts with `pluto: start session` and has `type: session-start`
- **Conversation commits**: Message starts with `pluto: conversation` and has `type: prompt`
- **Fibers**: Have `type: work` in the body
- **Threads**: Clean conventional commits with no `type:` metadata (already spun)

### 2b. Remote Commits

```bash
# Get remote commits we don't have
git log HEAD..${TARGET} --format="%H|%s" --reverse
```

For each remote commit:
- What it accomplishes (commit message)
- Which files it touches
- Any detailed commit body

**Output:** Complete context for planning.

---

## Step 3: Generate Plan

Present a simple, focused plan to the user:

```
Spin-Weave Plan
===============

Target: origin/main (X remote commits)

Proposed Threads:
-----------------
1. feat(auth): implement JWT middleware
   Fibers: f1, f2, f5 (3 fibers)
   Files: src/auth/middleware.ts, src/auth/types.ts

2. fix(auth): resolve token expiration handling
   Fibers: f3, f4 (2 fibers)
   Files: src/auth/middleware.ts

3. test(auth): add JWT middleware tests
   Fibers: f6, f7 (2 fibers)
   Files: src/auth/middleware.test.ts

Weave:
------
Will merge with origin/main after spinning threads.

Ready to proceed? (y/n)
```

**Grouping criteria** (from pluto-spin):
- Same feature or functionality
- Implementation + immediate bug fixes
- Related files (source + tests + types)
- Fix-ups (typos, missing imports)

**Keep separate:**
- Different features
- Refactoring vs new features
- Config/dependency changes vs application code

**User confirmation required:** Wait for explicit "yes" before proceeding.

**If user says no:** Ask what needs adjustment, regenerate plan, and confirm again.

---

## Step 4: Save Recovery Point

Before any destructive operations, save a single recovery point:

```bash
mkdir -p .ai-git
echo "$(git rev-parse HEAD) $(date -Iseconds) pre-spin-weave" >> .ai-git/recovery
```

**Why single recovery point:** Simpler state management. If anything goes wrong, rollback undoes the entire operation.

---

## Step 5: Execute Spin (Rebase)

Use spin logic from `pluto-spin.md` to consolidate fibers into threads:

```bash
git rebase -i ${TARGET}
```

**For each thread group in the plan:**
1. `pick` the first fiber in the group
2. `fixup` all subsequent fibers in the group
3. `reword` to set the final thread commit message

**Skip:** The QA validation that `pluto-spin` normally does. We'll validate once at the end.

**On rebase failure:**
```bash
git rebase --abort
echo "✗ Spin failed during rebase"
echo "Recovery available: /pluto-recover"
exit 1
```

**On success:** All fibers are now consolidated into clean threads. Proceed to Step 6.

---

## Step 6: Execute Weave (Merge)

Use weave logic from `pluto-weave.md` to merge with target branch:

### 6a. Fetch and Merge

```bash
git fetch origin
git merge --no-commit --no-ff ${TARGET}
```

**If clean merge (no conflicts):** Skip to Step 7 (QA Validation).

**If conflicts:** Proceed to Step 6b (Resolve Conflicts).

### 6b. Resolve Conflicts (AI-Driven)

For each conflicted file, apply the decision framework from `pluto-weave.md`:

```bash
# Identify conflicts
CONFLICTS=$(git diff --name-only --diff-filter=U)
```

**For each conflict, work through:**

1. **What is local trying to accomplish?**
   - Reference the thread commit message
   - Check metadata from fibers (intent, prompt, reason)
   - What user goal does this serve?

2. **What is remote trying to accomplish?**
   - Read the remote commit message and body
   - What feature/fix does this implement?

3. **Can both changes coexist?**
   - Often conflicts are additive (both add different functions)
   - Can you merge both, adjusting imports/exports?
   - Does combining them produce better code?

4. **If mutually exclusive, which is better?**
   - Better error handling?
   - More consistent with codebase patterns?
   - Better performance?
   - More maintainable?

5. **Do I need human input?**
   - Only if this is an architectural choice
   - Or if missing business/domain context
   - Or if requirements are genuinely ambiguous

**Resolution Actions:**

**Auto-Resolve (you decide):**

Make the decision and document it:

```markdown
Decision: src/auth/handler.ts

Conflict: Both local and remote modified error handling
Choice: merged
Reasoning: Combined local's detailed error messages with remote's error code standardization. Results in better error handling than either alone.
```

Then resolve and stage:
```bash
# Edit file to implement your decision
git add <file>
```

**Escalate to Human:**

When you genuinely can't decide:

```markdown
Escalation: src/config/auth.ts

Conflict: Local uses JWT tokens, remote uses session-based auth

Local intent: Stateless authentication with JWT
Remote intent: Session-based authentication with server-side storage

Why I can't decide: This is an architectural decision with long-term implications

Question for you: Which authentication strategy should we use?

My recommendation: JWT aligns with the stateless API design in other parts of the codebase, but sessions may be required for specific business requirements I'm not aware of.
```

Then wait for human response before proceeding.

**Verify resolution complete:**

```bash
# No conflict markers remain
git grep -n "<<<<<<< HEAD" && echo "MARKERS FOUND - INCOMPLETE" || echo "OK"

# Check for whitespace issues
git diff --check
```

---

## Step 7: Final QA Validation

This is the only QA pass - validates everything at once.

Invoke the **weave-qa-agent** to validate the final merged state:

```
Context to pass to weave-qa-agent:
- All changes are staged (merged state)
- Validation should cover: pre-checks, lint, build, test
- Return structured pass/fail results
```

**On QA pass:** Proceed to Step 8 (Commit).

**On QA failure:**

1. Report what failed with error details
2. Identify if issue is from spin groupings or weave resolutions
3. Attempt automatic fixes if possible:
   - Lint errors: Auto-fix with linter
   - Import errors: Add missing imports
   - Type errors: Adjust types if clear fix
4. Re-run QA validation
5. If still failing after 2-3 fix attempts, escalate to human:
   ```
   QA Failures:
   
   1. Build error: Cannot find module '../utils/auth'
      Likely cause: Thread grouping separated implementation from imports
      
   2. Test failure: AuthMiddleware.test.ts - JWT validation fails
      Likely cause: Conflict resolution chose wrong implementation
   
   Would you like to:
   (a) Abort and recover (rolls back entire operation)
   (b) Fix manually and continue
   (c) Skip failing tests (not recommended)
   ```

**Iterate until QA passes or user chooses to abort.**

---

## Step 8: Commit Merge

Once QA passes, commit with a clean, human-readable message:

```bash
git commit -m "Merge ${TARGET}: integrate local changes

Merged remote updates with local development work.

Spin summary:
- X fibers consolidated into Y threads

Threads created:
- feat(auth): implement JWT middleware
- fix(auth): resolve token expiration handling
- test(auth): add JWT middleware tests

Conflicts resolved:
- src/auth/handler.ts: Merged both approaches for better error handling
- src/auth/middleware.ts: Chose local implementation (better patterns)

All validations passed."
```

**Commit message should:**
- Be readable by any developer
- Explain what was spun and what was merged
- Document conflict resolutions and reasoning
- Not include internal metadata or pluto-specific markers

---

## Step 9: Report Results

Show clear summary to user:

```
✓ Spin-Weave complete

Spin:
  20 fibers → 10 threads

Weave:
  Merged: origin/main
  Conflicts resolved: 3 files

Summary of decisions:
  - src/auth/handler.ts: Merged both approaches - better error handling
  - src/auth/middleware.ts: Chose local - consistent with patterns
  - src/config/auth.ts: Chose remote - aligns with architecture

Next steps:
  Ready to push! Review the final commit and push when ready.

  git log --oneline -10  # Review recent commits
  git push origin HEAD   # Push PR-ready code
```

---

## Flags

| Flag | Behavior |
|------|----------|
| `--target <branch>` | Target branch to weave into (default: origin/main) |
| `--no-qa` | Skip QA validation (not recommended - risky) |
| `--no-failsafe` | Skip recovery point creation (not recommended) |

---

## Error Handling

### Any Failure Before QA

If rebase or merge fails:

```bash
# Abort the operation
git rebase --abort || git merge --abort

# Report to user
echo "✗ Spin-Weave failed during ${PHASE}"
echo ""
echo "Recovery available:"
echo "  /pluto-recover - Restore to pre-spin-weave state"
echo ""
echo "Alternative:"
echo "  Run /pluto-spin and /pluto-weave separately for more control"
```

### QA Failures

- Keep merged state staged (don't commit)
- Report what failed with details
- Attempt automatic fixes
- Iterate or offer manual resolution
- If user wants to abort, `/pluto-recover` restores everything

### State Preservation

Track operation state in `.ai-git/state.json`:

```json
{
  "operation": "spin-weave",
  "status": "in_progress",
  "phase": "weaving",
  "target": "origin/main",
  "recovery_point": "abc123def",
  "started": "2025-12-14T10:30:00Z",
  "plan": {
    "threads": [
      {
        "title": "feat(auth): implement JWT middleware",
        "fibers": ["f1", "f2", "f5"]
      }
    ]
  },
  "conflicts": [
    {
      "file": "src/auth/handler.ts",
      "status": "resolved",
      "choice": "merged",
      "reasoning": "Combined both approaches"
    }
  ]
}
```

**Update status as you progress:** planning → spinning → weaving → validating → complete

---

## Key Principles

1. **Streamlined workflow** - One command from fibers to PR-ready code
2. **Simple plan** - Just show thread groupings and target branch
3. **Single QA pass** - Validate only the final merged state
4. **Single recovery point** - All-or-nothing rollback
5. **AI-driven decisions** - Resolve conflicts automatically when possible
6. **Document everything** - Every decision needs clear reasoning
7. **Never break the build** - Validate before committing
8. **Clean commits** - Messages are for humans, not tools

---

## Benefits Over Separate Commands

**Speed:** One QA pass instead of two

**Simplicity:** One confirmation instead of multiple

**Efficiency:** Complete workflow in one operation

**Convenience:** From fibers to PR-ready in one step

**Trade-off:** If thread groupings cause issues, you'll find out during final QA rather than earlier. But the happy path is much faster and cleaner.

---

## When to Use Separate Commands

Use `/pluto-spin` and `/pluto-weave` separately if:

- You want to validate thread groupings before weaving
- You need to push threads before merging
- You want more granular control over the process
- You're working with a particularly complex merge

Use `/pluto-spin-weave` when:

- You want PR-ready code quickly
- You trust the AI to consolidate and merge correctly
- You have a reasonably clean merge expected
- You want the fastest workflow
