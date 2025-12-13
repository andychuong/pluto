# /micro - Create Micro-Commit

Create a micro-commit for the current changes. Run this after every file modification.

## Usage
```
/micro [reason for this change]
```

## Behavior

1. Log every change and prompt
2. Verify changes before staging
3. Stage the relevant file (prefer explicit over `git add -A`)
4. Generate a micro-commit with full metadata
5. Use the conventional commit format with session tracking
6. Append commit entry to `.ai-git/session-log.md` with commit hash


## Before Committing

Always verify what you're about to commit:
```bash
# See what's changed
git status

# Review the actual changes
git diff                 # unstaged changes
git diff --staged        # if already staged
```

Ensure only intended files are included. Prefer explicit staging:
```bash
git add src/auth/middleware.ts src/types/auth.ts
```

Over blanket staging:
```bash
git add -A  # Use sparingly — may include unintended files
```

## Commit Message Format
```
<type>(<scope>): <concise description>

session: $SESSION_ID
prompt: <current user prompt/task>
reason: <specific reason for this file change>
touched: <files changed>
```

## Type Inference

- Adding new file → `feat` or `test`
- Modifying existing → `feat`, `fix`, `refactor` based on intent
- Config/tooling → `chore`
- Documentation → `docs`

## Logging Requirements

### Every File Change MUST Be Logged

After **every single file modification**, you MUST:
1. Create a micro-commit
2. Append to `.ai-git/session-log.md`

No exceptions. Even for:
- Small typo fixes
- Single-line changes
- Config updates
- Documentation edits

### Every Prompt MUST Be Logged

At the start of **every user prompt**, log it to `.ai-git/session-log.md`:
```bash
cat >> .ai-git/session-log.md << EOF

## Prompt Received
- **Timestamp**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Prompt**: <full user prompt text>

---
EOF
```

## Example Workflow

User sends prompt: "add authentication to api"

**Step 1: Log the prompt immediately**
```bash
cat >> .ai-git/session-log.md << EOF

## Prompt Received
- **Timestamp**: 2024-01-15 10:30:00 UTC
- **Prompt**: add authentication to api

---
EOF
```

**Step 2: Make file changes**

**Step 3: After EACH file modification, commit and log**

For `src/middleware/auth.ts`:
```bash
git add src/middleware/auth.ts
git commit -m "feat(auth): add middleware

session: ses_7x9k2m
prompt: add authentication to api
reason: created auth middleware
touched: src/middleware/auth.ts"

COMMIT_HASH=$(git rev-parse HEAD)
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | tr '\n' ', ' | sed 's/,$//')

cat >> .ai-git/session-log.md << EOF

## Commit Entry
- **Timestamp**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Prompt**: add authentication to api
- **File Changed**: $FILES_CHANGED
- **Type**: feat(auth)
- **Description**: add middleware
- **Reason**: created auth middleware
- **Commit Hash**: ${COMMIT_HASH:0:7}

---
EOF
```

For `src/types/auth.ts`:
```bash
git add src/types/auth.ts
git commit -m "feat(auth): add auth types

session: ses_7x9k2m
prompt: add authentication to api
reason: added type definitions
touched: src/types/auth.ts"

COMMIT_HASH=$(git rev-parse HEAD)
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | tr '\n' ', ' | sed 's/,$//')

cat >> .ai-git/session-log.md << EOF

## Commit Entry
- **Timestamp**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Prompt**: add authentication to api
- **File Changed**: $FILES_CHANGED
- **Type**: feat(auth)
- **Description**: add auth types
- **Reason**: added type definitions
- **Commit Hash**: ${COMMIT_HASH:0:7}

---
EOF
```

## Session Log Entry Format

### Prompt Entry
```markdown
## Prompt Received
- **Timestamp**: 2024-01-15 10:30:00 UTC
- **Prompt**: add authentication to api

---
```

### Commit Entry
```markdown
## Commit Entry
- **Timestamp**: 2024-01-15 10:32:45 UTC
- **Prompt**: add authentication to api
- **File Changed**: src/middleware/auth.ts
- **Type**: feat(auth)
- **Description**: add validation function
- **Reason**: added validation function for JWT tokens
- **Commit Hash**: a1b2c3d

---
```

## What Counts as One Micro-Commit

One **logical change** = one micro-commit. This may include multiple files if:
- They're part of the same atomic operation (type + implementation)
- They're meaningless without each other (function + import)
- They were changed together for the same reason

But always create separate micro-commits for:
- A feature + an unrelated fix you noticed
- Implementation + a later bug fix to it
- Changes serving different user requests

## Cross-Session Awareness

Multiple AI sessions may work concurrently. Before committing, you can check
if another session recently modified the same file:
```bash
git log -1 --format="%b" -- <file> | grep "^session:"
```

This is informational — proceed with your commit. The consolidation agent
will untangle cross-session changes later using diffs and session IDs.

## Important

- **NEVER skip logging**: Every prompt and every file change MUST be logged
- One logical change per commit (may span multiple files)
- Always include session ID for later consolidation
- Keep the short description under 50 chars
- Verify changes with `git status` / `git diff` before staging
- Log prompts IMMEDIATELY when received
- Log commits IMMEDIATELY after creation
- Include the original user prompt in both the commit message and session log
- If no active session exists, auto-start one with `/session start`
- The session log is your audit trail - completeness is critical