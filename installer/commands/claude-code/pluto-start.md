# Pluto Start - Enable Auto-Commit Tracking

Enable automatic commit tracking for this session. When you make code changes, they will be tracked and committed with explanations before the context is summarized.

## Instructions

When this command is run:

1. **Acknowledge** that Pluto tracking is now enabled for this session

2. **Remember** for the rest of this conversation:
   - Before you finish any response where you modified code, run `/pluto-snap` to commit your changes
   - Include an explanation of WHY you made the changes in the commit

3. **Inform the user**:
   ```
   🪐 Pluto tracking enabled!

   I'll automatically commit changes with explanations before finishing each task.
   You can also run /pluto-snap manually at any time.
   ```

## What This Does

- Enables automatic commit tracking for this session only
- Each time you modify code, you'll commit with:
  - The original user prompt
  - An explanation of why you made the changes
  - A list of files changed
- Commits happen before context summarization to preserve history

## To Disable

Simply start a new session without running /pluto-start, or tell me to stop tracking.
