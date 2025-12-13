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
3. Creating an initial session commit
4. Activating commit tracking
5. Preparing for micro-commit workflow

## Step-by-Step Behavior

### 1. Generate Session ID

```bash
# Generate session ID
SESSION_ID="ses_$(openssl rand -hex 4)"

# Create .ai-git directory if needed
mkdir -p .ai-git

# Save current session
echo "$SESSION_ID" > .ai-git/current-session

# Record base commit
BASE_COMMIT=$(git rev-parse HEAD)
```

### 2. Create Session Start Commit

```bash
# Create initial commit to mark session start
git add .ai-git/current-session
git commit --allow-empty -m "pluto: start session ${SESSION_ID}

session: ${SESSION_ID}
base: ${BASE_COMMIT}
started: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
type: session-start"
```

### 3. Announce to User

```
Started Pluto session: ses_abc12345
  Base: <short-sha>
  
Session tracking active. All prompts and work will be tracked via commits.
```

## Active Session Tracking Rules

Once the session is started, the following rules are automatically active:

### A. Commit Every Prompt

Upon receiving ANY user prompt during this session, IMMEDIATELY create a commit BEFORE doing any work:

```bash
SESSION_ID=$(cat .ai-git/current-session)

# Create empty commit to log the prompt
git commit --allow-empty -m "pluto: prompt received

session: ${SESSION_ID}
timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
prompt: [complete verbatim user prompt]
type: prompt"
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
   timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
   prompt: <current user prompt/task>
   reason: <specific reason for this file change>
   type: work"
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
```

All session information is tracked via git commits with metadata.

## Session States

- **ACTIVE** - In progress, receiving micro-commits
- **ENDED** - Session finished

## Important Notes

1. **Automatic Tracking**: Once started, all prompts and commits are tracked via git commits
2. **File Change = Commit**: Each file modification gets its own micro-commit
3. **Session ID in Metadata**: Every commit includes the session ID for later consolidation
4. **Immediate Commits**: Create prompt commit BEFORE starting work, work commits IMMEDIATELY after each change
5. **Git-Based Logging**: All tracking happens through git commit metadata, no separate log files
6. **Never Skip**: Never skip a micro-commit, even for small changes

## Example Session Flow

```
User: /pluto-start 

Started Session: ses_7x9k2m
  Base: abc123d
  
Session tracking active. All prompts and work will be tracked via commits.

---

User: Add JWT authentication middleware

[Creates prompt commit with session metadata]
[Creates src/middleware/auth.ts]
[Creates work commit with session metadata]

---

User: Add password hashing utility

[Creates prompt commit with session metadata]
[Creates src/utils/hash.ts]
[Creates work commit with session metadata]

---

