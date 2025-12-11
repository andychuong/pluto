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

## Important

- Never skip micro-commits
- One logical change per commit
- Always include session ID for later consolidation
- Keep the short description under 50 chars