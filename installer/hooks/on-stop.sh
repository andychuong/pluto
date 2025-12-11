#!/bin/bash
# Pluto on-stop hook
# Triggered when Claude is about to finish responding
# Checks for uncommitted changes and blocks until /pluto-snap is run

# Log file for debugging
LOG_FILE="${HOME}/.pluto/hook.log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "=== Stop hook triggered at $(date) ===" >> "$LOG_FILE"

# Check if we're in a git repo
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$GIT_ROOT" ]; then
    echo "Not in a git repo, allowing stop" >> "$LOG_FILE"
    exit 0
fi

echo "Git root: $GIT_ROOT" >> "$LOG_FILE"

# Check if there are uncommitted changes (staged or unstaged)
UNSTAGED=$(git diff --name-only 2>/dev/null)
STAGED=$(git diff --cached --name-only 2>/dev/null)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)

echo "Unstaged files: $UNSTAGED" >> "$LOG_FILE"
echo "Staged files: $STAGED" >> "$LOG_FILE"
echo "Untracked files: $UNTRACKED" >> "$LOG_FILE"

if [ -z "$UNSTAGED" ] && [ -z "$STAGED" ] && [ -z "$UNTRACKED" ]; then
    # No changes, allow stop
    echo "No uncommitted changes, allowing stop" >> "$LOG_FILE"
    exit 0
fi

# There are uncommitted changes - block and tell Claude to commit
echo "Uncommitted changes detected, blocking to run /pluto-snap" >> "$LOG_FILE"

# Output JSON to stdout with exit code 0 - blocks without showing as error
cat <<'EOF'
{
  "decision": "block",
  "reason": "You have uncommitted changes. Please run /pluto-snap to commit your changes with an explanation of why you made them."
}
EOF
exit 0
