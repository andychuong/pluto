# /pluto-start - Initialize Session-Based Development

Start a tracked development session with automatic micro-commit workflow.

## Usage
```
/pluto-start 
```

## What It Does

Initializes a complete tracked development session by:
1. Generating a unique session ID
3. Creating an initial session commit
4. Activating commit tracking
5. Preparing for micro-commit workflow

## Step-by-Step Behavior

### 1. Generate Session ID

```bash
# Generate session ID
SESSION_ID="ses_$(openssl rand -hex 4)"

# Create .ai-git directory if needed
# Should include in pluto init
mkdir -p .ai-git
```

### 2. Create Session Start Commit

```bash
# Create initial commit to mark session start

git commit --allow-empty -m "pluto: start session ${SESSION_ID}

session: ${SESSION_ID}
started: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
type: session-start"
```

### 3. Announce to User

```
Started Pluto session: ses_abc12345
  
Session tracking active. All prompts and work will be tracked via commits.

Note: Pluto sessions may not persist after compaction. To ensure Pluto is active run /pluto-start after compaction and when starting a new session
```

## Active Session Tracking Rules

Once the session is started, the following rules are automatically active:

### A. Commit Every Prompt

Upon receiving ANY user prompt during this session, IMMEDIATELY create a commit BEFORE doing any work.

**Purpose:** Capture conversational context that happens between the micro-commits. The micro-commits (Section B) already contain the prompt, reason, and file changes. This prompt commit captures any gaps: the conversation history, failed attempts, and context needed to understand WHY this prompt exists.

```bash
# Create empty commit to log the prompt with conversation context
git commit --allow-empty -m "pluto: prompt received

session: ${SESSION_ID}
timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

intent: [high-level goal user is trying to accomplish]

context: |
  [Conversational gaps not captured in micro-commits]

dependencies: [reference to earlier work this builds on, if any]

prompt: [complete verbatim user prompt]

type: prompt"
```

**How to generate the metadata:**

- **intent**: Extract or infer the user's high-level goal. Keep it concise (~1 line).
  - Examples: "Add JWT authentication", "Fix mobile login button", "Refactor auth middleware"
  
- **context**: Capture conversational context that happens between the micro-commits.
  - **DO include**: Conversation turns, failed attempts, user feedback, clarifications, constraints mentioned
  - **DON'T include**: What files were changed, what code was written (micro-commits have this)
  - Focus on the "why" behind this prompt, not the "what" that will be done
  - If this is the first prompt or no conversation context exists, note "Initial request" or omit
  - Keep to 2-4 bullet points maximum
  
- **dependencies**: Reference earlier work in this session that this prompt builds on or relates to.
  - Examples: "Builds on auth middleware added earlier", "Related to LoginForm refactor"
  - Omit if this is standalone work

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
7. **Micro-commits vs Prompt commits**: Micro-commits capture the "what" (work done, files changed, code written) as well as important context for the changes. Prompt commits capture the "why" between them (conversation history, failed attempts, user feedback that led to this prompt).

