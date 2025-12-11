# /session — Manage Work Sessions

Manage AI work sessions for tracking and consolidating micro-commits.

## Usage

```
/session start [name]      Start a new session
/session end               End current session  
/session status            Show current session info
/session list              List recent sessions
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

**Output to user:**
```
✓ Started session <session_id>
  Name: <name or derived>
  Base: <short sha>
```

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

## Session States

- **ACTIVE** — In progress, receiving micro-commits
- **ENDED** — Finished but not consolidated
- **CONSOLIDATED** — History rewritten to clean commits
- **PUSHED** — Consolidated and pushed to remote

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

## Important

- If no session exists when making changes, auto-start one
- Session ID must be included in every micro-commit
- Suggest consolidation when ending a session
