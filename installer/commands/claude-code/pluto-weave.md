# /pluto-weave — Intelligent Merge with AI-Driven Decisions

Weave remote changes into local threads with Claude as the decision-maker.

## Usage

```
/pluto-weave [--target <branch>] [--no-qa]
```

**Default target:** `origin/main`

---

## Architecture: Inline Agent + QA Agent

**Why isolate the work?** Weaving involves heavy context:
- Reading commit history from both branches
- Analyzing each conflicted file
- Understanding codebase patterns for consistency decisions
- Documenting reasoning for each resolution

### Agent Structure

- **Conflict resolution**: Runs as an **inline agent** (spawned within this command's execution, not a separate agent file). The decision framework below guides its behavior.
- **QA validation**: Calls the **weave-qa-agent** (`installer/agents/weave-qa-agent.md`) - a defined agent that validates the merged state.

### Workflow

1. **Main conversation** invokes `/pluto-weave`
2. **Inline agent executes** with focused context:
   - Target branch to merge
   - Decision framework (from this doc)
   - Current branch state
3. **Inline agent works through:**
   - Gathers context (Step 1)
   - Executes merge (Step 4)
   - Resolves conflicts using decision framework (Step 5)
   - Calls weave-qa-agent for validation (Step 6)
   - Commits (Step 7)
4. **Returns summary:**
   - What was merged
   - Decisions made with brief reasoning
   - Any escalations requiring human input
5. **Handle escalations:**
   - Present escalations to user
   - Collect decisions
   - Resume with answers if needed
6. **Report results** to user (Step 8)

### Escalation Handling

The inline agent should:
- Auto-resolve everything it confidently can
- Collect all escalations (don't stop at first one)
- Return escalations as a batch for user decisions
- Be resumable with user's answers to continue

---

## Philosophy

**You (Claude) are the decision-maker.** Take on the cognitive load of:
- Analyzing what remote changes accomplish
- Understanding what local threads accomplish
- Resolving conflicts by choosing the **best code for the codebase**
- Documenting every decision so humans understand "why"

The goal is to produce the best quality code possible. You have the context from both sides—use it to make informed decisions.

### When to Decide vs. Escalate

**You should decide (and document why) when:**
- One approach is clearly better (error handling, patterns, maintainability)
- Changes are additive and can be merged together
- One side fixes something the other side doesn't address
- The codebase has established patterns that favor one approach
- The decision is technical, not architectural

**Only escalate to humans when:**
- Architectural decisions with long-term implications (auth strategy, database choice)
- Business logic that requires domain knowledge you lack
- Conflicting requirements where intent is genuinely ambiguous
- The decision affects system design in ways you can't fully assess

**When you escalate, provide:**
1. Clear explanation of the conflict
2. Why you can't decide (what's ambiguous or requires domain knowledge)
3. What specific question the human needs to answer
4. Your recommendation if you have one, with caveats

---

## Terminology

- **Threads**: Clean, meaningful commits from `/pluto-spin` (local work)
- **Weave**: Merging remote changes with local threads
- **Fabric**: The target branch where all work integrates

---

## Step 1: Gather Complete Context

Before making ANY decisions, gather full context from both sides.

### 1a. Local Context (Your Threads)

Threads from `/pluto-spin` contain rich metadata:
- What functionality was added/changed
- The intent behind each change (from fiber `prompt:` and `reason:`)
- Conversation context explaining "why" decisions were made

```bash
git fetch origin
TARGET=${TARGET:-origin/main}

# Get local threads since divergence
git log ${TARGET}..HEAD --format="%H|%s" --reverse
```

For each local thread, extract:
- Commit message (the "what")
- Files changed: `git diff-tree --no-commit-id --name-only -r <hash>`
- Full body for Pluto metadata: `git log -1 --format="%b" <hash>`

### 1b. Remote Context

```bash
# Get remote commits we don't have
git log HEAD..${TARGET} --format="%H|%s" --reverse
```

For each remote commit, understand:
- What it accomplishes (commit message)
- Which files it touches
- Any PR description or detailed commit body

### 1c. Identify Potential Conflicts

```bash
# Files changed locally
LOCAL_FILES=$(git diff --name-only ${TARGET}...HEAD)

# Files changed on remote
REMOTE_FILES=$(git diff --name-only HEAD...${TARGET})

# Intersection = likely conflicts
```

**Output:** Complete understanding of what both sides are trying to accomplish before any merge attempt.

---

## Step 2: Pre-Flight Checks

```bash
# Uncommitted changes?
git status --porcelain

# Check for unspun fibers (commits with type: work metadata)
git log origin/main..HEAD --format="%H %s" | while read hash msg; do
  git log -1 --format="%b" $hash | grep -q "type: work" && echo $hash
done
```

- **Uncommitted changes?** → Fail: "Cannot weave with uncommitted changes. Commit or stash first."
- **Already up to date?** → Exit: "Already up to date with ${TARGET}. Nothing to weave."
- **Unspun fibers?** → Fail: "Unspun fibers detected. Run `/pluto-spin` first to consolidate fibers into threads before weaving."

---

## Step 3: Save Recovery Point

Before any destructive operation:

```bash
mkdir -p .ai-git
echo "$(git rev-parse HEAD) $(date -Iseconds) pre-weave" >> .ai-git/recovery
```

---

## Step 4: Execute Merge

```bash
git merge --no-commit --no-ff ${TARGET}
```

**If clean merge (no conflicts):** Skip to Step 6 (Validate).

**If conflicts:** Proceed to Step 5 (Resolve).

---

## Step 5: Resolve Conflicts (AI-Driven)

For each conflicted file, apply the decision framework.

### 5a. Identify Conflicts

```bash
CONFLICTS=$(git diff --name-only --diff-filter=U)
```

### 5b. For Each Conflict, Gather Context

```bash
# Our changes to this file
git log ${TARGET}..HEAD --format="%s%n%b" -- <file>

# Their changes to this file
git log HEAD..${TARGET} --format="%s%n%b" -- <file>
```

### 5c. Decision Framework

For each conflict, work through these questions:

**1. What is local trying to accomplish?**
- Reference the thread commit message
- Check for `intent:`, `prompt:`, `reason:` in Pluto metadata
- What user goal does this serve?

**2. What is remote trying to accomplish?**
- Read the remote commit message and body
- What feature/fix does this implement?
- What's the broader goal?

**3. Can both changes coexist?**
- Often conflicts are additive (both add different functions)
- Can you merge both, adjusting imports/exports for compatibility?
- Does combining them produce better code than either alone?

**4. If mutually exclusive, which is better?**
Ask yourself:
- Does one have better error handling?
- Is one more consistent with existing codebase patterns?
- Does one have better performance characteristics?
- Is one more maintainable/readable?
- Does one align better with the project's direction?

**5. Do I need human input?**
Only if:
- This is an architectural choice (e.g., JWT vs sessions, SQL vs NoSQL)
- I'm missing business/domain context I can't infer
- The requirements are genuinely ambiguous (both valid, neither clearly better)

### 5d. Resolution Actions

**Auto-Resolve (you decide):**

Make the decision and document it clearly:

```markdown
## Decision: <file-path>

**Conflict:** <brief description>
**Choice:** <local | remote | merged>
**Reasoning:** <why this produces better code>

<specific technical justification - patterns, error handling, consistency, etc.>
```

Then resolve and stage:
```bash
# Edit file to implement your decision
git add <file>
```

**Escalate to Human:**

When you genuinely can't decide:

```markdown
## Escalation: <file-path>

**Conflict:** <description of what conflicts>

**Local intent:** <what local is trying to do>
**Remote intent:** <what remote is trying to do>

**Why I can't decide:** <what's ambiguous or requires domain knowledge>

**Question for you:** <specific decision needed>

**My recommendation:** <if you have one, with caveats>
```

Then wait for human response before proceeding.

### 5e. Resolution Patterns

| Scenario | Strategy |
|----------|----------|
| Both add different functions | Merge both, fix imports |
| Same function, different implementation | Pick better one based on patterns/quality |
| Fix + Feature touching same code | Preserve fix, integrate feature around it |
| Refactor + New code | Apply refactor patterns to new code |
| Architectural conflict | **ESCALATE** - human decides direction |
| Business logic conflict | **ESCALATE** - requires domain knowledge |

### 5f. Verify Resolution Complete

```bash
# No conflict markers remain
git grep -n "<<<<<<< HEAD" && echo "MARKERS FOUND - INCOMPLETE" || echo "OK"

# Check for whitespace issues
git diff --check
```

---

## Step 6: Validate Merge

After all conflicts resolved, invoke the **weave-qa-agent** to validate the merged state.

```
Invoke: /weave-qa-agent.md

Context to pass:
- All changes are staged (merged state)
- Validation should cover: pre-checks, lint, build, test
- Return structured pass/fail results
```

**On validation failure:**
1. Identify which resolution caused the failure
2. Re-evaluate that decision with error context
3. Adjust resolution and re-validate
4. If stuck, escalate to human with failure context

Skip QA with `--no-qa` (not recommended).

---

## Step 7: Commit Merge

Once validated, commit with a clean, human-readable message:

```bash
git commit -m "Merge ${TARGET}: integrate local changes

Merged remote updates with local development work.

Conflicts resolved:
- <file-1>: <brief description of resolution>
- <file-2>: <brief description of resolution>

Decisions made:
- <file-1>: Chose <local/remote/merged> because <reasoning>
- <file-2>: Chose <local/remote/merged> because <reasoning>"
```

The commit message should:
- Be readable by any developer
- Explain what was merged and why
- Document conflict resolutions and reasoning
- Not include internal metadata or pluto-specific markers

---

## Step 8: Report Results

Notify the user of what was done:

```
Weave complete.

**Merged:** ${TARGET} into current branch
**Conflicts resolved:** X files
**Commit:** <hash>

**Summary of decisions:**
- <file-1>: Chose <choice> — <brief reasoning>
- <file-2>: Chose <choice> — <brief reasoning>

**Next steps:** Ready to push or continue development.

Would you like to clean up pluto artifacts (.ai-git/)? (yes/no)
```

---

## Step 9: Cleanup (User Approval Required)

**Only if user approves cleanup**, remove pluto artifacts:

```bash
# Remove pluto state files
rm -f .ai-git/state.json
rm -f .ai-git/recovery

# Remove pluto directory if empty
rmdir .ai-git 2>/dev/null || true
```

If user declines, preserve all artifacts for reference.

---

## On Failure

If the weave fails at any step, log the failure:

```bash
mkdir -p .ai-git
cat >> .ai-git/weave-failures.log << EOF
## Failed Weave: $(date -Iseconds)

**Target:** ${TARGET}
**Step Failed:** <step number and name>
**Error:** <error message or description>
**State:** <what was left in progress>
**Recovery:** <how to recover - abort command, recovery point, etc.>

EOF
```

Then:
- **Mid-merge failure:** `git merge --abort`
- **Recovery:** `/pluto-recover` command uses `.ai-git/recovery`
- **Never leave broken:** Always abort if can't complete cleanly
- **Preserve artifacts:** Do not clean up `.ai-git/` on failure

---

## Flags

| Flag | Behavior |
|------|----------|
| `--target <branch>` | Merge from specified branch (default: origin/main) |
| `--no-qa` | Skip QA validation |

---

## State Tracking

Progress saved to `.ai-git/state.json`:

```json
{
  "operation": "weave",
  "target": "origin/main",
  "status": "in_progress",
  "recovery_point": "abc123",
  "local_threads": [
    {"hash": "def456", "message": "feat(auth): add JWT middleware"}
  ],
  "remote_commits": [
    {"hash": "789ghi", "message": "feat(api): add rate limiting"}
  ],
  "conflicts": [
    {
      "file": "src/auth/handler.ts",
      "status": "resolved",
      "choice": "remote",
      "reasoning": "Consistent with codebase error handling patterns"
    },
    {
      "file": "src/config/auth.ts",
      "status": "escalated",
      "question": "JWT vs Session auth?",
      "human_decision": null
    }
  ]
}
```

---

## Key Principles

1. **You are the decision-maker** — Don't defer unnecessarily. Make the call.
2. **Document everything** — Every decision needs clear reasoning so humans understand "why"
3. **Escalate thoughtfully** — Only when you truly can't decide, not to avoid responsibility
4. **Best code wins** — The goal is quality, not preserving either side's ego
5. **Context is king** — Use thread metadata and commit messages to understand intent
6. **Never break the build** — Validate before committing
7. **Clean commits** — Commit messages are for humans, not tools
