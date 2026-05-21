# pluto-spin — Execute Spin

Spin fibers into clean threads with automatic failsafe recovery.

## Usage

```
pluto-spin [--plan <file>] [--no-qa] [--no-failsafe] [--purge-file <path>] [--purge-pattern <regex>]
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

**Check for non-Pluto commits:**

After analyzing commits, count how many have Pluto metadata vs how many are "raw" commits (no `type:` metadata and not clean conventional commit threads).

If raw commits are found, inform the user:

```
Found X commits with Pluto metadata, Y without.
Consider pluto-rewrite if you need to clean up non-Pluto commits.
```

This is informational only - proceed with spinning the fibers regardless. Raw commits will be left as-is since spin only operates on fibers.

**Output:** List of fibers and conversation commits to process.

---

## Step 2: Proactive Secret & Sensitive File Scan

Before generating a spin plan, scan for secrets and sensitive data in the commits to be spun. This runs every time.

### 2a. Sensitive File Detection

Check whether any sensitive file paths appear in `origin/main..HEAD`:

```bash
SENSITIVE_PATTERNS=(
  "\.env$" "\.env\." "\.envrc$"
  "credentials\.json$" "secrets\.json$" "secrets\.ya?ml$"
  "\.pem$" "\.key$" "\.p12$" "\.pfx$"
  "id_rsa$" "id_ed25519$" "id_ecdsa$" "id_dsa$"
  "\.netrc$" "\.pgpass$"
  "service[-_]account.*\.json$"
  "kubeconfig$"
  "\.htpasswd$"
)

git log origin/main..HEAD --full-history --name-only --format=""
```

Flag any path matching these patterns.

### 2b. Secret Pattern Scanning

Scan diffs of all commits in `origin/main..HEAD` for high-confidence secret patterns:

```bash
git log origin/main..HEAD -p --unified=0
```

**High-confidence patterns (flag additions only — lines prefixed with `+`):**

| Type | Pattern |
|---|---|
| AWS Access Key | `AKIA[0-9A-Z]{16}` |
| AWS Secret | `(?i)aws_secret[_\s]*=\s*['"]?[A-Za-z0-9/+=]{40}` |
| GitHub token | `gh[ps]_[A-Za-z0-9]{36,}` |
| Slack token | `xox[baprs]-[0-9A-Za-z\-]+` |
| OpenAI key | `sk-[A-Za-z0-9]{32,}` |
| Anthropic key | `sk-ant-[A-Za-z0-9\-_]{32,}` |
| Private key block | `-----BEGIN [A-Z ]+ PRIVATE KEY-----` |
| Generic token assignment | `(?i)(token\|secret\|password\|api_key\|apikey\|passwd)\s*[=:]\s*['"]?[A-Za-z0-9\-_\.]{16,}` |
| JWT | `eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` |
| Connection string with credentials | `[a-z]+://[^:]+:[^@]+@` |

Deduplicate: if the same pattern matches across multiple commits, report it once with the earliest commit.

### 2c. Large Blob Detection

Flag files over **10 MB** introduced in `origin/main..HEAD`:

```bash
git rev-list origin/main..HEAD --objects | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ && $3 > 10485760 { print $3, $4 }'
```

### 2d. Report Findings

If nothing found:
```
✓ Secret scan: nothing found
```

If findings exist, report before proceeding:

```
⚠ Sensitive content detected in commits to be spun

Sensitive files:
  - .env (committed in abc1234, still tracked)

Secret patterns:
  - AWS Access Key (AKIA...) — first seen in abc1234: src/config.ts +3

Large files:
  - assets/dump.sql (45 MB) — committed in cde3456

Would you like to purge these before spinning?

1. Purge all findings (recommended)
2. Select which to purge
3. Skip purge and continue with spin
4. Abort

Choose [1/2/3/4]:
```

**Option 1 (Purge all):** Collect all flagged paths and patterns, proceed to Step 2e.

**Option 2 (Select):** Show each finding individually and ask y/n. Collect confirmed targets, proceed to Step 2e.

**Option 3 (Skip):** Warn once and continue to Step 3.
```
Warning: proceeding without purge. Secrets remain in history.
If this repo is or will be public, rotate any exposed credentials immediately.
```

**Option 4 (Abort):** Exit cleanly.

### 2e. Purge Execution

**Before running any purge, save a recovery branch:**

```bash
RECOVERY_BRANCH="pluto-spin-backup-$(date +%Y%m%d-%H%M%S)"
git branch "${RECOVERY_BRANCH}"
```

Inform the user:
```
Recovery branch saved: pluto-spin-backup-20251214-143022
To restore: git reset --hard pluto-spin-backup-20251214-143022
```

Check that `git-filter-repo` is available:
```bash
git filter-repo --version
```

If not installed:
```
git-filter-repo is required for purging. Install it first:
  pip install git-filter-repo
  # or: brew install git-filter-repo

Then re-run pluto-spin.
```

**Purge files from history:**
```bash
git filter-repo --path <file> --invert-paths --force
```

**Redact secret patterns in-place:**
```bash
git filter-repo --replace-text <(echo "regex:<pattern>==>***REDACTED***") --force
```

Verify the flagged content is gone after each purge:
```bash
git log --all -p | grep -E "<original_pattern>"
```

If any match still found: report to user and do not continue.

Also add purged files to `.gitignore` and commit:
```bash
echo "<file>" >> .gitignore
git add .gitignore
git commit -m "chore: add purged files to .gitignore

type: work
reason: Prevent re-committing files removed from history by pluto-spin"
```

**Post-purge notice:**
```
✓ Purge complete. History has been rewritten locally.

IMPORTANT: A force push will be required to update the remote.
  All collaborators must re-clone after you push — their local history is now diverged.
  Notify your team before pushing.

Continuing with spin...
```

---

## Step 3: Generate Spin Plan

Generate a plan by grouping fibers into threads based on logical boundaries.

**Use conversation commits for context:**
Read conversation commits to understand decisions, clarifications, and context. Use this to:
- Inform how fibers should be grouped
- Write better thread commit messages that capture the "why"
- Understand relationships between fibers

**Core rule:** one thread = one feature. Within a feature, bundle everything that belongs to it: **implementation + fix-ups + tests + feature-local types + imports**. Across features, always split — never merge two features into one thread no matter how adjacent the code is.

**What counts as "one feature":** a single user-facing capability, bug fix, or behavior change. Ask: "Could a reviewer describe this thread in one sentence without using the word 'and'?" If no, it's probably two features.

**Bundle into one thread (within a single feature):**
- Fiber(s) implementing the feature
- Immediate fix-ups (typos, missing imports, forgotten exports)
- Tests for that feature
- Types/interfaces local to that feature
- Import wiring needed to make it work

**Always split into separate threads:**
- Different features (even if touching adjacent files or the same file)
- Refactors that enabled a feature — the refactor stands on its own and should ship first
- Broadly-used type/interface changes that aren't specific to one feature
- Config, dependency, or build changes (always alone — they affect everyone)
- Unrelated bug fixes that happened to land in the same session

**Anti-pattern:** Grouping by "user task" or "session." A single user request often spans multiple features. Use feature boundaries, not request boundaries.

**Anti-pattern:** Merging fibers just because they touched the same file. Two unrelated changes to `auth.ts` are still two threads.

**Use conversation commits** to identify feature boundaries — they often signal where one feature ends and the next begins.

**Present the plan and get user confirmation:**

1. Show the proposed plan with thread groupings and commit messages
2. Ask: "Does this grouping look correct? Would you like to adjust any threads?"
3. **Wait for explicit user approval** before proceeding to QA

Do not proceed to QA until the user confirms the plan.

**Output:** Confirmed plan mapping fibers → threads with proposed commit messages.

---

## Step 4: QA Validation

**Validate the plan before rewriting history.** Call the qa-orchestrator with the proposed plan.

The **qa-orchestrator** (see the `qa-orchestrator` skill) handles the mechanics.

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

**On all pass:** Proceed to Step 5 (Save Recovery Point).
**On any failure:** Proceed to Step 4a (Adjust Plan).

---

## Step 4a: Adjust Plan (if QA fails)

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

## Step 5: Save Recovery Point

Before any destructive operation, save current state.

```bash
TIMESTAMP=$(date -Iseconds)
REV=$(git rev-parse HEAD)

echo "${REV} ${TIMESTAMP} pre-spin" >> .ai-git/recovery
```

**Why:** Enables pluto-recover if anything goes wrong during rebase.

---

## Step 6: Execute Rebase

**Only reached after QA passes.** Rewrite git history according to the validated spin plan.

**Before rebase, confirm the working plan with the user:**

1. Present the final (working) plan
2. If the plan was adjusted during QA (Step 4a), explicitly show the differences:
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

**On failure:** If rebase fails mid-way, run `git rebase --abort` and offer pluto-recover.

---

## Step 7: Report Results

Show clear summary with next steps.

**Full success:**
```
✓ Spin complete
  20 fibers → 10 threads
  [If purged] Sensitive content removed from history — force push required
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

### Purge (if ran)
[File paths and pattern types purged — not the secret values themselves]

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
  "purge_ran": true,
  "recovery_branch": "pluto-spin-backup-20251214-143022",
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

## Flags

| Flag | Behavior |
|---|---|
| `--plan <file>` | Use a pre-generated spin plan file |
| `--no-qa` | Skip QA validation (not recommended) |
| `--no-failsafe` | Skip recovery point creation (not recommended) |
| `--purge-file <path>` | Force-purge a specific file path from history (skips interactive prompt) |
| `--purge-pattern <regex>` | Force-purge a specific secret pattern from history (skips interactive prompt) |

`--purge-file` and `--purge-pattern` can be specified multiple times.

---

## On Failure

- **Never leave repo in broken state**
- If mid-rebase: `git rebase --abort`
- Always offer pluto-recover command
- If purge already ran and spin fails: recovery branch created in Step 2e is still valid
- Explain what went wrong clearly
- Suggest concrete next steps
