#!/bin/bash
# Pluto on-code-change hook
# Triggered by PostToolUse when Write|Edit tools are used
# Commits the file change with prompt from transcript

# Read hook input from stdin
INPUT=$(cat)

# Extract file path and transcript path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')

# Exit if no file path
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Check if we're in a git repo
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$GIT_ROOT" ]; then
    exit 0
fi

# Get relative path
REL_PATH=$(realpath --relative-to="$GIT_ROOT" "$FILE_PATH" 2>/dev/null || basename "$FILE_PATH")

# Extract the original user prompt from transcript
PROMPT="(no prompt captured)"
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    EXTRACTED=$(jq -rs '
      [.[] | select(.type == "human")][0].message.content |
      if type == "array" then
        map(select(.type == "text").text) | join(" ")
      else
        .
      end
    ' "$TRANSCRIPT_PATH" 2>/dev/null)
    if [ -n "$EXTRACTED" ] && [ "$EXTRACTED" != "null" ]; then
        PROMPT="$EXTRACTED"
    fi
fi

# Truncate prompt if too long
if [ ${#PROMPT} -gt 200 ]; then
    PROMPT="${PROMPT:0:197}..."
fi

# Check if file has changes
if git diff --quiet "$FILE_PATH" 2>/dev/null && \
   git diff --cached --quiet "$FILE_PATH" 2>/dev/null && \
   git ls-files --error-unmatch "$FILE_PATH" 2>/dev/null; then
    # File exists in git and has no changes
    exit 0
fi

# Stage the file
git add "$FILE_PATH" 2>/dev/null

# Create commit
git commit -m "pluto: update $REL_PATH

Prompt: $PROMPT

🤖 Generated with Pluto" --quiet 2>/dev/null

exit 0
