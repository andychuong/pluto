# /micro - Create Micro-Commit

Create a micro-commit for the current changes. Run this after every file modification.

## Usage
```
/micro [reason for this change]
```

## Behavior

1. Verify changes before staging
2. Stage the relevant files (prefer explicit over `git add -A`)
3. Generate a micro-commit with full metadata
4. Use the conventional commit format with session tracking

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

- Never skip micro-commits
- One logical change per commit (may span multiple files)
- Always include session ID for later consolidation
- Keep the short description under 50 chars
- Verify changes with `git status` / `git diff` before staging