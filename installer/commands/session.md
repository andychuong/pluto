# /session — Manage Work Sessions

Manage AI work sessions for tracking and consolidating micro-commits.

## Usage

```
/session start [name]      Start a new session
/session end               End current session  
/session status            Show current session info
/session list              List recent sessions
/session log               Show session narrative log
```

## Behavior

### /session start [name]

1. Generate session ID: `ses_` + 8 random alphanumeric characters
2. Record the current HEAD commit as the session base
3. Write session ID to `.ai-git/current-session`
4. Append session record to `.ai-git/sessions.json`
5. If no name provided, derive from conversation context

**Run these commands:**
```bash
# Generate session ID
SESSION_ID="ses_$(head /dev/urandom | tr -dc 'a-z0-9' | head -c 8)"

# Create .ai-git directory if needed
mkdir -p .ai-git

# Save current session
echo "$SESSION_ID" > .ai-git/current-session

# Record base commit
BASE_COMMIT=$(git rev-parse HEAD)
```

**Initialize session log file:**
```bash
# Create log file with header
cat > .ai-git/session-log.md << EOF
# Session Log

## Session: $SESSION_ID
- **Name**: <name>
- **Started**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Base Commit**: $BASE_COMMIT

---
EOF
```

**Output to user:**
```
✓ Started session <session_id>
  Name: <name or derived>
  Base: <short sha>
  Log: .ai-git/session-log.md

  Mode: Use /micro for all commits during this session
```

**CRITICAL**: While this session is active, you MUST use `/micro` instead of regular git commits for ALL file changes. This ensures:
- Every change is tracked with the session ID
- Commits are logged to the session narrative
- Changes can be consolidated later with `/consolidate`

### /session end

1. Read current session from `.ai-git/current-session`
2. Count micro-commits since session base
3. Update session status to "ended" in `.ai-git/sessions.json`
4. Clear `.ai-git/current-session`
5. Show summary and prompt for consolidation

**Run these commands:**
```bash
SESSION_ID=$(cat .ai-git/current-session 2>/dev/null)
# Count commits since base (parse from sessions.json)
```

**Output to user:**
```
✓ Session <session_id> ended
  Micro-commits: <count>
  Files changed: <count>

Ready to consolidate? I can run /consolidate-plan to show you the proposed commit structure.
```

### /session status

1. Read current session from `.ai-git/current-session`
2. If no session, report none active
3. Count micro-commits and files changed
4. Show recent micro-commit summaries

**Output if active:**
```
Current Session: <session_id> (<name>)
  Started: <time> (<duration> ago)
  Base: <sha>
  Micro-commits: <count>
  Files touched: <count>
  
  Recent:
    • <type>(<scope>): <message>
    • <type>(<scope>): <message>
    • <type>(<scope>): <message>
```

**Output if no session:**
```
No active session.

Start one with /session start <name> or I'll start one automatically when we begin making changes.
```

### /session list

1. Read `.ai-git/sessions.json`
2. Show recent sessions with status

**Output:**
```
Recent Sessions:

1. <id> (<name>) [ACTIVE]
   Started <time>, <count> micro-commits

2. <id> (<name>) [CONSOLIDATED]  
   <date>, <micro> → <consolidated> commits

3. <id> (<name>) [ENDED]
   <date>, <count> micro-commits, not consolidated
```

### /session log

Display the complete session narrative from `.ai-git/session-log.md`.

1. Read `.ai-git/session-log.md`
2. Display the full log showing prompts and commits interleaved

**Output:**
```
[Contents of .ai-git/session-log.md displayed as markdown]
```

If no active session or log file doesn't exist:
```
No session log found.

Start a session with /session start <name> to begin logging.
```

## Session States

- **ACTIVE** — In progress, receiving micro-commits
- **ENDED** — Finished but not consolidated
- **CONSOLIDATED** — History rewritten to clean commits
- **PUSHED** — Consolidated and pushed to remote

## Prompt Logging

**IMPORTANT**: After receiving ANY user prompt during an active session, immediately append a Prompt Entry to `.ai-git/session-log.md` BEFORE doing any work.

### Prompt Entry Format

```bash
cat >> .ai-git/session-log.md << 'EOF'

## Prompt Entry
- **Timestamp**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Prompt**: [the complete, verbatim user prompt]

---
EOF
```

This ensures every user request is logged in the session narrative.

## File Formats

### .ai-git/current-session
```
ses_7x9k2m
```

### .ai-git/sessions.json
```json
{
  "sessions": [
    {
      "id": "ses_7x9k2m",
      "name": "auth-feature", 
      "status": "active",
      "started_at": "2024-01-15T10:30:00Z",
      "ended_at": null,
      "base_commit": "abc123d"
    }
  ]
}
```

### .ai-git/session-log.md

Complete narrative log with prompts and commits interleaved:

```markdown
# Session Log

## Session: ses_7x9k2m
- **Name**: auth-feature
- **Started**: 2024-01-15 10:30:00 UTC
- **Base Commit**: abc123d

---

## Prompt Entry
- **Timestamp**: 2024-01-15 10:30:15 UTC
- **Prompt**: Add user authentication with JWT

---

## Commit Entry
- **Timestamp**: 2024-01-15 10:32:45 UTC
- **File Changed**: src/middleware/auth.ts
- **Type**: feat(auth)
- **Description**: add JWT validation middleware
- **Reason**: created middleware to validate JWT tokens
- **Commit Hash**: a1b2c3d

---

## Prompt Entry
- **Timestamp**: 2024-01-15 10:35:00 UTC
- **Prompt**: Add password hashing

---

## Commit Entry
- **Timestamp**: 2024-01-15 10:37:20 UTC
- **File Changed**: src/utils/hash.ts
- **Type**: feat(auth)
- **Description**: add bcrypt password hashing
- **Reason**: added utility for secure password hashing
- **Commit Hash**: e4f5g6h

---
```

## Important

- **While a session is active, ALWAYS use `/micro` for commits — never regular git commits**
- If no session exists when making changes, auto-start one
- Session ID must be included in every micro-commit
- Suggest consolidation when ending a session
- Log EVERY user prompt to `.ai-git/session-log.md` immediately upon receiving it
- The `/micro` command will append commit entries with hashes to the log
- Session log creates a readable narrative: prompts → commits → prompts → commits
