#!/bin/bash
# Pluto on-stop hook
# Triggered when Claude is about to finish responding
# Checks for uncommitted changes and blocks until /pluto-snap is run

# Check if we're in a git repo
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$GIT_ROOT" ]; then
    exit 0
fi

# Check if there are uncommitted changes (staged or unstaged)
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    # No changes, allow stop
    exit 0
fi

# There are uncommitted changes - block and tell Claude to commit
cat <<'EOF'
{"decision": "block", "reason": "You have uncommitted changes. Run /pluto-snap now to commit your changes with an explanation of why you made them."}
EOF
