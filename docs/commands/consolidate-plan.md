# /consolidate-plan - Dry Run Consolidation

Analyze micro-commits and propose a consolidation plan without executing it.

## Usage
```
/consolidate-plan [--session <id>]
```

## Behavior

1. Gather all micro-commits since last push (or for specified session)
2. Call the `consolidation-agent` to analyze and group them
3. Output a detailed plan for user review

## Output Format

Present the plan clearly:
```
## Consolidation Plan

**Session:** ses_7x9k2m  
**Micro-commits:** 34  
**Proposed consolidated:** 4

---

### Commit 1: `feat(auth): add JWT authentication middleware`

**Combines micro-commits:** c1, c2, c5, c7, c8, c12, c15, c19

**Files:**
- `src/middleware/auth.ts` (new)
- `src/types/auth.ts` (new)  
- `src/errors/AuthError.ts` (new)

**Reasoning:** These commits all implement the core authentication 
feature. c5 was a typo fix for c2, c15 added error handling that 
belongs with the initial implementation.

---

### Commit 2: `test(auth): add authentication test suite`

...etc
```

## After Presenting Plan

Ask the user:
- "Does this grouping look right?"
- "Should any commits be split or merged differently?"
- "Ready to run `/consolidate` to execute this plan?"

## Notes

- If conflicts or issues are detected, warn the user
- Flag any micro-commits that seem unrelated to the session
- Note if any proposed commits might have build issues