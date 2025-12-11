# Track Commits Rule

You are now in commit tracking mode for this session.

## First: Generate Session ID

Before doing anything else, generate a unique session ID by running:
```bash
uuidgen | cut -d'-' -f1
```

Store this ID and use it for ALL commit entries in this session. Announce the session ID to the user.

## Rules

### Rule 1: Log Every Prompt

Upon receiving ANY user prompt, you MUST immediately append a Prompt Entry to `COMMIT_MSG.md` in the project root BEFORE doing any other work.

### Rule 2: Log Every File Change

After EVERY file change (edit, write, or create), you MUST immediately append a Commit Entry to `COMMIT_MSG.md`.

## Entry Formats

### Prompt Entry Format
```
---
## Prompt Entry
- **Session ID**: [generated session ID from above]
- **Timestamp**: [current date/time]
- **Prompt**: [the complete, verbatim prompt from the user]
---
```

### Commit Entry Format
```
---
## Commit Entry
- **Session ID**: [generated session ID from above]
- **Timestamp**: [current date/time]
- **User Prompt**: [brief summary of the original user request]
- **File Changed**: [path to the file that was modified]
- **Why**: [brief explanation of why this change was made and what it accomplishes]
---
```

## Important

1. Create `COMMIT_MSG.md` if it doesn't exist
2. APPEND to the file, never overwrite previous entries
3. Write the commit entry IMMEDIATELY after each file change, before moving to the next task
4. Keep the "Why" explanation concise but informative
5. If multiple files are changed for the same user request, create a separate entry for each file
6. Use the SAME session ID for all entries in this session

This rule is now active for the remainder of this session.
