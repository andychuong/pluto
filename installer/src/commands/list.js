import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

const AVAILABLE_AGENTS = [
  {
    name: 'Code Reviewer',
    value: 'code-reviewer',
    description: 'Reviews code for best practices, bugs, and improvements'
  },
  {
    name: 'Test Generator',
    value: 'test-generator',
    description: 'Generates comprehensive test suites for your code'
  },
  {
    name: 'Documentation Writer',
    value: 'doc-writer',
    description: 'Creates and updates documentation for your codebase'
  },
  {
    name: 'Refactoring Assistant',
    value: 'refactor',
    description: 'Helps refactor code for better maintainability'
  },
  {
    name: 'Security Auditor',
    value: 'security',
    description: 'Scans code for security vulnerabilities'
  },
  {
    name: 'Performance Optimizer',
    value: 'performance',
    description: 'Identifies and fixes performance bottlenecks'
  },
];

const AI_TOOLS = [
  { name: 'Claude Code', value: 'claude-code' },
  { name: 'Cursor', value: 'cursor' },
  { name: 'Windsurf', value: 'windsurf' },
  { name: 'GitHub Copilot', value: 'copilot' },
  { name: 'Cline', value: 'cline' },
  { name: 'Codex', value: 'codex' },
];

export async function list() {
  console.log(chalk.cyan('\n═══════════════════════════════════════════'));
  console.log(chalk.bold('\n🤖 Available Agents:\n'));

  for (const agent of AVAILABLE_AGENTS) {
    console.log(chalk.white(`  ${chalk.bold(agent.name)}`));
    console.log(chalk.dim(`     ${agent.description}`));
    console.log('');
  }

  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.bold('\n🛠️  Supported AI Tools:\n'));

  for (const tool of AI_TOOLS) {
    console.log(chalk.white(`  • ${tool.name}`));
  }

  // Check if pluto is configured in current project
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.pluto', 'config.json');

  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    console.log(chalk.cyan('\n═══════════════════════════════════════════'));
    console.log(chalk.bold('\n📦 Currently Installed (this project):\n'));

    if (config.tools && config.tools.length > 0) {
      console.log(chalk.white('  Tools:'));
      for (const toolValue of config.tools) {
        const tool = AI_TOOLS.find(t => t.value === toolValue);
        console.log(chalk.green(`    ✓ ${tool?.name || toolValue}`));
      }
    }

    if (config.agents && config.agents.length > 0) {
      console.log(chalk.white('\n  Agents:'));
      for (const agentValue of config.agents) {
        const agent = AVAILABLE_AGENTS.find(a => a.value === agentValue);
        console.log(chalk.green(`    ✓ ${agent?.name || agentValue}`));
      }
    }

    console.log(chalk.dim(`\n  Installed: ${new Date(config.installedAt).toLocaleDateString()}`));

  } catch {
    console.log(chalk.cyan('\n═══════════════════════════════════════════'));
    console.log(chalk.yellow('\n⚠ Pluto is not configured in this project.'));
    console.log(chalk.dim('  Run `pluto init` to get started.\n'));
  }

  console.log('');
}
