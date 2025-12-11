#!/bin/bash
# Pluto on-code-change hook
# Triggered by PostToolUse when Write|Edit tools are used
# Outputs JSON block decision to run /pluto-snap command

cat <<'EOF'
{"decision": "block", "reason": "File was modified. Run the /pluto-snap command now to commit this change with the original prompt."}
EOF
