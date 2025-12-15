# /pluto-rewrite - Full-Context History Rewrite

Intelligently rewrite commit history into clean threads using full context analysis.

## Usage

```
/pluto-rewrite [--no-qa] [--no-failsafe]
```

## Guiding Principle

Each thread should be a **meaningful checkpoint of working code**. Ask: "What can the user/system do now that it couldn't before?"

---

## Step 0: Handle Uncommitted Changes

```bash
git status --porcelain
```

**If uncommitted changes exist, auto-stash them:**

```bash
git stash push -u -m "pluto-rewrite: auto-stash $(date -Iseconds)"
```

Tell user: "Stashed uncommitted changes. Will restore after rewrite completes."

After successful rewrite, restore with `git stash pop`. If rewrite fails, tell user to run `git stash pop` manually.

---

## Step 1: Analyze Commit History

Read all commits from `origin/main..HEAD`:

```bash
git log origin/main..HEAD --format="%H|%s|%b"
git show <commit-hash>  # For each commit
```

**If no commits found:** Tell user "Nothing to rewrite" and exit.

**Gather context from:**
- Git diffs and file changes
- Pluto fiber metadata (type: work) if present
- Pluto conversation commits (type: prompt) if present
- Your current conversation context - recent discussion, decisions, user goals
- Your understanding of how the code fits together

---

## Step 2: Generate Thread Groupings

**Group commits by feature completeness:**
- Implementation + fixes + tests + types + imports = one thread
- Each thread enables something new the system couldn't do before
- Use your current conversation context heavily

**Keep separate:**
- Different features
- Refactoring vs new features
- Config changes vs application code

**Present plan:**

```
Proposed Rewrite Plan
Analyzed X commits

Thread 1: type(scope): description
  - hash1: commit msg (type)
  - hash2: commit msg (type)
  Files: list
  Rationale: why grouped

Thread 2: ...
```

Ask: "Does this grouping make sense?"

Wait for user approval before proceeding.

---

## Step 3: QA Validation

Call qa-orchestrator with the plan (see `installer/agents/qa-orchestrator.md`). Skip with `--no-qa`.

**On all pass:** Proceed to Step 4.
**On any failure:** Adjust groupings (merge failed threads with adjacent ones), retry QA. If single thread fails, report to user.

---

## Step 4: Save Recovery Point

```bash
echo "$(git rev-parse HEAD) $(date -Iseconds) pre-rewrite" >> .ai-git/recovery
```

Skip with `--no-failsafe` (not recommended).

---

## Step 5: Execute Rebase

If plan was adjusted during QA, show user what changed and ask: "Ready to proceed with rebase?"

Wait for approval, then:

```bash
git rebase -i origin/main
```

For each thread: `pick` first commit, `fixup` rest, `reword` to conventional format: `type(scope): description`

**On failure:** `git rebase --abort` and offer `/pluto-recover`.

---

## Step 6: Report Results

```
✓ Rewrite complete: X commits → Y threads
  [If QA adjusted] Plan adjusted, merged some groupings
  [If stashed] Restored uncommitted changes
  Ready to push.
```

Or on failure:

```
✗ Rewrite failed - QA could not pass
  All commits preserved. Fix issues manually and try again.
```

---

## Step 7: Log Session

Append to `.ai-git/pluto-log.md` with:
- Summary of what was rewritten
- Commit count analysis
- Thread groupings with rationale
- Any QA adjustments made

---

## On Failure

- Never leave repo in broken state
- If mid-rebase: `git rebase --abort`
- Always offer `/pluto-recover`
- Explain what went wrong
- Suggest next steps
