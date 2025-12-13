# AI Git Workflow

## Product Requirements Document

**Version:** 0.3.0-draft  
**Last Updated:** December 2024  
**Status:** RFC / Design Phase

---

## Executive Summary

AI Git Workflow is a developer tool that solves the collaboration friction between AI coding agents and human developers around version control. It introduces a two-phase commit model: liberal micro-commits during AI work sessions (capturing rich context and audit trails), followed by intelligent consolidation into clean, human-readable commit history before pushing to remote.

The product is distributed as a set of markdown command and agent files that integrate directly into AI coding environments like Claude Code, requiring no external tooling or infrastructure.

**Key Innovation:** Session awareness and milestone detection are baked into the agent's core behavior, not bolted on as commands. The agent proactively manages git hygiene while remaining conversational and helpful.

---

## Problem Statement

### The Trust Gap

AI engineers don't trust AI agents to make git commits. Current behavior:

- Developers run commit commands manually
- Commits happen infrequently (large, monolithic changes)
- AI work lacks audit trail
- Context is lost between sessions
- Code review becomes harder (massive diffs)

### The Hygiene Paradox

Good git hygiene requires:
- Small, atomic commits
- Clear, descriptive messages
- Logical ordering
- Each commit builds/works

But AI agents work iteratively, making many small changes that don't map cleanly to "one logical change per commit."

### The Collaboration Problem

When AI and humans work on the same codebase:
- Humans can't tell what the AI changed or why
- AI changes are opaque blobs
- No way to partially revert AI work
- Code review is "accept all or reject all"

---

## Solution Overview

### Two-Phase Commit Model

```
Phase 1: WORK (Liberal Micro-Commits)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[c1]─[c2]─[c3]─[c4]─[c5]─...─[c47]
  │    │    │    │    │
  └────┴────┴────┴────┴── Rich metadata:
                          • Session ID
                          • User prompt
                          • AI reasoning
                          • Files touched

                    │
                    ▼

Phase 2: CONSOLIDATE (Before Push)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[A]────[B]────[C]
  │      │      │
  └──────┴──────┴── Clean commits:
                    • "feat(auth): add JWT middleware"
                    • "test(auth): add unit tests"
                    • "docs: update API documentation"
```

### Core Principles

1. **Commit liberally, consolidate intelligently** — Never lose context, but present clean history
2. **AI-native, human-readable** — Rich metadata for machines, conventional commits for humans
3. **Proactive, not passive** — Agent suggests consolidation at natural milestones
4. **Safe by default** — Always recoverable, never destructive
5. **Graceful degradation** — Partial success beats total failure; maximize verified commits
6. **Zero infrastructure** — Works with standard git, no servers or services

---

## Target Users

### Primary: AI-Assisted Developers

- Use Claude Code, Cursor, or similar AI coding tools
- Work on professional codebases with team collaboration
- Value clean git history but struggle to maintain it with AI
- Want transparency into what AI changed and why

### Secondary: Team Leads / Code Reviewers

- Review PRs that include AI-generated code
- Need to understand AI contributions
- Want granular control over what gets merged

---

## Product Architecture

### Distribution Model

The product is a collection of markdown files installed into the AI coding environment:

```
~/.claude/
├── commands/
│   ├── micro.md
│   ├── consolidate.md
│   ├── consolidate-plan.md
│   ├── qa.md
│   ├── recover.md
│   └── session.md
└── agents/
    ├── consolidation-agent.md
    ├── qa-agent.md
    └── git-historian-agent.md

<project>/
├── CLAUDE.md              # Agent persona & behavior instructions
└── .ai-git/
    ├── current-session    # Active session ID
    ├── sessions.json      # Session history
    ├── state.json         # Consolidation state
    └── recovery           # Recovery points log
```

### Agent-First Architecture

Unlike traditional tooling where users invoke commands, this system embeds behavior into the agent itself via `CLAUDE.md`. The agent:

- **Automatically** starts sessions when work begins
- **Automatically** creates micro-commits after every file change
- **Proactively** suggests consolidation at milestones
- **Recognizes** push intent and offers to consolidate first

Commands exist for explicit control, but the default experience requires no user commands at all.

---

## Agent Behavior (CLAUDE.md)

The `CLAUDE.md` file transforms the AI agent into a session-aware, git-conscious collaborator.

### Session Awareness

The agent always operates within a session context:

1. On first file change, auto-start a session if none exists
2. Track all micro-commits with session ID
3. Maintain awareness of commit count and work progress
4. Link related work for intelligent consolidation

### Micro-Commit Discipline

After every file modification, the agent immediately creates a micro-commit:

```
feat(auth): add token validation function

session: ses_7x9k2m
prompt: add authentication to the api endpoints
reason: implementing JWT validation before route handlers
touched: src/middleware/auth.ts
```

**One file change = one micro-commit. No batching. No exceptions.**

### Milestone Detection

The agent proactively suggests consolidation at natural milestones:

| Trigger | Behavior |
|---------|----------|
| 10+ commits | Gentle mention: "We've made good progress..." |
| 25+ commits | Suggest: "Want me to run /consolidate-plan?" |
| 50+ commits | Warn: "Session is getting large, recommend consolidating" |
| Feature complete | "The [feature] looks complete. Ready to consolidate?" |
| Tests passing | "All tests pass. Good time to consolidate." |
| User says "done" | Offer consolidation immediately |
| Bug fixed | "That fix is in. Should we consolidate and push?" |

### Push Intent Recognition

When the user signals push intent, the agent intervenes helpfully:

**Trigger phrases:**
- "push", "push this", "let's push"
- "ship it", "ship this"
- "done", "we're done", "that's it"
- "PR", "pull request", "open a PR"
- "merge", "ready to merge"

**Agent response:**
> "Before pushing, let me show you how these 23 micro-commits would consolidate..."
> [runs /consolidate-plan]
> [shows proposed grouping]
> "Does this look right?"

### Conversational Style

The agent is helpful, not robotic:

**Good:**
> "We've got 15 commits building out the auth system. When you're ready, I can show you how they'd consolidate."

**Bad:**
> "ALERT: Commit threshold reached. Execute /consolidate-plan immediately."

---

## Features & Commands

### `/micro` — Create Micro-Commit

**Purpose:** Capture every file change with rich context.

**Triggered:** Automatically after every file modification (via CLAUDE.md behavior).

**Behavior:**
1. Stage changed files
2. Generate commit message with metadata
3. Commit immediately

**Commit Format:**
```
<type>(<scope>): <short description>

session: <session_id>
prompt: <user's current task/request>
reason: <why this specific change was made>
touched: <files modified>
```

**Example:**
```
feat(auth): add token validation function

session: ses_7x9k2m
prompt: add authentication to the api endpoints
reason: implementing JWT validation before route handlers
touched: src/middleware/auth.ts
```

---

### `/session` — Session Management

**Purpose:** Explicit session control (usually automatic).

**Usage:**
```
/session start [name]    # Start new session (usually automatic)
/session end             # End session, prompt for consolidation
/session status          # Show current session info
/session list            # List recent sessions
```

**Note:** Most session management happens automatically. These commands exist for explicit control when needed.

**Session States:**
| State | Meaning |
|-------|---------|
| ACTIVE | Currently in progress |
| ENDED | Finished but not consolidated |
| CONSOLIDATED | Micro-commits rewritten |
| PUSHED | Consolidated and pushed to remote |

---

### `/consolidate-plan` — Preview Consolidation

**Purpose:** Show proposed consolidation before executing.

**Triggered:** 
- Manually by user
- Automatically when agent detects push intent
- When agent suggests at milestone

**Behavior:**
1. Gather all micro-commits in current session
2. Invoke `consolidation-agent` to analyze and group
3. Present plan for user review

**Output Example:**
```markdown
## Consolidation Plan

**Session:** ses_7x9k2m
**Micro-commits:** 34
**Proposed consolidated:** 4

---

### Commit 1: `feat(auth): add JWT authentication middleware`

**Combines:** c1, c2, c5, c7, c8, c12, c15, c19

**Files:**
- src/middleware/auth.ts (new)
- src/types/auth.ts (new)
- src/errors/AuthError.ts (new)

**Reasoning:** Core authentication implementation. c5 was a typo 
fix for c2, c15 added error handling to c7's initial implementation.

---

### Commit 2: `test(auth): add authentication test suite`

...etc
```

**User Interaction:**
- Review proposed groupings
- Request changes ("split commit 2", "merge 3 and 4")
- Approve to proceed

---

### `/consolidate` — Execute Consolidation

**Purpose:** Rewrite micro-commits into clean history.

**Triggered:** After user approves consolidation plan.

**Behavior:**
1. Save recovery point (current HEAD to `.ai-git/recovery`)
2. Execute interactive rebase
3. For each consolidated commit group:
   - Pick first micro-commit
   - Fixup subsequent micro-commits
   - Reword with final message
4. Run `/qa` automatically
5. Report success or failure

**State Tracking:**
```json
{
  "session": "ses_7x9k2m",
  "original_head": "abc123def",
  "status": "consolidating",
  "completed_commits": [
    {
      "title": "feat(auth): add JWT middleware",
      "sha": "new123",
      "consumed": ["c1", "c2", "c5", "c7"],
      "qa_status": "pass"
    }
  ],
  "pending_micro": ["c8", "c9", "c10", "..."]
}
```

**Incremental Progress:**
- State saved after each consolidated commit
- On failure, can resume from last successful point
- Enables retry with different grouping strategy

---

### `/qa` — Quality Assurance

**Purpose:** Validate consolidated commits.

**Triggered:** Automatically after `/consolidate`, or manually.

**Checks Performed:**

| Check | Description | Failure Action |
|-------|-------------|----------------|
| Build | Each commit compiles/builds | Block, suggest fix |
| Tests | Tests pass (no regressions) | Warn, optional block |
| Semantic | Messages match diffs | Warn, suggest reword |
| Scope | Commits appropriately sized | Warn, suggest split/merge |

**Output Example:**
```markdown
## QA Report

### Commit 1: feat(auth): add JWT middleware
| Check    | Status | Notes |
|----------|--------|-------|
| Build    | ✓ Pass |       |
| Tests    | ✓ Pass |       |
| Semantic | ✓ Good |       |

### Commit 2: feat(api): add protected routes
| Check    | Status | Notes |
|----------|--------|-------|
| Build    | ✗ Fail | Cannot find module '../middleware/auth' |
| Tests    | ⊘ Skip | Build failed |
| Semantic | ✓ Good |       |

**Issue:** Commit 2 references auth middleware but comes before 
it in the rewritten history.

**Suggested Fix:** Reorder commits or add missing import.
```

---

### `/recover` — Recovery

**Purpose:** Restore state after failed consolidation.

**Usage:**
```
/recover --list          # Show recovery points
/recover --to <sha>      # Recover to specific point
```

**Recovery Sources:**
1. Explicit checkpoints in `.ai-git/recovery`
2. Git reflog (automatic, always available)

---

## Agents

### Consolidation Agent

**Role:** Analyze micro-commits and propose optimal groupings.

**Input:**
- List of micro-commits with metadata
- Diffs for each commit
- File change summary

**Analysis Process:**
1. Parse metadata (session, prompt, reason)
2. Build change graph (files ↔ commits)
3. Identify semantic units
4. Determine ordering (dependency-aware)

**Grouping Heuristics:**

| Group Together | Keep Separate |
|----------------|---------------|
| Implementation + immediate fixes | Unrelated features |
| Code + corresponding tests | Refactoring + new features |
| Type definitions + usage | Config + application code |

**Output:** Structured consolidation plan (YAML format)

---

### QA Agent

**Role:** Validate consolidated commits for quality.

**Checks:**
1. Build integrity (compiles)
2. Test integrity (passes)
3. Semantic accuracy (message matches diff)
4. Scope appropriateness (not too big/small)

**Output:** Detailed QA report with pass/fail/warn per commit

---

### Git Historian Agent

**Role:** Write excellent commit messages.

**Input:** Diff (or consolidated diffs)

**Output:** Conventional commit message

**Quality Criteria:**
- Accurate to the diff
- Imperative mood
- Appropriate scope
- Useful to future developers

---

## User Workflows

### Fully Automatic Flow (Default Experience)

```
1. User starts Claude Code session
   └─▶ [No user action required]

2. User: "Add authentication to the API"
   └─▶ Agent auto-starts session ses_7x9k2m
   └─▶ Agent works, auto-creates micro-commits after each file
       [c1] feat(auth): create auth types
       [c2] feat(auth): add jwt validation
       [c3] fix(auth): typo in function name
       ...

3. [At 12 commits, agent mentions naturally]
   └─▶ "Auth middleware is looking solid. We're at 12 commits—
        let me know when you want to consolidate."

4. User: "Let's also add rate limiting"
   └─▶ Agent continues, more micro-commits...

5. User: "Ok ship it"
   └─▶ Agent recognizes push intent
   └─▶ Agent auto-runs /consolidate-plan
   
   "Before pushing, here's how these 23 commits would consolidate:
   
    1. feat(auth): add JWT authentication middleware
    2. test(auth): add auth test suite
    3. feat(auth): add rate limiting
    4. docs: update API docs
    
    Does this grouping look right?"

6. User: "Yeah looks good"
   └─▶ Agent runs /consolidate
   └─▶ Agent runs /qa
   
   "✓ Consolidated 23 → 4 commits, all checks pass.
    Ready to push when you are."

7. User pushes clean history
```

**Note:** The user never typed a single git-related command. The agent handled everything proactively.

### Explicit Control Flow

```
1. User: "/session start auth-feature"
   └─▶ Agent starts named session

2. [Work happens with micro-commits...]

3. User: "/consolidate-plan"
   └─▶ Agent shows proposed grouping

4. User: "Split the first commit into types and implementation"
   └─▶ Agent adjusts plan

5. User: "/consolidate"
   └─▶ Agent executes with adjusted plan

6. User: "/qa --build-only"
   └─▶ Agent runs only build checks
```

### Recovery Flow

```
1. /consolidate runs
2. /qa fails: "Commit 2 doesn't build"
3. Agent offers: "I can recover to before consolidation. Want me to?"
4. User: "Yes"
5. Agent: /recover --to <pre-consolidate>
6. Micro-commits restored
7. Agent: "Recovered. Let's try a different grouping..."
8. Retry with adjusted plan
```

---

## Technical Design

### State Management

**Location:** `.ai-git/` directory in project root

**Files:**
```
.ai-git/
├── current-session    # Active session ID (simple text file)
├── sessions.json      # Session history and metadata
├── state.json         # Current consolidation state
├── recovery           # Recovery points log (append-only)
└── config.json        # Optional: custom settings
```

**current-session:**
```
ses_7x9k2m
```

**sessions.json:**
```json
{
  "sessions": [
    {
      "id": "ses_7x9k2m",
      "name": "auth-feature",
      "status": "active",
      "started_at": "2024-01-15T10:30:00Z",
      "ended_at": null,
      "base_commit": "abc123def",
      "micro_commit_count": 23
    }
  ]
}
```

**state.json:**
```json
{
  "session": "ses_7x9k2m",
  "original_head": "abc123def",
  "status": "consolidating",
  "completed_commits": [...],
  "pending_micro": [...]
}
```

**recovery:**
```
abc123 2024-01-15T10:30:00Z ses_7x9k2m-pre-consolidate
def456 2024-01-15T11:00:00Z ses_7x9k2m-mid-consolidate
```

### Git Operations

**Micro-commit:**
```bash
git add <files>
git commit -m "<message>"
```

**Consolidation (via interactive rebase):**
```bash
# Save recovery point
echo "$(git rev-parse HEAD) $(date -Iseconds) pre-consolidate" >> .ai-git/recovery

# Interactive rebase with generated script
git rebase -i <base-sha>
```

**Recovery:**
```bash
git rebase --abort 2>/dev/null || true
git reset --hard <recovery-sha>
```

---

## Failsafe Mechanism

A core safety feature that prevents total failure during consolidation. When QA fails on a consolidated commit, the failsafe preserves verified work and attempts reconsolidation with fewer commits.

### The Problem

Consolidation can fail for many reasons:
- Dependency ordering (commit B needs code from commit C)
- Missing imports when code is split across commits
- Type errors when definitions are separated from usage

Without a failsafe, any failure means losing all consolidation work and starting over.

### The Solution: Graceful Degradation

**Principle:** Any number of verified commits > 0 is a win. Find the longest working prefix, then retry the rest with fewer commits.

### How It Works

```
Original plan: 5 commits from 30 micro-commits

[A]───[B]───[C]───[D]───[E]
 │     │     │     │     │
 c1-6  c7-12 c13-18 c19-24 c25-30

QA runs SEQUENTIALLY:
  A (c1-6)   → ✓ pass — LOCKED IN
  B (c7-12)  → ✓ pass — LOCKED IN  
  C (c13-18) → ✗ FAIL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FAILSAFE ACTIVATES

Step 1: Preserve verified commits [A, B]

Step 2: Reconsolidate remaining micro-commits (c13-30) 
        into FEWER commits (N-1 = 2 instead of 3)

        Original grouping: [C] [D] [E]  — 3 commits
        New grouping:      [C'] [D']    — 2 commits, DIFFERENT content

[A]───[B]───[C']───[D']
             │      │
             c13-21 c22-30  ← regrouped, more self-contained

Step 3: QA the new commits
  C' (c13-21) → ✓ pass (missing import now included!)
  D' (c22-30) → ✓ pass

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULT: 4 verified commits [A, B, C', D']
```

### Recursive Retry

If the first retry still fails, continue reducing:

```
Attempt 1: 3 commits [C, D, E]      → C fails
Attempt 2: 2 commits [C', D']       → C' fails  
Attempt 3: 1 commit  [C'']          → C'' passes ✓

Result: [A]─[B]─[C''] = 3 verified commits

Better than 0!
```

### Final Fallback

If even a single commit fails (code genuinely broken), preserve micro-commits:

```
All retry attempts failed.

Result: 
  [A]───[B]───[c13]─[c14]─[c15]─...─[c30]
   │     │     
   └─────┴── verified, clean    └── micro-commits preserved

Report: "Consolidated 2 commits. Remaining 18 micro-commits 
        could not be consolidated (possible code issue)."
```

### The Algorithm

```
function consolidate_with_failsafe(micro_commits):
    verified = []
    remaining = micro_commits
    target_count = initial_plan.length
    
    while remaining is not empty AND target_count >= 1:
        
        # Generate plan for remaining micro-commits
        plan = consolidation_agent(remaining, target_count)
        
        for commit in plan:
            qa_result = qa_check(commit)
            
            if qa_result.passed:
                verified.append(commit)
                remaining = remaining - commit.consumed_micros
            else:
                # This commit failed
                # Reduce target count and retry with remaining micros
                commits_left = plan.length - plan.index(commit)
                target_count = commits_left - 1
                break  # exit inner loop, retry
        
        if all commits passed:
            break  # success!
    
    # Whatever we couldn't consolidate stays as micro-commits
    return {
        verified_commits: verified,
        unconsolidated: remaining
    }
```

### Why This Works

1. **Larger commits are more self-contained** — When you group more micro-commits together, dependencies are more likely to be included

2. **The failure gives hints** — "Missing import from auth.ts" tells the consolidation agent to group auth-related commits together

3. **Verified work is never lost** — Once a commit passes QA, it's locked in

4. **Micro-commits are always preserved** — Worst case, you have some clean commits plus the original micro-commits

### Reconsolidation Hints

When QA fails, it provides hints to the consolidation agent:

```json
{
  "failed_commit": "C",
  "error_type": "missing_import",
  "error_detail": "Cannot find module '../middleware/auth'",
  "suggestion": "Group with commits touching auth middleware"
}
```

The consolidation agent uses these when regrouping:
- Missing import → include the exporting file in same commit
- Type error → include type definitions in same commit
- Test failure → check if test depends on code in later commit

### User Experience

The failsafe is automatic and transparent:

```
User: "Ship it"

Agent: Consolidating 30 micro-commits into 5 commits...
       ✓ Commit 1 verified
       ✓ Commit 2 verified  
       ✗ Commit 3 failed (missing import)
       
       Retrying with adjusted grouping...
       ✓ Commit 3 verified (regrouped)
       ✓ Commit 4 verified
       
       Done! 4 clean commits, ready to push.
```

The user sees a brief retry, not a failure. Most of the time, regrouping resolves the issue automatically.

---

## Edge Cases & Failure Modes

### Edge Case: Interleaved Features

**Scenario:** User works on auth and logging simultaneously.

**Handling:** Consolidation agent separates by semantic boundary, not temporal order.

```
Micro-commits: auth, log, auth, log, auth, log
Consolidated:  [auth feature] [logging feature]
```

---

### Edge Case: User Makes Manual Commits

**Scenario:** User runs `git commit` directly during a session.

**Handling:** 
- Manual commit lacks session metadata
- Agent notes this in consolidation plan
- Offers to include or exclude from consolidation

---

### Edge Case: Very Long Session (100+ commits)

**Scenario:** User works all day without consolidating.

**Handling:**
- Agent warns at 50 commits
- Offers incremental consolidation
- Consolidation agent handles gracefully but warns about complexity

---

### Failure Mode: Conflicting Reorder

**Scenario:** Consolidation reorders commits, causing conflicts.

**Handling:**
1. Detect conflict during rebase
2. Abort rebase automatically
3. Report which commits conflict
4. Suggest alternative grouping
5. Offer recovery

---

### Failure Mode: QA Fails Post-Consolidation

**Scenario:** Consolidated commit doesn't build.

**Handling:** Failsafe mechanism activates automatically:
1. Preserve any already-verified commits
2. Reconsolidate remaining micro-commits into fewer commits
3. Retry QA on new grouping
4. Repeat until success or cannot reduce further
5. Report partial success with any unconsolidated micro-commits preserved

See **Failsafe Mechanism** section for full details.

---

## Success Metrics

### Developer Experience
- Time from "done coding" to "pushed" < 2 minutes
- Zero manual commit message writing
- Zero git commands required during normal flow
- Recovery from any failure < 30 seconds

### Quality
- 100% of consolidated commits build
- Commit messages accurately describe diffs (human evaluation)
- Commit scope is appropriate (not too big/small)

### Adoption
- Works with existing git workflows
- No behavior change required from team members not using AI
- Clean history indistinguishable from manual commits

---

## Future Considerations

### Multi-Session Consolidation
Consolidate across multiple sessions into a single PR.

### Team Collaboration
Multiple developers using AI Git Workflow on same branch.

### Merge Agent
Intelligent merge conflict resolution for AI-generated code.

### PR Description Generation
Auto-generate PR descriptions from consolidated commits.

### Integration with Other Agents
Cursor, Aider, Continue, etc.

---

## Installation & Setup

### Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/<repo>/install.sh | bash
```

### Manual Install

1. Clone repository
2. Run `./install.sh` in your project directory
3. Start Claude Code session
4. Start coding—everything else is automatic

### Requirements

- Git 2.x+
- Claude Code (or compatible AI coding environment)
- Node.js 18+ (for build detection, optional)

---

## Appendix

### A: Micro-Commit Message Format (Full Spec)

```
<type>(<scope>): <description>

session: <session-id>
prompt: <user-prompt>
reason: <ai-reasoning>
touched: <file-list>
---
<optional additional context>
```

**Types:** feat, fix, refactor, test, docs, chore, perf, style

**Scope:** Module or component name (lowercase)

**Description:** Imperative, <50 chars, no period

---

### B: Consolidation Plan Schema

```yaml
consolidation_plan:
  session: string
  micro_commits_analyzed: number
  base_sha: string
  
  proposed_commits:
    - order: number
      title: string
      body: string | null
      consumes: [string]
      files: [string]
      reasoning: string
      warnings: [string] | null
  
  orphaned_commits: [string] | null
  warnings: [string] | null
```

---

### C: QA Report Schema

```yaml
qa_report:
  session: string
  commits_analyzed: number
  overall_status: pass | fail | warn
  
  commits:
    - sha: string
      title: string
      checks:
        build: { status: pass|fail|skip, error: string|null }
        tests: { status: pass|fail|skip, error: string|null }
        semantic: { status: pass|warn, notes: string|null }
        scope: { status: pass|warn, notes: string|null }
  
  suggested_fixes: [string] | null
```

---

### D: Milestone Thresholds

| Commits | Agent Behavior |
|---------|----------------|
| 10 | Gentle mention of progress |
| 25 | Suggest running /consolidate-plan |
| 50 | Warn, recommend consolidating soon |
| 75+ | Strongly encourage, warn of complexity |

These thresholds are tunable via `.ai-git/config.json`.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0-draft | Dec 2024 | Initial PRD |
| 0.2.0-draft | Dec 2024 | Refactored to agent-first architecture; sessions as core behavior; added milestone detection and proactive suggestions |
| 0.3.0-draft | Dec 2024 | Added failsafe mechanism for graceful degradation during consolidation; recursive reconsolidation with fewer commits on failure |

---

## Open Questions

1. **Session boundaries:** How to handle very long sessions (100+ micro-commits)?
2. **Partial push:** Can user push some consolidated commits, keep working?
3. **Conflict with manual commits:** What if user makes manual commits mid-session?
4. **Multi-branch:** How does this work with feature branches?
5. **Monorepo:** Special considerations for large monorepos?
6. **Tuning thresholds:** Should milestone thresholds be project-configurable?

---

*This document is a living draft. Feedback welcome.*
