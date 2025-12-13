# /recover - Recovery from Failed Consolidation

Restore repository state after a failed consolidation attempt.

## Usage
```
/recover [--list] [--to <sha|label>]
```

## Behavior

### List Recovery Points
```
/recover --list
```

Output:
```
## Recovery Points

1. `abc1234` - ses_7x9k2m pre-consolidate (2 hours ago)
2. `def5678` - ses_7x9k2m mid-consolidate (1 hour ago)  
3. `ghi9012` - ses_6j8k1l pre-consolidate (yesterday)

Use `/recover --to abc1234` to restore.
```

### Recover to Point
```
/recover --to abc1234
```

Executes:
```bash
# Abort any in-progress rebase
git rebase --abort 2>/dev/null || true

# Hard reset to recovery point
git reset --hard abc1234

# Clean up state file
rm -f .ai-git/state.json
```

## Recovery Sources

1. **State file:** `.ai-git/recovery` (our explicit checkpoints)
2. **Git reflog:** `git reflog` (automatic git history)

## After Recovery

- Confirm current state: `git log --oneline -5`
- Micro-commits should be restored
- Offer to retry `/consolidate` with different strategy