# /micro - Create Micro-Commit

Create a micro-commit for the current changes. **Run this after every file modification.**

## Core Principle

Since `/micro` runs after each file change, **each commit should contain exactly one file**. The `/consolidate` command will intelligently combine related micro-commits later.

## Usage
```
/micro [reason for this change]
```

## Behavior

1. Run `git status` and `git diff` to verify changes
2. Stage the single changed file explicitly: `git add <file>`
3. Commit with intent-focused message and session metadata

## Commit Message Format
```
<intent — why this change matters>

session: $SESSION_ID
prompt: <current user prompt/task>
touched: <file changed>
```

The first line should explain the **intent** or **purpose** — not describe what's obvious from the diff.

## Writing Intent-Focused Messages

The intent line should be **descriptive enough to stand alone** — someone reading just the commit log should understand what problem was solved or what capability was added. Aim for a complete thought in 50-72 characters.

**Ask yourself:** "What does this enable?" or "What problem does this solve?"

❌ **Bad — describes the obvious:**
```
create LoginPage.tsx
```

❌ **Bad — conventional commit noise:**
```
feat(auth): add login page component
```

❌ **Bad — too vague:**
```
fix bug
```

✅ **Good — explains the capability:**
```
allow users to authenticate with email/password credentials
```

✅ **Good — states the measurable improvement:**
```
reduce GitHub API calls from 101 to 1 using GraphQL batch query
```

✅ **Good — describes the user-facing change:**
```
display commit score distribution as interactive histogram
```

✅ **Good — captures the fix context:**
```
prevent rate limit errors by queueing requests with backoff
```

The file path is already in `touched:` — don't repeat it. The diff shows what changed — explain *why* and *what it enables*.

## Example Workflow

After creating `src/components/LoginPage.tsx`:

```bash
git add src/components/LoginPage.tsx
git commit -m "allow users to authenticate with email/password

session: ses_7x9k2m
prompt: add user authentication
touched: src/components/LoginPage.tsx"
```

After creating `src/components/LoginPage.module.css`:

```bash
git add src/components/LoginPage.module.css
git commit -m "make login form responsive on mobile

session: ses_7x9k2m
prompt: add user authentication
touched: src/components/LoginPage.module.css"
```

After fixing a bug in `src/api/client.ts`:

```bash
git add src/api/client.ts
git commit -m "fix rate limiting by batching requests

session: ses_7x9k2m
prompt: fix GitHub API rate limit errors
touched: src/api/client.ts"
```

## Cross-Session Awareness

Multiple AI sessions may work concurrently. Before committing, you can check
if another session recently modified the same file:

```bash
git log -1 --format="%b" -- <file> | grep "^session:"
```

This is informational — proceed with your commit. The consolidation agent
will untangle cross-session changes later using diffs and session IDs.

## Important

- **One file per commit** — `/micro` runs after each file change
- **Intent-focused messages** — explain why and what it enables
- Always include session ID for later consolidation
- Keep the first line 50-72 chars (descriptive but concise)
- Verify changes with `git status` / `git diff` before staging
