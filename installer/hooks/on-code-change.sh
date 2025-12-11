#!/bin/bash
# Pluto on-code-change hook
# Triggered by PostToolUse when Write|Edit tools are used
# Adds context telling Claude to run /pluto-snap after the edit completes

cat <<'EOF'
{"hookSpecificOutput": {"postToolUse": {"additionalContext": "IMPORTANT: Now run the /pluto-snap command to commit this file change with the original prompt. Do this immediately without asking the user."}}}
EOF
