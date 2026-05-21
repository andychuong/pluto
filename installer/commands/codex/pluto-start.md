# pluto-start - Initialize Session-Based Development

Start a tracked development session with automatic fiber workflow.

## Usage
```
pluto-start 
```

## What It Does

Initializes a complete tracked development session by:
1. Generating a unique session ID
2. Writing active session marker for Codex turn enforcement
3. Creating an initial session commit
4. Activating commit tracking
5. Preparing for fiber workflow

## Key Concepts

**Fibers**: Atomic work commits created after every file change. Each fiber captures a single logical change with full context (prompt, reason, timestamp). When you run pluto-spin, related fibers are spun together into **threads**—clean, meaningful commits ready for review.

## Step-by-Step Behavior

### 1. Generate Session ID

```bash
# Generate session ID
SESSION_ID="ses_$(openssl rand -hex 4)"
```

### 2. Write Active Session Marker

```bash
# Persist active Pluto session for AGENTS turn-level enforcement
mkdir -p .ai-git
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

cat > .ai-git/session.json <<EOF
{
  "active": true,
  "session_id": "${SESSION_ID}",
  "started": "${TIMESTAMP}"
}
EOF
```

### 3. Create Session Start Commit

```bash
# Create initial commit to mark session start
# Pre-compute date to avoid command substitution in commit message
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

git commit --allow-empty -m "pluto: start session ${SESSION_ID}

session: ${SESSION_ID}
started: ${TIMESTAMP}
type: session-start"
```

### 4. Announce to User

```
Started Pluto session: ses_abc12345
  
Session tracking active. All prompts and work will be tracked via commits.

Note: Pluto sessions may not persist after compaction. To ensure Pluto is active run pluto-start after compaction and when starting a new session
```

## Active Session Tracking Rules

Once the session is started, the following rules are automatically active:

**Workflow for each user prompt:**
1. FIRST: Create prompt commit (Section A) - captures conversation context
2. THEN: Do the work (write code, make changes)
3. AFTER EACH FILE CHANGE: Create fiber (Section B) - captures what was done

### A. Commit Every Prompt

Upon receiving ANY user prompt during this session, IMMEDIATELY create a commit BEFORE doing any work.
Use `.ai-git/session.json` to retrieve the active `session_id` on each turn.

**Purpose:** Capture conversational context that happens between the fibers. The fibers (Section B) already contain the prompt, reason, and file changes. This prompt commit captures any gaps: the conversation history, failed attempts, and context needed to understand WHY this prompt exists.

```bash
# Create empty commit to log the prompt with conversation context
# Pre-compute date to avoid command substitution in commit message
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

git commit --allow-empty -m "pluto: conversation

session: ${SESSION_ID}
timestamp: ${TIMESTAMP}

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
  
- **context**: Capture conversational context that happens between the fibers.
  - **DO include**: Conversation turns, failed attempts, user feedback, clarifications, constraints mentioned
  - **DON'T include**: What files were changed, what code was written (fibers have this)
  - Focus on the "why" behind this prompt, not the "what" that will be done
  - If this is the first prompt or no conversation context exists, note "Initial request" or omit
  - Keep to 2-4 bullet points maximum
  
- **dependencies**: Reference earlier work in this session that this prompt builds on or relates to.
  - Examples: "Builds on auth middleware added earlier", "Related to LoginForm refactor"
  - Omit if this is standalone work

### B. Create Fibers

After EVERY file change, create a fiber using this workflow:

1. **Stage changes**:
   ```bash
   git add -A
   ```

2. **Commit with full context metadata**:
   ```bash
   # Template format
   # Pre-compute date to avoid command substitution in commit message
   TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
   
   git commit -m "<concise description of change>

   session: ${SESSION_ID}
   timestamp: ${TIMESTAMP}
   intent: <high-level goal user is trying to accomplish>
   prompt: <current user prompt/task>
   context: <conversational gaps - failed attempts, clarifications, feedback>
   dependencies: <reference to earlier work this builds on, if any>
   reason: <specific reason for this file change>
   type: work"
   ```

### Fiber Granularity Policy (Minimum Working Piece)

During an active Pluto session, each `type: work` fiber should be the **smallest working unit** of change, not a full feature chunk.

Use these rules:
- One micro-intent per fiber. If commit message needs "and", split it.
- Prefer 1 file per fiber when possible; usually cap at 2-3 tightly related files.
- Separate concerns:
  - Behavior/code changes
  - Tests
  - Refactors/renames
  - Config/dependency updates
- Keep each fiber in a working state for that step (no obvious syntax breaks).
- If staged diff includes multiple independent edits, unstage and commit in multiple fibers.

Quick split checklist before each fiber commit:
1. Does this commit do exactly one thing?
2. Can I explain the reason in one short sentence?
3. Would reverting only this commit make sense?
4. Is anything unrelated included? If yes, split again.

Examples:
- Good: `add JWT token parser utility`
- Good: `wire JWT parser into auth middleware`
- Good: `add middleware unit tests for invalid token path`
- Too large: `implement JWT auth and update tests and refactor routes`

   **Example of actual execution:**
   ```bash
   # The agent actually runs this with real values
   git commit -m "add JWT authentication middleware

   session: ses_7x9k2m
   timestamp: 2025-12-13 14:31:15 UTC
   intent: Add JWT authentication
   prompt: Add JWT authentication middleware
   context: Initial request
   dependencies: none
   reason: Create core JWT validation middleware with token verification
   type: work"
   ```

Each fiber is fully self-contained with ALL context (intent, prompt, context, dependencies, reason). No need to find the preceding prompt commit to understand "why" - this simplifies pluto-spin consolidation since each fiber is a complete unit.

## Session Commands Available

Once started, these session commands become available:

### pluto-spin

### pluto-weave

All session information is tracked via git commits with metadata.


## Important Notes

1. **Automatic Tracking**: Once started, all prompts and commits are tracked via git commits
2. **File Change = Commit**: Each file modification gets its own fiber
3. **Session ID in Metadata**: Every commit includes the session ID for later consolidation
4. **Immediate Commits**: Create prompt commit BEFORE starting work, work commits IMMEDIATELY after each change
5. **Git-Based Logging**: All tracking happens through git commit metadata, no separate log files
6. **Never Skip**: Never skip a fiber, even for small changes
7. **Fibers vs Prompt commits**: Fibers capture the "what" (work done, files changed, code written) as well as important context for the changes. Prompt commits capture the "why" between them (conversation history, failed attempts, user feedback that led to this prompt).
