# /pluto-fuse — Execute Fusion

Rewrite micro-commits into clean, fused commits with automatic failsafe recovery.

## Usage

```
/pluto-fuse [--plan <file>] [--no-qa] [--no-failsafe]
```

## Core Principle: Meaningful Checkpoints

Each fused commit should be a **meaningful checkpoint of working code** that:
- Delivers identifiable value (a feature works, a component is complete)
- Builds and passes tests
- Is small enough to minimize merge conflicts
- Could be independently reverted if needed

**Target ratio:** 40-60% of original micro-commit count.
- 20 micro-commits → 8-12 fused
- 50 micro-commits → 20-30 fused

**Key question:** "What can the user/system do now that it couldn't before?"

## Scope: Global Fusion

Fusion is **global across all sessions**. When triggered:

1. Gather ALL micro-commits since last push (from all concurrent sessions)
2. Group by delivered value / working feature
3. Result is a unified clean history reflecting all sessions' work

```bash
# Find ALL micro-commits (from any session)
git log --grep="^session:" --format="%H" origin/main..HEAD
```

This means when you say "push" in one session, all concurrent sessions'
micro-commits get fused together.

## Behavior

1. If no plan provided, first run `fusion-agent` to generate one
2. Save current HEAD to `.ai-git/recovery` for reflog reference
3. Execute interactive rebase to fuse commits
4. Run `qa-agent` on each fused commit sequentially
5. If QA fails, trigger failsafe mechanism (unless `--no-failsafe`)
6. Report results
7. Clear all session state (all sessions' micro-commits are now fused)

## Execution Steps

```bash
# 1. Save recovery point
echo "$(git rev-parse HEAD) $(date -Iseconds) pre-fusion" >> .ai-git/recovery

# 2. Execute rebase per fusion plan
git rebase -i <base-commit>
```

## Rebase Strategy

For each fused commit group:
1. `pick` the first micro-commit in the group
2. `fixup` all subsequent micro-commits in the group
3. `reword` to set the final commit message

## QA Integration

After fusion, QA runs **sequentially** on each commit:

```
[A] → QA pass → lock in
[B] → QA pass → lock in
[C] → QA fail → trigger failsafe
```

This sequential approach enables the failsafe to preserve verified work.

---

## Failsafe Mechanism

When QA fails on a fused commit, the failsafe prevents total failure by preserving verified commits and retrying with fewer commits.

### How It Works

```
Original plan: 5 commits from 30 micro-commits

[A]───[B]───[C]───[D]───[E]
 │     │     │     │     │
 c1-6  c7-12 c13-18 c19-24 c25-30

QA sequence:
  A → ✓ pass (locked in)
  B → ✓ pass (locked in)
  C → ✗ FAIL

Failsafe activates:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFIED: [A, B] ← these are safe, keep them

REMAINING: c13-30 (18 micro-commits)
ORIGINAL GROUPING: 3 commits [C, D, E]
RETRY WITH: 2 commits [C', D'] ← re-fuse into fewer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Re-fusion attempt #1 (N-1 = 2 commits):

[A]───[B]───[C']───[D']
             │      │
             c13-21 c22-30  ← different grouping!

QA sequence:
  C' → ✓ pass (larger commit includes missing dependency)
  D' → ✓ pass

SUCCESS: 4 verified commits
```

### Recursive Retry

If the first retry fails, continue reducing:

```
Attempt 1: [C', D']     (2 commits) → C' fails
Attempt 2: [C'']        (1 commit)  → C'' passes

Result: [A]─[B]─[C''] = 3 verified commits
```

### Final Fallback

If even a single commit fails, preserve micro-commits:

```
Attempt 1: [C', D']  → fails
Attempt 2: [C'']     → fails (code genuinely broken?)

Result: 
  [A]─[B]─[c13]─[c14]─[c15]─...─[c30]
   │   │    
   └───┴── verified    └── micro-commits preserved

Report: "Fused 2 commits. Remaining 18 micro-commits 
        could not be fused (possible code issue)."
```

### Failsafe Algorithm

```
function fuse_with_failsafe(micro_commits):
    verified_commits = []
    remaining_micros = micro_commits
    target_count = original_plan.length
    
    while remaining_micros not empty:
        # Generate plan for remaining work
        plan = fusion_agent(remaining_micros, target_count)
        
        for commit in plan:
            result = qa_check(commit)
            
            if result.passed:
                verified_commits.append(commit)
                remaining_micros -= commit.consumed_micros
            else:
                # Failed - reduce target and retry remaining
                target_count = max(1, current_remaining_count - 1)
                break  # exit inner loop, retry with fewer
        
        if all_passed:
            break  # success, exit outer loop
        
        if target_count < 1:
            # Can't fuse at all, preserve micros
            break
    
    return {
        verified: verified_commits,
        unfused: remaining_micros
    }
```

---

## State Tracking

Progress saved to `.ai-git/state.json`:

```json
{
  "sessions_fused": ["ses_7x9k2m", "ses_abc123", "ses_def456"],
  "original_head": "abc123",
  "status": "fusing",
  "verified_commits": [
    {
      "title": "feat(auth): add JWT middleware",
      "sha": "def456",
      "from_sessions": ["ses_7x9k2m"],
      "consumed": ["c1", "c2", "c5", "c7", "c12", "c15"],
      "qa_status": "pass"
    },
    {
      "title": "test(auth): add auth tests",
      "sha": "ghi789",
      "from_sessions": ["ses_7x9k2m"],
      "consumed": ["c8", "c9", "c14", "c18"],
      "qa_status": "pass"
    },
    {
      "title": "fix(ui): button alignment",
      "sha": "jkl012",
      "from_sessions": ["ses_abc123"],
      "consumed": ["b1", "b2", "b3"],
      "qa_status": "pass"
    }
  ],
  "unfused_micros": ["c19", "c20", "c21", "..."],
  "failsafe": {
    "activated": true,
    "original_target": 5,
    "current_target": 2,
    "attempts": [
      {"target": 3, "failed_at": "commit 3", "error": "build failed"},
      {"target": 2, "failed_at": "commit 3", "error": "build failed"}
    ]
  }
}
```

---

## Output Examples

### Full Success

```
✓ Fusion complete

  20 micro-commits → 10 fused commits

  [1] feat(scoring): implement weighted category scoring
  [2] feat(analysis): detect anti-pattern commits
  [3] feat(ui): display anti-pattern warnings
  [4] feat(ai): add OpenAI client with retry logic
  [5] feat(types): add AI analysis types
  [6] feat(api): integrate AI analysis into route
  [7] feat(ui): display AI insights in dashboard
  [8] fix(ai): lazy-init client for build compatibility
  [9] feat(ui): add commit activity chart
  [10] fix(api): use Zod v4 error format

  All commits verified. Ready to push.
```

### Partial Success (Failsafe)

```
⚠ Fusion partially complete

  20 micro-commits → 7 fused + 6 unfused

  Verified:
  [1] feat(scoring): implement weighted category scoring ✓
  [2] feat(analysis): detect anti-pattern commits ✓
  [3] feat(ui): display anti-pattern warnings ✓
  [4] feat(ai): add OpenAI client with retry logic ✓
  [5] feat(types): add AI analysis types ✓
  [6] feat(api): integrate AI analysis into route ✓
  [7] feat(ui): display AI insights in dashboard ✓

  Unfused (6 micro-commits):
  Could not fuse remaining commits after 3 attempts.
  Last error: "Cannot find module '../utils/hash'" at c15

  Options:
  1. Push verified commits now, fix issues, fuse rest later
  2. /recover to restore all micro-commits and try different approach
  3. Review unfused micro-commits manually
```

### Total Failure (Rare)

```
✗ Fusion failed

  Could not verify any fused commits.

  Error: First commit failed build check.
  "Cannot find module 'jsonwebtoken'" - missing dependency?

  All 20 micro-commits preserved.

  Suggestions:
  1. Check if dependencies were installed
  2. /recover --list to see recovery points
  3. Try fusing a smaller portion manually
```

---

## Flags

| Flag | Description |
|------|-------------|
| `--plan <file>` | Use existing plan file instead of generating |
| `--no-qa` | Skip QA checks (not recommended) |
| `--no-failsafe` | Disable failsafe, fail entirely on first QA error |

---

## On Failure

- **Never leave repo in broken state**
- If mid-rebase: `git rebase --abort`
- Always offer `/recover` command
- Explain what went wrong clearly
- Suggest concrete next steps

---

## Post-Fusion Cleanup

After fusion (success or partial):

```bash
# Clear all session tracking (all sessions' commits are now fused)
rm -f .ai-git/sessions/*.json
rm -f .ai-git/current-session

# Update state file
# On success: remove state.json
# On partial: keep state.json with unfused info
```

Any session that continues working after fusion will auto-start
a fresh session. Their new micro-commits will be fused in the
next push cycle.

## Integration

After fusion (success or partial):
- Clear all session state (micro-commits are now in clean history)
- Update or remove `.ai-git/state.json`
- Report to user with clear next steps
