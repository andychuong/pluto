# /consolidate — Execute Consolidation

Rewrite micro-commits into clean, consolidated commits with automatic failsafe recovery.

## Usage

```
/consolidate [--plan <file>] [--no-qa] [--no-failsafe]
```

## Behavior

1. If no plan provided, first run `consolidation-agent` to generate one
2. Save current HEAD to `.ai-git/recovery` for reflog reference
3. Execute interactive rebase to consolidate commits
4. Run `qa-agent` on each consolidated commit sequentially
5. If QA fails, trigger failsafe mechanism (unless `--no-failsafe`)
6. Report results

## Execution Steps

```bash
# 1. Save recovery point
echo "$(git rev-parse HEAD) $(date -Iseconds) pre-consolidate" >> .ai-git/recovery

# 2. Execute rebase per consolidation plan
git rebase -i <base-commit>
```

## Rebase Strategy

For each consolidated commit group:
1. `pick` the first micro-commit in the group
2. `fixup` all subsequent micro-commits in the group
3. `reword` to set the final commit message

## QA Integration

After consolidation, QA runs **sequentially** on each commit:

```
[A] → QA pass → lock in
[B] → QA pass → lock in
[C] → QA fail → trigger failsafe
```

This sequential approach enables the failsafe to preserve verified work.

---

## Failsafe Mechanism

When QA fails on a consolidated commit, the failsafe prevents total failure by preserving verified commits and retrying with fewer commits.

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
RETRY WITH: 2 commits [C', D'] ← reconsolidate into fewer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reconsolidation attempt #1 (N-1 = 2 commits):

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

Report: "Consolidated 2 commits. Remaining 18 micro-commits 
        could not be consolidated (possible code issue)."
```

### Failsafe Algorithm

```
function consolidate_with_failsafe(micro_commits):
    verified_commits = []
    remaining_micros = micro_commits
    target_count = original_plan.length
    
    while remaining_micros not empty:
        # Generate plan for remaining work
        plan = consolidation_agent(remaining_micros, target_count)
        
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
            # Can't consolidate at all, preserve micros
            break
    
    return {
        verified: verified_commits,
        unconsolidated: remaining_micros
    }
```

---

## State Tracking

Progress saved to `.ai-git/state.json`:

```json
{
  "session": "ses_7x9k2m",
  "original_head": "abc123",
  "status": "consolidating",
  "verified_commits": [
    {
      "title": "feat(auth): add JWT middleware",
      "sha": "def456",
      "consumed": ["c1", "c2", "c5", "c7", "c12", "c15"],
      "qa_status": "pass"
    },
    {
      "title": "test(auth): add auth tests",
      "sha": "ghi789",
      "consumed": ["c8", "c9", "c14", "c18"],
      "qa_status": "pass"
    }
  ],
  "unconsolidated_micros": ["c19", "c20", "c21", "..."],
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
✓ Consolidation complete

  23 micro-commits → 4 consolidated commits
  
  [A] feat(auth): add JWT middleware
  [B] test(auth): add auth test suite
  [C] feat(api): add protected routes
  [D] docs: update API documentation
  
  All commits verified. Ready to push.
```

### Partial Success (Failsafe)

```
⚠ Consolidation partially complete

  23 micro-commits → 2 consolidated + 11 unconsolidated
  
  Verified:
  [A] feat(auth): add JWT middleware ✓
  [B] test(auth): add auth test suite ✓
  
  Unconsolidated (11 micro-commits):
  Could not consolidate remaining commits after 3 attempts.
  Last error: "Cannot find module '../utils/hash'" at c15
  
  Options:
  1. Push verified commits now, fix issues, consolidate rest later
  2. /recover to restore all micro-commits and try different approach
  3. Review unconsolidated micro-commits manually
```

### Total Failure (Rare)

```
✗ Consolidation failed

  Could not verify any consolidated commits.
  
  Error: First commit failed build check.
  "Cannot find module 'jsonwebtoken'" - missing dependency?
  
  All 23 micro-commits preserved.
  
  Suggestions:
  1. Check if dependencies were installed
  2. /recover --list to see recovery points
  3. Try consolidating a smaller portion manually
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

## Integration

After consolidation (success or partial):
- Update `.ai-git/sessions.json` with results
- Clear or update `.ai-git/state.json`
- Report to user with clear next steps
