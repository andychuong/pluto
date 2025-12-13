# /pluto-start - Initialize Session-Based Development

Start a tracked development session with automatic commit logging and micro-commit workflow.

## Usage
```
/pluto-start 
```

## What It Does

Initializes a complete tracked development session by:
1. Generating a unique session ID
2. Recording the current HEAD as session base
3. Setting up session logging infrastructure
4. Activating prompt and commit tracking
5. Preparing for micro-commit workflow

## Step-by-Step Behavior

### 1. Generate Session ID

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

### 2. Initialize Pluto Log

```bash
# Create session-specific log file with header
cat > .ai-git/pluto-log-${SESSION_ID}.md << EOF
# Pluto Log - Session $SESSION_ID

- **Started**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Base Commit**: $BASE_COMMIT

---
EOF
```

### 3. Announce to User

```
Started Pluto session: ses_abc12345
  Base: <short-sha>
  Log: .ai-git/pluto-log-ses_abc12345.md
  
All prompts and commits will be logged with Pluto.
```

## Active Session Tracking Rules

Once the session is started, the following rules are automatically active:

### A. Log Every Prompt

Upon receiving ANY user prompt during this session, IMMEDIATELY append to `.ai-git/pluto-log-${SESSION_ID}.md` BEFORE doing any work:

```bash
SESSION_ID=$(cat .ai-git/current-session)

cat >> .ai-git/pluto-log-${SESSION_ID}.md << 'EOF'

## Prompt Entry
- **Timestamp**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Prompt**: [complete verbatim user prompt]

---
EOF
```

### B. Create Micro-Commits

After EVERY file change, create a micro-commit using this workflow:

1. **Stage changes**:
   ```bash
   git add -A
   ```

2. **Commit with session metadata**:
   ```bash
   git commit -m "<type>(<scope>): <concise description>
   
   session: $SESSION_ID
   prompt: <current user prompt/task>
   reason: <specific reason for this file change>
   touched: <files changed>"
   ```

3. **Get commit hash**:
   ```bash
   COMMIT_HASH=$(git rev-parse HEAD)
   SESSION_ID=$(cat .ai-git/current-session)
   ```

4. **Log to pluto-log**:
   ```bash
   FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | tr '\n' ', ' | sed 's/,$//')
   
   cat >> .ai-git/pluto-log-${SESSION_ID}.md << EOF
   
   ## Commit Entry
   - **Timestamp**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
   - **File Changed**: $FILES_CHANGED
   - **Type**: <type>(<scope>)
   - **Description**: <commit message title>
   - **Reason**: <reason for change>
   - **Commit Hash**: ${COMMIT_HASH:0:7}
   
   ---
   EOF
   ```

### C. Commit Type Inference

Choose the appropriate commit type based on the change:
- `feat` - new feature or functionality
- `fix` - bug fix
- `refactor` - code refactoring
- `test` - adding or updating tests
- `docs` - documentation changes
- `style` - formatting, styling
- `chore` - maintenance, dependencies, config

## Session Commands Available

Once started, these session commands become available:

### /pluto-consolidate 

### /pluto-ship

## File Structure

After running `/pluto-start`, these files will exist:

```
.ai-git/
  current-session                  # Current session ID
  pluto-log-{sessionID}.md        # Session-specific log (prompts + commits)
```

## Session States

- **ACTIVE** - In progress, receiving micro-commits
- **ENDED** - Session finished

## Important Notes

1. **Automatic Tracking**: Once started, all prompts and commits are automatically logged
2. **File Change = Commit**: Each file modification gets its own micro-commit
3. **Session ID in Metadata**: Every commit includes the session ID for later consolidation
4. **Immediate Logging**: Log prompt entries BEFORE starting work, commit entries IMMEDIATELY after each change
5. **Session-Specific Logs**: Each session has its own `.ai-git/pluto-log-{sessionID}.md` file
6. **Never Skip**: Never skip a micro-commit, even for small changes

## Example Session Flow

```
User: /pluto-start 

Started Session: ses_7x9k2m
  Base: abc123d
  Log: .ai-git/pluto-log-ses_7x9k2m.md
  
Session tracking active. All prompts and commits will be logged.

---

User: Add JWT authentication middleware

[Logs prompt to .ai-git/pluto-log-ses_7x9k2m.md]
[Creates src/middleware/auth.ts]
[Creates micro-commit with session metadata]
[Logs commit to .ai-git/pluto-log-ses_7x9k2m.md]

---

User: Add password hashing utility

[Logs prompt to .ai-git/pluto-log-ses_7x9k2m.md]
[Creates src/utils/hash.ts]
[Creates micro-commit with session metadata]
[Logs commit to .ai-git/pluto-log-ses_7x9k2m.md]

---

