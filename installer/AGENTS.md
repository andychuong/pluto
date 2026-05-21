# AGENTS.md instructions for Pluto

## Turn Enforcement
- On every user turn, check whether Pluto session tracking is active before making edits.
- Session-active check: read `.ai-git/session.json`; if it exists and `active` is `true`, enforce prompt logging.
- If session is active, create a `type: prompt` empty commit BEFORE any code changes or file edits.
- Prompt commit must include: `session`, `timestamp`, `intent`, `context`, `dependencies`, verbatim `prompt`, and `type: prompt`.
- During active sessions, `type: work` commits must be minimal working pieces (single micro-intent); split unrelated edits into separate fibers.
- Do not skip prompt logging during an active session, even for small requests.

## Skills
A skill is a set of local instructions stored in a `SKILL.md` file.
### Available skills
- pluto-recover: Restore repository state after a failed spin or weave attempt. (file: .codex/skills/pluto-recover/SKILL.md)
- pluto-rewrite: Intelligently rewrite commit history into clean threads using full context analysis. (file: .codex/skills/pluto-rewrite/SKILL.md)
- pluto-spin: Spin fibers into clean threads with automatic failsafe recovery. (file: .codex/skills/pluto-spin/SKILL.md)
- pluto-spin-weave: Consolidate fibers into clean threads AND integrate with target branch to produce PR-ready code in one operation. (file: .codex/skills/pluto-spin-weave/SKILL.md)
- pluto-start: Start a tracked development session with automatic fiber workflow. (file: .codex/skills/pluto-start/SKILL.md)
- pluto-weave: Weave remote changes into local threads with Codex as the decision-maker. (file: .codex/skills/pluto-weave/SKILL.md)
- qa-orchestrator: You validate that each proposed thread "works" before the rebase happens. (file: .codex/skills/qa-orchestrator/SKILL.md)
- weave-qa-agent: You are a specialist Codex helper skill for validating merged code state before committing. (file: .codex/skills/weave-qa-agent/SKILL.md)

### How to use skills
- If a user request clearly matches a Pluto workflow, use the corresponding skill.
- Read only the needed sections from `SKILL.md` and execute the workflow directly.
- If a skill is missing or unclear, continue with the best fallback and note the gap.
