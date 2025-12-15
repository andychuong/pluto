# /pluto-spin — Execute Spin

Spin fibers into clean threads with automatic failsafe recovery.

## Usage

```
/pluto-spin [--plan <file>] [--no-qa] [--no-failsafe]
```

## Terminology

- **Fibers**: Individual atomic work commits (what pluto-start creates)
- **Threads**: Clean, meaningful commits after spinning (the goal)
- **Spin**: The process of consolidating fibers into threads

## Guiding Principle

Each thread should be a **meaningful checkpoint of working code**. Ask: "What can the user/system do now that it couldn't before?"

## Examples

**Good thread grouping:**
- feat(auth): implement JWT middleware (combines: middleware logic + types + integration + import fixes)
- fix(login): resolve mobile button styling (combines: CSS fix + responsive logic)

**Bad thread grouping:**
- feat(auth): add authentication (too broad - groups unrelated auth features)
- fix(auth): fix typo (too granular - should combine with related work)
- feat(api): add endpoints + fix(auth): JWT fix (mixes unrelated features)

---

## Step 1: Gather All Fibers

Spinning is **global across all sessions**. Gather all unspun fibers since last push from `origin/main..HEAD`.

**If no fibers found:** Tell the user "Nothing to spin - no new fibers since last spin" and exit.

**How to identify commits (based on `type:` metadata from pluto-start):**
- **Session start**: Message starts with `pluto: start session` and has `type: session-start`
- **Conversation commits**: Message starts with `pluto: conversation` and has `type: prompt` - these capture conversational context between fibers
- **Fibers**: Have `type: work` in the body - these are the atomic work commits to be spun
- **Threads**: Clean conventional commits with no `type:` metadata (already spun)

Only fibers (`type: work`) get spun. Threads are never re-consolidated. Conversation commits (`type: prompt`) inform the spin but aren't preserved as separate commits - their context should be incorporated into thread commit messages.

**Output:** List of fibers and conversation commits to process.

---

## Step 2: Generate Spin Plan

Generate a plan by grouping fibers into threads based on logical boundaries.

**Use conversation commits for context:**
Read conversation commits to understand decisions, clarifications, and context. Use this to:
- Inform how fibers should be grouped
- Write better thread commit messages that capture the "why"
- Understand relationships between fibers

**Grouping criteria:**
- Same feature or functionality
- Implementation + immediate bug fixes
- Related files (source + tests + types)
- Fix-ups (typos, missing imports)

**Keep separate:**
- Different features
- Refactoring vs new features
- Config/dependency changes vs application code

**Present the plan and get user confirmation:**

1. Show the proposed plan with thread groupings and commit messages
2. Ask: "Does this grouping look correct? Would you like to adjust any threads?"
3. **Wait for explicit user approval** before proceeding to QA

Do not proceed to QA until the user confirms the plan.

**Output:** Confirmed plan mapping fibers → threads with proposed commit messages.

---

## Step 3: QA Validation

**Validate the plan before rewriting history.** Call the qa-orchestrator with the proposed plan.

The **qa-orchestrator** (see `installer/agents/qa-orchestrator.md`) handles the mechanics.

```
pluto-spin calls qa-orchestrator with plan:
  Thread A = [a1, a2, a3]
  Thread B = [b1, b2]
  Thread C = [c1, c2, c3, c4]

qa-orchestrator returns:
  Thread A → PASS
  Thread B → PASS
  Thread C → FAIL: "Cannot find module '../utils/auth'"
```

Skip QA with `--no-qa` (not recommended).

**On all pass:** Proceed to Step 4 (Save Recovery Point).
**On any failure:** Proceed to Step 3a (Adjust Plan).

---

## Step 3a: Adjust Plan (if QA fails)

When QA fails, adjust the spin plan and retry.

**Algorithm:**
1. Identify which threads failed
2. Adjust groupings - often fewer, larger thread groupings fix dependency issues
3. Call qa-orchestrator again with adjusted plan
4. If still failing, try fewer groupings (N-1, N-2... down to 1 thread)
5. If single thread still fails, report to user for manual intervention

**Example flow:**
```
Original plan: 5 threads → QA fails on Thread C
Adjusted plan: 4 threads (merged C+D) → QA passes
Proceed to rebase with adjusted plan
```

**Final fallback:** If QA cannot pass, report failure and preserve fibers as-is. Do not rebase.

---

## Step 4: Save Recovery Point

Before any destructive operation, save current state.

```bash
echo "$(git rev-parse HEAD) $(date -Iseconds) pre-spin" >> .ai-git/recovery
```

**Why:** Enables `/pluto-recover` if anything goes wrong during rebase.

---

## Step 5: Execute Rebase

**Only reached after QA passes.** Rewrite git history according to the validated spin plan.

**Before rebase, confirm the working plan with the user:**

1. Present the final (working) plan
2. If the plan was adjusted during QA (Step 3a), explicitly show the differences:
   ```
   Plan was adjusted to pass QA:

   Original plan (5 threads):
     - Thread A: [f1, f2]
     - Thread B: [f3, f4]
     - Thread C: [f5, f6, f7]  ← failed QA
     - Thread D: [f8, f9]
     - Thread E: [f10]

   Working plan (4 threads):
     - Thread A: [f1, f2]       (unchanged)
     - Thread B: [f3, f4]       (unchanged)
     - Thread C': [f5, f6, f7, f8, f9]  ← merged C+D
     - Thread E: [f10]          (unchanged)
   ```
3. Ask: "Ready to proceed with rebase using this plan?"
4. **Wait for explicit user approval** before executing rebase

```bash
git rebase -i origin/main
```

**For each thread group:**
1. `pick` the first fiber in the group
2. `fixup` all subsequent fibers in the group
3. `reword` to set the final thread commit message

**On failure:** If rebase fails mid-way, run `git rebase --abort` and offer `/pluto-recover`.

---

## Step 6: Report Results

Show clear summary with next steps.

**Full success:**
```
✓ Spin complete
  20 fibers → 10 threads
  All threads verified. Ready to push.
```

**QA failed, plan adjusted:**
```
✓ Spin complete (plan adjusted)
  20 fibers → 8 threads (original plan: 10)
  QA failed on initial plan, merged some groupings.
  Ready to push.
```

**Total failure (QA could not pass):**
```
✗ Spin failed - QA could not pass
  All 20 fibers preserved (no rebase performed).
  Suggestions: review failing fibers, fix issues manually, try again.
```

---

## Step 7: Log Session

Append spin details to `.ai-git/pluto-log.md` for audit trail.

**Log structure:**
```markdown
## Spin: 2025-12-13T14:23:45Z

### Summary
[Why spinning happened and results overview]

### Metrics
- X fibers → Y threads
- Z unspun fibers (if any)

### Fibers
[Chronological list of all fibers with:
 - Fiber ID, session ID, timestamp
 - Prompt
 - Files changed
 - Commit hash]

### Threads
[Each thread with:
 - Thread title/commit message
 - Which fibers were grouped
 - Rationale for grouping
 - Final commit hash]
```

**Behavior:** Each spin appends a new entry. File grows chronologically as complete project history.

---

## State Tracking

Progress saved to `.ai-git/state.json`:

```json
{
  "sessions_spun": ["ses_7x9k2m", "ses_abc123", "ses_def456"],
  "original_head": "abc123",
  "status": "spinning",
  "plan": {
    "threads": [
      {
        "title": "feat(auth): add JWT middleware",
        "fibers": ["f1", "f2", "f5"]
      }
    ],
    "adjustments": 1
  },
  "qa_results": {
    "thread_1": "pass",
    "thread_2": "pass",
    "thread_3": "fail: Cannot find module '../utils/auth'"
  }
}
```

---

## On Failure

- **Never leave repo in broken state**
- If mid-rebase: `git rebase --abort`
- Always offer `/pluto-recover` command
- Explain what went wrong clearly
- Suggest concrete next steps