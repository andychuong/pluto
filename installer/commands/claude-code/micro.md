# /micro - Create Micro-Commit

Create a micro-commit for the current changes. Run this after every file modification.

## Usage
```
/micro [reason for this change]
```

## Behavior

1. Stage all current changes (or specific files if mentioned)
2. Generate a micro-commit with full metadata
3. Use the conventional commit format with session tracking
4. Append commit entry to `.ai-git/session-log.md` with commit hash

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

## Example

User: /micro added validation function

You should:
1. Run `git add -A` (or specific files)
2. Run `git commit` with message:
```
feat(auth): add validation function

session: ses_7x9k2m
prompt: add authentication to api
reason: added validation function
touched: src/middleware/auth.ts
```
3. Get the commit hash: `git rev-parse HEAD`
4. Append to session log (see Session Log Entry Format below)

## Session Log Entry Format

After creating the commit, append a Commit Entry to `.ai-git/session-log.md`:

```bash
# Get the commit hash
COMMIT_HASH=$(git rev-parse HEAD)

# Get the files changed
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | tr '\n' ', ' | sed 's/,$//')

# Append to log
cat >> .ai-git/session-log.md << EOF

## Commit Entry
- **Timestamp**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **File Changed**: $FILES_CHANGED
- **Type**: <type>(<scope>)
- **Description**: <commit message title>
- **Reason**: <reason provided by user or inferred>
- **Commit Hash**: ${COMMIT_HASH:0:7}

---
EOF
```

### Example Session Log Entry

```markdown
## Commit Entry
- **Timestamp**: 2024-01-15 10:32:45 UTC
- **File Changed**: src/middleware/auth.ts
- **Type**: feat(auth)
- **Description**: add validation function
- **Reason**: added validation function for JWT tokens
- **Commit Hash**: a1b2c3d

---
```

## Important

- Never skip micro-commits
- One logical change per commit
- Always include session ID for later consolidation
- Keep the short description under 50 chars
- ALWAYS append commit entry to `.ai-git/session-log.md` after committing
- If no active session exists, auto-start one with `/session start`


