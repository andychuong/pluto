# Contributing to Pluto

Thank you for your interest in contributing to Pluto! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Git

### Setting Up Your Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pluto.git
   cd pluto
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (OS, Node.js version, etc.)

### Suggesting Enhancements

We welcome feature suggestions! Please create an issue with:
- A clear description of the enhancement
- Use cases and benefits
- Any potential implementation details

### Pull Requests

1. Make your changes in your feature branch
2. Test your changes thoroughly
3. Commit your changes with clear, descriptive commit messages
4. Push to your fork
5. Create a pull request to the main repository

#### Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Include tests if applicable
- Update documentation as needed
- Follow the existing code style
- Ensure all tests pass
- Provide a clear description of the changes

## Development Guidelines

### Adding New Agent Commands

To add new agent commands or prompts:
1. Place them in the `installer/commands` directory under your chosen agent (e.g., `claude-code`)
2. Follow the existing file structure and naming conventions
3. Test the command thoroughly before submitting

### Code Style

- Write clear, readable code
- Add comments for complex logic
- Use meaningful variable and function names
- Follow JavaScript/TypeScript best practices

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb in present tense (e.g., "Add", "Fix", "Update")
- Keep the first line under 50 characters
- Provide additional details in the body if needed

Example:
```
Add support for custom branch selection

- Implement --branch flag for update command
- Update documentation with new usage examples
- Add validation for branch names
```

## Testing

Before submitting a pull request:
- Test your changes locally
- Ensure existing functionality still works
- Test edge cases and error scenarios

## Questions?

If you have questions or need help, feel free to:
- Open an issue for discussion
- Reach out to the maintainers


---

Thank you for contributing to Pluto!
