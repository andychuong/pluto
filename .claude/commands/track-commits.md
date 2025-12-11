# Track Commits Rule

You are now in commit tracking mode for this session.

## Rule

After EVERY file change (edit, write, or create), you MUST:
1. Append a commit entry to `COMMIT_MSG.md` in the project root
2. Stage the changed file(s) with `git add`
3. Create a git commit with a descriptive message

## Commit Entry Format

Each entry in `COMMIT_MSG.md` should follow this format:

```
---
## Commit Entry
- **Session ID**: $CLAUDE_SESSION_ID
- **Timestamp**: [current date/time]
- **User Prompt**: [the original user request that led to this change]
- **File Changed**: [path to the file that was modified]
- **Why**: [brief explanation of why this change was made and what it accomplishes]
- **Commit Hash**: [the git commit hash after committing]
---
```

## Git Commit Message Format

Use this format for git commit messages:
```
[type]: brief description

- File: [path to file]
- Why: [brief explanation]
```

Types: feat, fix, refactor, docs, style, test, chore

## Important

1. Create `COMMIT_MSG.md` if it doesn't exist
2. APPEND to the file, never overwrite previous entries
3. Perform these steps IMMEDIATELY after each file change, before moving to the next task:
   - Write the commit entry to `COMMIT_MSG.md`
   - Run `git add <changed-file> COMMIT_MSG.md`
   - Run `git commit -m "<message>"`
   - Update the commit entry with the actual commit hash
4. Keep explanations concise but informative
5. If multiple files are changed for the same user request, you may group them in a single commit

This rule is now active for the remainder of this session.
