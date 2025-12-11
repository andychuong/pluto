# Pluto Snap - Auto-commit with Prompt

Commit the current changes with the prompt that generated them.

## Instructions

1. **Check for tracked prompt** (from automatic hook):
   ```bash
   cat .pluto/.last_prompt 2>/dev/null
   ```
   If this file exists, use its content as the original prompt.
   If it doesn't exist, get the original prompt from your conversation context.

2. **Get the changed files** by running:
   ```bash
   git status --porcelain
   ```

3. **Stage all changes**:
   ```bash
   git add -A
   ```

4. **Create a commit** with this format:
   ```
   <type>: <short summary of what was done>

   Prompt: <the original user prompt>

   Files changed:
   - <file1> (created/modified/deleted)
   - <file2> (created/modified/deleted)
   ...

   🤖 Generated with Pluto
   ```

5. **Determine the commit type** from the prompt/changes:
   - `feat:` - new feature or functionality
   - `fix:` - bug fix
   - `refactor:` - code refactoring
   - `test:` - adding or updating tests
   - `docs:` - documentation changes
   - `style:` - formatting, styling
   - `chore:` - maintenance, dependencies

6. **Keep the title under 72 characters**

## Example

If the user prompt was: "Add a login form with email and password validation"

And git status shows:
```
A  src/components/LoginForm.tsx
M  src/utils/validation.ts
M  src/pages/index.tsx
```

Then run:
```bash
git add -A
git commit -m "feat: Add login form with email and password validation

Prompt: Add a login form with email and password validation

Files changed:
- src/components/LoginForm.tsx (created)
- src/utils/validation.ts (modified)
- src/pages/index.tsx (modified)

🤖 Generated with Pluto"
```

## After Committing

1. Report the commit hash to confirm success:
   ```bash
   git rev-parse --short HEAD
   ```

2. Clean up tracking files:
   ```bash
   rm -f .pluto/.last_prompt .pluto/.changed_files .pluto/.files_to_commit
   ```
