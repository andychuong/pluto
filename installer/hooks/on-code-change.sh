#!/bin/bash
# Pluto on-code-change hook
# Triggered by PostToolUse when Write|Edit tools are used
# Outputs JSON block decision to run /pluto-snap command

cat <<'EOF'
{"decision": "block", "reason": "/pluto-snap"}
EOF
