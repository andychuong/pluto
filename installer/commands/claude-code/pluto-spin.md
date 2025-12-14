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

Spinning is **global across all sessions**. Gather ALL fibers since last push from all concurrent sessions.

```bash
# Find ALL fibers (from any session)
git log --grep="^session:" --format="%H" origin/main..HEAD
```

**Why global:** When one session triggers push, all concurrent sessions' fibers get spun together into unified clean history.

**Output:** List of fiber commits with their session IDs and metadata.

---

## Step 2: Generate Spin Plan

Generate a plan by grouping fibers into threads based on logical boundaries.

**Grouping criteria:**
- Same feature or functionality
- Implementation + immediate bug fixes
- Related files (source + tests + types)
- Fix-ups (typos, missing imports)

**Keep separate:**
- Different features
- Refactoring vs new features
- Config/dependency changes vs application code

**Present the plan and ask:**

- "Should any threads be split or merged differently?"
- "Ready to proceed with rebase?"

**Wait for explicit approval before continuing.**

**Output:** Plan mapping fibers → threads with proposed commit messages.

---

## Step 3: Save Recovery Point

Before any destructive operation, save current state.

```bash
echo "$(git rev-parse HEAD) $(date -Iseconds) pre-spin" >> .ai-git/recovery
```

**Why:** Enables `/recover` if anything goes wrong during rebase.

**Note:** This is different from failsafe (Step 6), which preserves verified work mid-spin.

---

## Step 4: Execute Rebase

Rewrite git history according to the spin plan.

```bash
git rebase -i origin/main
```

**For each thread group:**
1. `pick` the first fiber in the group
2. `fixup` all subsequent fibers in the group
3. `reword` to set the final thread commit message

**On failure:** If rebase fails mid-way, run `git rebase --abort` and offer `/recover`.

---

## Step 5: QA Verification (Sequential)

Run QA checks on each thread **sequentially**. This enables failsafe to preserve verified work.

**QA checks:** Run build + tests + lints for each thread commit.

```
[A] → QA pass → lock in
[B] → QA pass → lock in
[C] → QA fail → trigger failsafe (Step 6)
```

Skip with `--no-qa` (not recommended).

**On all pass:** Proceed to Step 7 (Report Results).
**On any failure:** Proceed to Step 6 (Failsafe) unless `--no-failsafe`.

---

## Step 6: Failsafe Recovery

When QA fails, preserve verified threads and retry remaining fibers with fewer threads.

**Algorithm:**
1. Keep all verified threads locked in
2. Take remaining fibers that failed
3. Re-spin into N-1 threads (fewer, larger threads often fix dependency issues)
4. QA the new threads
5. If still failing, recurse: try N-2, N-3... down to 1 thread
6. If single thread fails, preserve raw fibers and report

**Example flow:**
```
Original: 5 threads → A✓ B✓ C✗
Retry 1:  2 threads from remaining → C'✓ D'✓
Result:   4 verified threads [A, B, C', D']
```

**Final fallback:** If even 1 thread fails, preserve fibers as-is:
```
Result: [A]─[B]─[f13]─[f14]─...─[f30]
        └─verified─┘  └─fibers preserved─┘
```

---

## Step 7: Report Results

Show clear summary with next steps.

**Full success:**
```
✓ Spin complete
  20 fibers → 10 threads
  All threads verified. Ready to push.
```

**Partial success (failsafe activated):**
```
⚠ Spin partially complete
  20 fibers → 7 threads + 6 unspun

  Options:
  1. Push verified threads now, fix issues, spin rest later
  2. /recover to restore all fibers
  3. Review unspun fibers manually
```

**Total failure:**
```
✗ Spin failed - could not verify any threads
  All 20 fibers preserved.
  Suggestions: check dependencies, /recover --list
```

---

## Step 8: Log Session

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
  "verified_threads": [
    {
      "title": "feat(auth): add JWT middleware",
      "sha": "def456",
      "from_sessions": ["ses_7x9k2m"],
      "consumed": ["f1", "f2", "f5", "f7", "f12", "f15"],
      "qa_status": "pass"
    }
  ],
  "unspun_fibers": ["f19", "f20", "f21"],
  "failsafe": {
    "activated": true,
    "original_target": 5,
    "current_target": 2,
    "attempts": [
      {"target": 3, "failed_at": "thread 3", "error": "build failed"}
    ]
  }
}
```

---

## On Failure

- **Never leave repo in broken state**
- If mid-rebase: `git rebase --abort`
- Always offer `/recover` command
- Explain what went wrong clearly
- Suggest concrete next steps
