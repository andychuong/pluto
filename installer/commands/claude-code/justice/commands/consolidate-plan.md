# /consolidate-plan - Dry Run Consolidation

Analyze micro-commits and propose a consolidation plan without executing it.

## Usage
```
/consolidate-plan [--session <id>]
```

## Core Principle: Meaningful Checkpoints

Each consolidated commit should be a **meaningful checkpoint of working code** that:
- Delivers identifiable value (a feature works, a bug is fixed, a component is complete)
- Builds and passes tests
- Is small enough to minimize merge conflicts
- Could be independently reverted if needed

**Target ratio:** 40-60% of original micro-commit count.
- 20 micro-commits → 8-12 consolidated
- 50 micro-commits → 20-30 consolidated

## What Makes a Meaningful Checkpoint?

A checkpoint should answer: "What can the user/system do now that it couldn't before?"

Good checkpoints:
- "Users can now see anti-pattern warnings in the dashboard"
- "The scoring system now uses weighted categories"
- "AI insights are displayed when available"

Bad checkpoints (too granular):
- "Added export to index.ts"
- "Updated types"
- "Fixed typo"

Bad checkpoints (too large):
- "Implemented all of Checkpoint 2" (if it has distinct sub-features)

## Grouping Rules

**Combine into one checkpoint when:**
1. Changes form a complete, usable feature together
2. Individual parts don't work without the others
3. They were made to fulfill the same intent/prompt
4. One is a bug fix for something introduced in the same session

**Keep as separate checkpoints when:**
1. Each delivers independent value (could ship separately)
2. They touch different areas of the codebase
3. Different user prompts drove each change
4. Reverting one shouldn't require reverting the other

## Behavior

1. Gather all micro-commits since last push (or for specified session)
2. Group by delivered value / working feature
3. Verify each group represents a buildable checkpoint
4. Output a detailed plan for user review

## Output Format

Show header, then each commit with: title, value delivered, and files with descriptions.

```
## Consolidation Plan

**Session:** ses_7x9k2m | **Micro-commits:** 20 | **Proposed:** 10

---

### Commit 1: `feat(scoring): implement weighted category scoring`

**Value:** Scoring uses 0-100 scale per category with proper weights (40/35/25)

**Files:**
- `lib/analysis/scoring.ts` — Refactored to return 0-100 per category, added WEIGHTS constant, updated calculateScore() for weighted average
- `components/dashboard/CategoryBar.tsx` — Added weight prop, updated color logic for 0-100 scale
- `components/dashboard/Dashboard.tsx` — Updated CategoryBar with max={100} and weight props

---

[Continue same format for remaining commits...]
```

For each file, explain WHAT changed and WHY in one line.

## After Presenting Plan

Ask the user:
- "Does this grouping look right?"
- "Should any commits be split or merged differently?"
- "Ready to run `/consolidate` to execute this plan?"

## Red Flags (warn user)

- More than 5 micro-commits in one group → check if it should split
- Consolidated count < 30% of micro-commits → probably too aggressive
- Consolidated count > 80% of micro-commits → probably too granular
- Groups spanning multiple unrelated prompts → review grouping

## Notes

- If conflicts or issues are detected, warn the user
- Flag any micro-commits that seem unrelated to the session
- Each consolidated commit should build independently
- **Ask: "Does this commit deliver a complete piece of value?"**