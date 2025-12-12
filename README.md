# Pluto

Pluto is a git workflow tool that integrates with AI coding agents. It automatically commits after every file change for granular tracking, then consolidates these micro-commits into clean, informative commit messages. Install Pluto in your repository and let your AI agent handle git operations seamlessly.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/andychuong/pluto/main/install.sh | bash
```

Note: You can update the URL in the curl command to install from a different branch by replacing `main` with your desired branch name.

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

## Development

### Adding New Agent Commands

To add new agent commands or prompts, place them in the `installer/commands` directory under your chosen agent (e.g. claude-code). These files will be automatically included during installation.

## Team

- Alex
- Alexis
- Andy
- Justice
