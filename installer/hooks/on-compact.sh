#!/bin/bash
# Pluto on-compact hook
# Triggered before context summarization (PreCompact)
# Blocks if there are uncommitted changes to ensure commits are made before summarization

# Log file for debugging
LOG_FILE="${HOME}/.pluto/hook.log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "=== PreCompact hook triggered at $(date) ===" >> "$LOG_FILE"

# Check if we're in a git repo
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$GIT_ROOT" ]; then
    echo "Not in a git repo, allowing compact" >> "$LOG_FILE"
    exit 0
fi

echo "Git root: $GIT_ROOT" >> "$LOG_FILE"

# Check if there are uncommitted changes (staged or unstaged, excluding untracked)
UNSTAGED=$(git diff --name-only 2>/dev/null)
STAGED=$(git diff --cached --name-only 2>/dev/null)

echo "Unstaged files: $UNSTAGED" >> "$LOG_FILE"
echo "Staged files: $STAGED" >> "$LOG_FILE"

if [ -z "$UNSTAGED" ] && [ -z "$STAGED" ]; then
    # No changes to tracked files, allow compact
    echo "No uncommitted changes to tracked files, allowing compact" >> "$LOG_FILE"
    exit 0
fi

# There are uncommitted changes - block and tell Claude to commit before summarization
echo "Uncommitted changes detected, blocking compact to run /pluto-snap" >> "$LOG_FILE"

cat <<'EOF'
{
  "decision": "block",
  "reason": "Context is about to be summarized but you have uncommitted changes. Run /pluto-snap now to commit your changes with an explanation before the context is lost."
}
EOF
exit 0
