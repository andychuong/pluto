# /pluto-spin-weave - Spin and Weave in One Step

Consolidate fibers into clean threads AND integrate with target branch to produce PR-ready code in one operation.

## Usage

```
/pluto-spin-weave [--target <branch>] [--no-qa] [--no-failsafe]
```

**Default target:** `origin/main`

---

## What It Does

This command combines `/pluto-spin` and `/pluto-weave` into a single streamlined workflow:

1. Consolidates all fibers into clean threads (spin)
2. Integrates those threads with the target branch (weave)
3. Validates at each stage with QA
4. Produces PR-ready code

**How it works:** A single interactive rebase onto the target branch accomplishes both goals simultaneously. The rebase consolidates your commits (spin) while also replaying them on top of the target (weave).

---

## Terminology

- **Fibers**: Individual atomic work commits (what pluto-start creates)
- **Threads**: Clean, meaningful commits after spinning
- **Weave**: Integrating threads with remote changes
- **Spin-Weave**: The complete operation in one command

---

## Step 1: Pre-Flight Checks

Run comprehensive checks before starting:

```bash
# Check for uncommitted changes
git status --porcelain

# Fetch latest remote state
git fetch origin
TARGET=${TARGET:-origin/main}

# Verify target branch exists
git rev-parse --verify ${TARGET}

# Check for fibers to spin
git log ${TARGET}..HEAD --format="%H %s"
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
# Get all commits since divergence from target
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
- **Raw commits**: Commits without Pluto metadata (not session start, conversation, fibers, or threads)

**Check for raw commits:**

If any raw commits are detected (commits without Pluto metadata that aren't conventional commits):

```
Raw commits detected

Found X raw commit(s) that are not Pluto Fibers:

1. abc1234: "Added new feature"
2. def5678: "Fix bug"

These commits were not created through Pluto workflow.

Would you like me to:

(a) Incorporate these commits into the spin-weave process
    - I'll treat them as work to be consolidated with your fibers
    - They'll be grouped with related fibers in the thread plan

(b) Stop and let you handle them separately
    - Run /pluto-rewrite to convert raw commits into Pluto Fibers
    - Then run /pluto-spin-weave again
    
Which would you prefer? (a/b)
```

**Wait for user response:**

- **If user chooses (a)**: Continue with spin-weave, treating raw commits as additional work to consolidate
- **If user chooses (b)**: Exit gracefully with instructions:
  ```
  Suggested workflow:
  1. Run /pluto-rewrite to convert raw commits into Pluto Fibers
  2. Run /pluto-spin-weave again
  
  Or use separate commands for more control:
  1. Run /pluto-rewrite
  2. Run /pluto-spin to consolidate fibers into threads
  3. Run /pluto-weave to integrate with remote
  ```

### 2b. Remote Commits

```bash
# Get remote commits we'll be rebasing onto
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

Target: origin/main (X commits ahead of your branch)

Spin (Thread Groupings):
------------------------
1. feat(auth): implement JWT middleware
   Fibers: f1, f2, f5 (3 fibers)
   Files: src/auth/middleware.ts, src/auth/types.ts

2. fix(auth): resolve token expiration handling
   Fibers: f3, f4 (2 fibers)
   Files: src/auth/middleware.ts

3. test(auth): add JWT middleware tests
   Fibers: f6, f7 (2 fibers)
   Files: src/auth/middleware.test.ts

Weave (Remote Integration):
---------------------------
Your threads will be rebased onto origin/main.
Potential conflicts in: src/auth/middleware.ts (modified in both)

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

Before any destructive operations, save a recovery point:

```bash
# Pre-compute date to avoid command substitution
TIMESTAMP=$(date -Iseconds)
REV=$(git rev-parse HEAD)

mkdir -p .ai-git
echo "${REV} ${TIMESTAMP} pre-spin-weave" >> .ai-git/recovery
```

Also create/update state file:

```bash
cat > .ai-git/state.json << 'EOF'
{
  "operation": "spin-weave",
  "status": "in_progress",
  "phase": "starting",
  "target": "${TARGET}",
  "recovery_point": "${REV}",
  "started": "${TIMESTAMP}"
}
EOF
```

---

## Step 5: Execute Spin-Weave (Interactive Rebase)

The interactive rebase onto TARGET accomplishes both spin and weave in one operation:

```bash
git rebase -i ${TARGET}
```

**For each thread group in the plan:**
1. `pick` the first fiber in the group
2. `fixup` all subsequent fibers in the group
3. `reword` to set the final thread commit message

**During rebase, conflicts may occur.** This is the "weave" part - integrating your changes with remote updates.

### Conflict Resolution (AI-Driven)

For each conflict during rebase:

```bash
# Identify conflicts
CONFLICTS=$(git diff --name-only --diff-filter=U)
```

**For each conflict, work through:**

1. **What is local trying to accomplish?**
   - Reference the fiber commit messages
   - Check metadata (intent, prompt, reason)
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

Then resolve and continue:
```bash
# Edit file to implement your decision
git add <file>
git rebase --continue
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

Then wait for human response before continuing rebase.

**On rebase failure (unrecoverable):**
```bash
git rebase --abort
echo "Spin-Weave failed during rebase"
echo "Recovery available: /pluto-recover"
```

**On success:** All fibers are now consolidated into clean threads, rebased onto TARGET. Proceed to Step 6.

---

## Step 6: Post-Spin QA Validation

After the rebase completes, validate the thread groupings before proceeding:

```bash
# Update state
# phase: "validating-spin"
```

Invoke the **weave-qa-agent** to validate the spun state:

```
Context to pass to weave-qa-agent:
- Threads are created but not yet finalized
- Validation should cover: pre-checks, lint, build, test
- Return structured pass/fail results
```

**On QA pass:** Proceed to Step 7.

**On QA failure:**

1. Report what failed with error details
2. Identify if issue is from thread groupings
3. Attempt automatic fixes if possible:
   - Lint errors: Auto-fix with linter
   - Import errors: Add missing imports
   - Type errors: Adjust types if clear fix
4. Re-run QA validation
5. If still failing after 2-3 fix attempts, escalate to human:
   ```
   QA Failures after Spin:
   
   1. Build error: Cannot find module '../utils/auth'
      Likely cause: Thread grouping separated implementation from imports
      
   2. Test failure: AuthMiddleware.test.ts - JWT validation fails
      Likely cause: Related code was split across threads
   
   Would you like to:
   (a) Abort and recover (rolls back entire operation)
   (b) Fix manually and continue
   ```

---

## Step 7: Final QA Validation

Run final validation to ensure everything is ready for PR:

```bash
# Update state
# phase: "validating-final"
```

Invoke the **weave-qa-agent** again:

```
Context to pass to weave-qa-agent:
- Final state after spin-weave
- Full validation: pre-checks, lint, build, test
- Return structured pass/fail results
```

**On QA pass:** Proceed to Step 8.

**On QA failure:** Same escalation process as Step 6.

---

## Step 8: Report Results

Show clear summary to user:

```
Spin-Weave complete

Spin:
  X fibers consolidated into Y threads

Threads created:
  - feat(auth): implement JWT middleware
  - fix(auth): resolve token expiration handling
  - test(auth): add JWT middleware tests

Weave:
  Rebased onto: origin/main
  Conflicts resolved: N files

Conflict resolutions:
  - src/auth/handler.ts: Merged both approaches for better error handling
  - src/auth/middleware.ts: Chose local implementation (consistent with patterns)

QA Status:
  Lint: passed
  Build: passed
  Tests: passed

Next steps:
  Ready to push! Review the commits and push when ready.

  git log --oneline -10  # Review recent commits
  git push origin HEAD   # Push PR-ready code
```

---

## Step 9: Cleanup Prompt

After successful completion, offer to clean up session artifacts:

```
Spin-weave complete successfully.

Would you like to clean up session artifacts?
  - .ai-git/recovery entry for this operation
  - .ai-git/state.json

This removes temporary tracking data. Recovery will no longer be available for this operation.

Clean up? (y/n)
```

**If user chooses yes:**
```bash
# Remove state file
rm -f .ai-git/state.json

# Remove the recovery entry for this operation (keep others)
# This requires parsing the recovery file - simplest approach is to
# remove lines matching the current recovery point
grep -v "${RECOVERY_POINT}" .ai-git/recovery > .ai-git/recovery.tmp
mv .ai-git/recovery.tmp .ai-git/recovery

# If recovery file is now empty, remove it
[ ! -s .ai-git/recovery ] && rm -f .ai-git/recovery

# If .ai-git directory is now empty, remove it
rmdir .ai-git 2>/dev/null || true

echo "Cleanup complete."
```

**If user chooses no:**
```
Keeping session artifacts. You can manually clean up later or run /pluto-recover if needed.
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

### Rebase Failure

If rebase fails and cannot be resolved:

```bash
# Abort the operation
git rebase --abort

# Report to user
echo "Spin-Weave failed during rebase"
echo ""
echo "Recovery available:"
echo "  /pluto-recover - Restore to pre-spin-weave state"
echo ""
echo "Alternative:"
echo "  Run /pluto-spin and /pluto-weave separately for more control"
```

### QA Failures

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
  "phase": "spinning",
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

**Update status as you progress:** planning -> spinning -> validating-spin -> validating-final -> complete

---

## Key Principles

1. **Single operation** - One interactive rebase does both spin and weave
2. **Two QA passes** - Validate after spin, validate after completion
3. **Single recovery point** - All-or-nothing rollback
4. **AI-driven decisions** - Resolve conflicts automatically when possible
5. **Document everything** - Every decision needs clear reasoning
6. **Never break the build** - Validate before considering complete
7. **Clean commits** - Messages are for humans, not tools
8. **Clean up after** - Offer to remove session artifacts

---

## How It Works

The key insight is that `git rebase -i TARGET` accomplishes both goals:

1. **Spin**: The interactive rebase lets you squash/fixup commits together, consolidating fibers into threads
2. **Weave**: Rebasing onto TARGET replays your commits on top of the latest remote, integrating remote changes

This is simpler and more reliable than trying to do a separate merge after rebasing.

---

## When to Use Separate Commands

Use `/pluto-spin` and `/pluto-weave` separately if:

- You want to validate thread groupings in isolation
- You need to push threads before integrating with remote
- You want more granular control over the process
- You prefer a merge commit over rebased history

Use `/pluto-spin-weave` when:

- You want PR-ready code quickly
- You prefer linear history (rebased commits)
- You have a reasonably clean integration expected
- You want the fastest workflow
