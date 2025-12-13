# Pluto Snap - Auto-commit with Prompt & Explanation

Commit the current changes with the original prompt and an explanation of why you made the changes.

## Instructions

1. **Get the original user prompt** from your conversation context (the task the user asked you to do)

2. **Get the changed files** by running:
   ```bash
   git status --porcelain
   ```

3. **Stage all changes**:
   ```bash
   git add -A
   ```

4. **Write an explanation** of WHY you made these changes:
   - What problem were you solving?
   - Why did you choose this approach?
   - What does each changed file do?

5. **Create a commit** with this format:
   ```
   <type>: <short summary of what was done>

   Prompt: <the original user prompt>

   Why: <your explanation of why you made these changes>

   Files changed:
   - <file1> (created/modified/deleted) - <brief description>
   - <file2> (created/modified/deleted) - <brief description>
   ...

   🤖 Generated with Pluto
   ```

6. **Determine the commit type** from the prompt/changes:
   - `feat:` - new feature or functionality
   - `fix:` - bug fix
   - `refactor:` - code refactoring
   - `test:` - adding or updating tests
   - `docs:` - documentation changes
   - `style:` - formatting, styling
   - `chore:` - maintenance, dependencies

7. **Keep the title under 72 characters**

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

Why: Created a new LoginForm component with controlled inputs for email and password. Added validation utilities to check email format and password strength (min 8 chars, requires number). Updated the index page to render the new form. Used React state for form management to keep it simple and avoid external dependencies.

Files changed:
- src/components/LoginForm.tsx (created) - Form component with email/password inputs
- src/utils/validation.ts (modified) - Added validateEmail and validatePassword functions
- src/pages/index.tsx (modified) - Added LoginForm to the page

🤖 Generated with Pluto"
```

## After Committing

Report the commit hash to confirm success:
```bash
git rev-parse --short HEAD
```
