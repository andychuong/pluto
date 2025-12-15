# /pluto-recover - Recovery from Failed Operations

Restore repository state after a failed spin or weave attempt.

## Usage
```
/pluto-recover [--list] [--to <sha|label>]
```

## Behavior

### List Recovery Points
```
/pluto-recover --list
```

Output:
```
## Recovery Points

1. `abc1234` - pre-spin (2 hours ago)
2. `def5678` - pre-weave (1 hour ago)
3. `ghi9012` - pre-spin (yesterday)

Use `/pluto-recover --to abc1234` to restore.
```

### Recover to Point
```
/pluto-recover --to abc1234
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
- Fibers should be restored
- Offer to retry `/pluto-spin` with different strategy