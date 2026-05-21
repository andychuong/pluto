# pluto-rewrite - Full-Context History Rewrite

Intelligently rewrite commit history into clean threads using full context analysis.

## Usage

```
pluto-rewrite [--no-qa] [--no-failsafe] [--purge-file <path>] [--purge-pattern <regex>]
```

## Guiding Principle

Each thread should be a **meaningful checkpoint of working code**. Ask: "What can the user/system do now that it couldn't before?"

---

## Step 0: Handle Uncommitted Changes

```bash
git status --porcelain
```

**If uncommitted changes exist, ask user:**

```
You have uncommitted changes. What would you like to do?

1. Commit now - changes will be included in the rewrite
2. Stash - changes will be restored after rewrite
3. Abort - handle manually

Choose [1/2/3]:
```

**Option 1 (Commit):**
```bash
git add -A
git commit -m "WIP: uncommitted changes

type: work
timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
reason: Uncommitted changes before rewrite"
```

**Option 2 (Stash):**
```bash
git stash push -u -m "pluto-rewrite: auto-stash $(date -Iseconds)"
```
After successful rewrite, restore with `git stash pop`.

**Option 3 (Abort):**
Exit and let user handle manually.

---

## Step 1: Proactive Secret & Sensitive File Scan

Before touching any history, scan for secrets and sensitive data. This runs every time — no flag required.

### 1a. Sensitive File Detection

Check whether any sensitive file paths appear anywhere in the commit history (`origin/main..HEAD` and the full reachable tree):

```bash
# Sensitive filenames to flag
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

git log --all --full-history --name-only --format="" | sort -u
```

Flag any file path matching the patterns above that appears in history.

Also flag files currently tracked by git that match:
```bash
git ls-files | grep -E "<pattern>"
```

### 1b. Secret Pattern Scanning

Scan the diff of all commits in `origin/main..HEAD` for high-confidence secret patterns. Use `git log -p` piped through pattern matching:

```bash
git log origin/main..HEAD -p --unified=0
```

**High-confidence patterns to match (flag these, skip ambiguous hits):**

| Type | Pattern |
|---|---|
| AWS Access Key | `AKIA[0-9A-Z]{16}` |
| AWS Secret | `(?i)aws_secret[_\s]*=\s*['"]?[A-Za-z0-9/+=]{40}` |
| GitHub token | `gh[ps]_[A-Za-z0-9]{36,}` |
| Slack token | `xox[baprs]-[0-9A-Za-z\-]+` |
| OpenAI key | `sk-[A-Za-z0-9]{32,}` |
| Anthropic key | `sk-ant-[A-Za-z0-9\-_]{32,}` |
| Private key block | `-----BEGIN [A-Z ]+ PRIVATE KEY-----` |
| Generic token in assignment | `(?i)(token\|secret\|password\|api_key\|apikey\|passwd)\s*[=:]\s*['"]?[A-Za-z0-9\-_\.]{16,}` |
| JWT | `eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` |
| Connection string with credentials | `[a-z]+://[^:]+:[^@]+@` |

Only flag lines that are additions (`+` prefix in diff), not removals.

Deduplicate: if the same pattern matches in multiple commits, report it once with the earliest commit.

### 1c. Large Blob Detection

Flag files over **10 MB** that appear in history:

```bash
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ && $3 > 10485760 { print $3, $4 }'
```

### 1d. Report Findings

If nothing is found:
```
✓ Secret scan: nothing found — no sensitive files, secrets, or large blobs detected
```

If findings exist, present them before doing anything else:

```
⚠ Sensitive content detected in git history

Sensitive files:
  - .env (committed in abc1234, still tracked)
  - config/credentials.json (committed in def5678, removed in fgh9012)

Secret patterns:
  - AWS Access Key (AKIA...) — first seen in abc1234: src/config.ts +3
  - Generic token assignment — first seen in bcd2345: .env +1

Large files:
  - assets/dump.sql (45 MB) — committed in cde3456

Would you like to purge these before rewriting?

1. Purge all findings (recommended)
2. Select which to purge
3. Skip purge and continue with rewrite
4. Abort

Choose [1/2/3/4]:
```

**Option 1 (Purge all):** Collect all flagged file paths and patterns, proceed to Step 1e.

**Option 2 (Select):** Show each finding individually and ask y/n. Collect confirmed targets, proceed to Step 1e.

**Option 3 (Skip):** Warn once, then continue to Step 2.

```
Warning: proceeding without purge. Secrets remain in history.
If this repo is or will be public, rotate any exposed credentials immediately.
```

**Option 4 (Abort):** Exit cleanly.

### 1e. Purge Execution

**Before running any purge, save a recovery branch:**

```bash
RECOVERY_BRANCH="pluto-rewrite-backup-$(date +%Y%m%d-%H%M%S)"
git branch "${RECOVERY_BRANCH}"
echo "Recovery branch created: ${RECOVERY_BRANCH}"
echo "To restore: git reset --hard ${RECOVERY_BRANCH}"
```

Inform the user:
```
Recovery branch saved: pluto-rewrite-backup-20251214-143022
If anything goes wrong, run: git reset --hard pluto-rewrite-backup-20251214-143022
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

Then re-run pluto-rewrite.
```

**Purge files from history:**
```bash
# For each flagged file path
git filter-repo --path <file> --invert-paths --force
```

**Purge secret patterns (replace matched strings with `***REDACTED***`):**
```bash
# For each pattern
git filter-repo --replace-text <(echo "regex:<pattern>==>***REDACTED***") --force
```

After purge, verify the flagged content is gone:
```bash
git log --all -p | grep -E "<original_pattern>"
```

If any match still found: report to user and do not continue.

**Post-purge notice:**
```
✓ Purge complete. History has been rewritten locally.

IMPORTANT: A force push will be required to update the remote.
  All collaborators must re-clone after you push — their local history is now diverged.
  Notify your team before pushing.

Continuing with rewrite...
```

Also add the flagged files to `.gitignore` if not already present, and stage the change:
```bash
echo "<file>" >> .gitignore
git add .gitignore
git commit -m "chore: add purged files to .gitignore

type: work
reason: Prevent re-committing files removed from history by pluto-rewrite"
```

---

## Step 2: Analyze Commit History

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

## Step 3: Generate Thread Groupings

**Core rule:** one thread = one feature. Within a feature, bundle everything that belongs to it: **implementation + fix-ups + tests + feature-local types + imports**. Across features, always split — never merge two features into one thread no matter how adjacent the code is.

**What counts as "one feature":** a single user-facing capability, bug fix, or behavior change. Ask: "Could a reviewer describe this thread in one sentence without using the word 'and'?" If no, it's probably two features.

**Bundle into one thread (within a single feature):**
- The implementation commits
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

**Use your current conversation context** to identify the feature boundaries. Commits that landed together aren't necessarily one feature.

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

## Step 4: QA Validation

Call qa-orchestrator with the plan (see the `qa-orchestrator` skill). Skip with `--no-qa`.

**On all pass:** Proceed to Step 5.
**On any failure:** Adjust groupings (merge failed threads with adjacent ones), retry QA. If single thread fails, report to user.

---

## Step 5: Save Recovery Point

```bash
echo "$(git rev-parse HEAD) $(date -Iseconds) pre-rewrite" >> .ai-git/recovery
```

Skip with `--no-failsafe` (not recommended).

---

## Step 6: Execute Rebase

If plan was adjusted during QA, show user what changed and ask: "Ready to proceed with rebase?"

Wait for approval, then:

```bash
git rebase -i origin/main
```

For each thread: `pick` first commit, `fixup` rest, `reword` to conventional format: `type(scope): description`

**On failure:** `git rebase --abort` and offer pluto-recover.

---

## Step 7: Report Results

```
✓ Rewrite complete: X commits → Y threads
  [If purged] Sensitive content removed from history — force push required
  [If QA adjusted] Plan adjusted, merged some groupings
  [If stashed] Restored uncommitted changes
  Ready to push. Run pluto-weave to merge in any remote changes first.
```

Or on failure:

```
✗ Rewrite failed - QA could not pass
  All commits preserved. Fix issues manually and try again.
```

---

## Step 8: Log Session

Append to `.ai-git/pluto-log.md` with:
- Summary of what was rewritten
- Commit count analysis
- Thread groupings with rationale
- Any QA adjustments made
- If purge ran: what was purged (file paths and pattern types, not the secret values themselves)

---

## Flags

| Flag | Behavior |
|---|---|
| `--no-qa` | Skip QA validation (not recommended) |
| `--no-failsafe` | Skip recovery point creation (not recommended) |
| `--purge-file <path>` | Force-purge a specific file path from history (skips interactive prompt for that file) |
| `--purge-pattern <regex>` | Force-purge a specific secret pattern from history (skips interactive prompt for that pattern) |

`--purge-file` and `--purge-pattern` can be specified multiple times.

---

## On Failure

- Never leave repo in broken state
- If mid-rebase: `git rebase --abort`
- Always offer pluto-recover
- If purge already ran and rewrite fails: recovery branch created in Step 1e is still valid
- Explain what went wrong
- Suggest next steps
