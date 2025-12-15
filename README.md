# Pluto

Pluto is a git workflow tool for AI coding agents. It tracks every file change as atomic "fibers," then consolidates them into clean, meaningful commits called "threads." Install Pluto in your repository and let your AI agent handle git operations seamlessly.

## Key Concepts

- **Fibers**: Atomic work commits created after every file change. Each fiber captures a single logical change with full context (prompt, reason, timestamp).
- **Threads**: Clean, meaningful commits created by spinning fibers together.
- **Sessions**: Tracked development sessions with unique IDs for organizing work.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/andychuong/pluto/main/install.sh | bash
```

Note: You can install from a different branch by replacing `main` with your desired branch name in the URL.

### Requirements

- Node.js 18+
- npm

## Usage

### Initialize Pluto in your project

```bash
pluto init
```

### Update agents to latest versions

```bash
# Update from default remote repository
pluto update

# Update from specific branch
pluto update --branch main
```

### List available commands

```bash
pluto list
```

## Agent Commands

Once Pluto is initialized, these commands become available to your AI agent:

### /pluto-start

Initialize a tracked development session. Run this at the start of every agent window or after compaction.

- Generates a unique session ID
- Creates an initial session commit
- Activates automatic fiber tracking

### /pluto-spin

Consolidate fibers into clean threads with QA validation.

```
/pluto-spin [--plan <file>] [--no-qa] [--no-failsafe]
```

- Groups related fibers into logical threads
- Validates each thread passes QA before rewriting history
- Presents a plan for user approval before execution

### /pluto-weave

Merge remote changes with AI-driven conflict resolution.

```
/pluto-weave [--target <branch>] [--no-qa]
```

- Analyzes local threads and remote commits for context
- Automatically resolves conflicts when confident
- Escalates architectural or ambiguous decisions to humans
- Validates merged state with QA before committing

### /pluto-recover

Restore repository state after a failed operation.

```
/pluto-recover [--list] [--to <sha|label>]
```

- Lists available recovery points
- Safely restores to a previous state

## Development

### Adding New Agent Commands

To add new agent commands or prompts, place them in the `installer/commands` directory under your chosen agent (e.g., claude-code). These files will be automatically included during installation.

## Team

<a href="https://github.com/alexander-t-ho"><img src="https://github.com/alexander-t-ho.png" width="60px" alt="Alexander Ho" /></a>
<a href="https://github.com/amanyrath"><img src="https://github.com/amanyrath.png" width="60px" alt="Alexis Manyrath" /></a>
<a href="https://github.com/andychuong"><img src="https://github.com/andychuong.png" width="60px" alt="Andy Chuong" /></a>
<a href="https://github.com/Justiceleeg"><img src="https://github.com/Justiceleeg.png" width="60px" alt="Justice White" /></a>

**Alexander Ho** · **Alexis Manyrath** · **Andy Chuong** · **Justice White**
