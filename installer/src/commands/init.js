import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_TOOLS = [
  { name: 'Claude Code', value: 'claude-code', dir: '.claude/commands' },
  { name: 'Cursor', value: 'cursor', dir: '.cursor/rules' },
  { name: 'Windsurf', value: 'windsurf', dir: '.windsurf/rules' },
  { name: 'GitHub Copilot', value: 'copilot', dir: '.github/copilot-instructions.md' },
  { name: 'Cline', value: 'cline', dir: '.cline/rules' },
  { name: 'Codex', value: 'codex', dir: 'AGENTS.md' },
];

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

export async function init() {
  console.log(chalk.yellow('\n📋 Let\'s set up Pluto for your project!\n'));

  // Step 1: Select AI coding tools
  const { selectedTools } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedTools',
      message: 'Which AI coding tools do you use? (Space to select, Enter to confirm)',
      choices: AI_TOOLS.map(tool => ({
        name: `${tool.name}`,
        value: tool.value,
        checked: false
      })),
      validate: (answer) => {
        if (answer.length < 1) {
          return 'You must choose at least one AI tool.';
        }
        return true;
      }
    }
  ]);

  console.log(chalk.green(`\n✓ Selected tools: ${selectedTools.map(t => AI_TOOLS.find(at => at.value === t)?.name).join(', ')}\n`));

  // Step 2: Select agents/commands to install
  const { selectedAgents } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedAgents',
      message: 'Which agents/commands would you like to install?',
      choices: AVAILABLE_AGENTS.map(agent => ({
        name: `${agent.name} - ${chalk.dim(agent.description)}`,
        value: agent.value,
        checked: false
      })),
      pageSize: 10
    }
  ]);

  if (selectedAgents.length === 0) {
    console.log(chalk.yellow('\n⚠ No agents selected. You can run `pluto init` again to add agents later.\n'));
  } else {
    console.log(chalk.green(`\n✓ Selected agents: ${selectedAgents.map(a => AVAILABLE_AGENTS.find(aa => aa.value === a)?.name).join(', ')}\n`));
  }

  // Step 3: Confirm installation
  const { confirmInstall } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmInstall',
      message: 'Ready to install? This will create configuration files in your project.',
      default: true
    }
  ]);

  if (!confirmInstall) {
    console.log(chalk.yellow('\n⚠ Installation cancelled.\n'));
    return;
  }

  // Step 4: Install configurations
  const spinner = ora('Installing configurations...').start();

  try {
    const cwd = process.cwd();

    for (const toolValue of selectedTools) {
      const tool = AI_TOOLS.find(t => t.value === toolValue);
      if (!tool) continue;

      spinner.text = `Setting up ${tool.name}...`;

      await installForTool(cwd, tool, selectedAgents);
    }

    // Create pluto config file
    const config = {
      version: '1.0.0',
      tools: selectedTools,
      agents: selectedAgents,
      installedAt: new Date().toISOString()
    };

    await fs.mkdir(path.join(cwd, '.pluto'), { recursive: true });
    await fs.writeFile(
      path.join(cwd, '.pluto', 'config.json'),
      JSON.stringify(config, null, 2)
    );

    spinner.succeed(chalk.green('Installation complete!'));

    // Show summary
    console.log(chalk.cyan('\n═══════════════════════════════════════════'));
    console.log(chalk.bold('\n📦 Installation Summary:\n'));

    for (const toolValue of selectedTools) {
      const tool = AI_TOOLS.find(t => t.value === toolValue);
      console.log(chalk.white(`  ${tool?.name}:`));
      console.log(chalk.dim(`    → ${tool?.dir}`));
    }

    if (selectedAgents.length > 0) {
      console.log(chalk.bold('\n🤖 Installed Agents:\n'));
      for (const agentValue of selectedAgents) {
        const agent = AVAILABLE_AGENTS.find(a => a.value === agentValue);
        console.log(chalk.white(`  • ${agent?.name}`));
      }
    }

    console.log(chalk.cyan('\n═══════════════════════════════════════════'));
    console.log(chalk.green('\n✨ You\'re all set! Your AI coding tools are now configured.\n'));

    if (selectedTools.includes('claude-code')) {
      console.log(chalk.dim('Tip: Restart Claude Code to load the new slash commands.\n'));
    }

  } catch (error) {
    spinner.fail(chalk.red('Installation failed'));
    console.error(chalk.red(`\nError: ${error.message}\n`));
  }
}

async function installForTool(cwd, tool, agents) {
  const agentsDir = path.join(__dirname, '..', '..', 'agents');

  switch (tool.value) {
    case 'claude-code':
      await installClaudeCode(cwd, tool, agents, agentsDir);
      break;
    case 'cursor':
      await installCursor(cwd, tool, agents, agentsDir);
      break;
    case 'windsurf':
      await installWindsurf(cwd, tool, agents, agentsDir);
      break;
    case 'copilot':
      await installCopilot(cwd, tool, agents, agentsDir);
      break;
    case 'cline':
      await installCline(cwd, tool, agents, agentsDir);
      break;
    case 'codex':
      await installCodex(cwd, tool, agents, agentsDir);
      break;
  }
}

async function installClaudeCode(cwd, tool, agents, agentsDir) {
  const commandsDir = path.join(cwd, '.claude', 'commands');
  await fs.mkdir(commandsDir, { recursive: true });

  for (const agentValue of agents) {
    const sourcePath = path.join(agentsDir, 'claude-code', `${agentValue}.md`);
    const destPath = path.join(commandsDir, `${agentValue}.md`);

    try {
      const content = await fs.readFile(sourcePath, 'utf-8');
      await fs.writeFile(destPath, content);
    } catch {
      // If agent file doesn't exist, create a placeholder
      await fs.writeFile(destPath, getPlaceholderContent(agentValue, 'claude-code'));
    }
  }
}

async function installCursor(cwd, tool, agents, agentsDir) {
  const rulesDir = path.join(cwd, '.cursor', 'rules');
  await fs.mkdir(rulesDir, { recursive: true });

  for (const agentValue of agents) {
    const sourcePath = path.join(agentsDir, 'cursor', `${agentValue}.mdc`);
    const destPath = path.join(rulesDir, `${agentValue}.mdc`);

    try {
      const content = await fs.readFile(sourcePath, 'utf-8');
      await fs.writeFile(destPath, content);
    } catch {
      await fs.writeFile(destPath, getPlaceholderContent(agentValue, 'cursor'));
    }
  }
}

async function installWindsurf(cwd, tool, agents, agentsDir) {
  const rulesDir = path.join(cwd, '.windsurf', 'rules');
  await fs.mkdir(rulesDir, { recursive: true });

  for (const agentValue of agents) {
    const sourcePath = path.join(agentsDir, 'windsurf', `${agentValue}.md`);
    const destPath = path.join(rulesDir, `${agentValue}.md`);

    try {
      const content = await fs.readFile(sourcePath, 'utf-8');
      await fs.writeFile(destPath, content);
    } catch {
      await fs.writeFile(destPath, getPlaceholderContent(agentValue, 'windsurf'));
    }
  }
}

async function installCopilot(cwd, tool, agents, agentsDir) {
  const githubDir = path.join(cwd, '.github');
  await fs.mkdir(githubDir, { recursive: true });

  // Copilot uses a single instructions file
  let content = '# GitHub Copilot Instructions\n\n';
  content += 'These instructions were generated by Pluto.\n\n';

  for (const agentValue of agents) {
    const sourcePath = path.join(agentsDir, 'copilot', `${agentValue}.md`);

    try {
      const agentContent = await fs.readFile(sourcePath, 'utf-8');
      content += agentContent + '\n\n';
    } catch {
      content += getPlaceholderContent(agentValue, 'copilot') + '\n\n';
    }
  }

  await fs.writeFile(path.join(githubDir, 'copilot-instructions.md'), content);
}

async function installCline(cwd, tool, agents, agentsDir) {
  const rulesDir = path.join(cwd, '.cline', 'rules');
  await fs.mkdir(rulesDir, { recursive: true });

  for (const agentValue of agents) {
    const sourcePath = path.join(agentsDir, 'cline', `${agentValue}.md`);
    const destPath = path.join(rulesDir, `${agentValue}.md`);

    try {
      const content = await fs.readFile(sourcePath, 'utf-8');
      await fs.writeFile(destPath, content);
    } catch {
      await fs.writeFile(destPath, getPlaceholderContent(agentValue, 'cline'));
    }
  }
}

async function installCodex(cwd, tool, agents, agentsDir) {
  // Codex uses AGENTS.md at root
  let content = '# AI Agents Configuration\n\n';
  content += 'This file was generated by Pluto for Codex compatibility.\n\n';

  for (const agentValue of agents) {
    const sourcePath = path.join(agentsDir, 'codex', `${agentValue}.md`);

    try {
      const agentContent = await fs.readFile(sourcePath, 'utf-8');
      content += agentContent + '\n\n';
    } catch {
      content += getPlaceholderContent(agentValue, 'codex') + '\n\n';
    }
  }

  await fs.writeFile(path.join(cwd, 'AGENTS.md'), content);
}

function getPlaceholderContent(agentValue, toolType) {
  const agentNames = {
    'code-reviewer': 'Code Reviewer',
    'test-generator': 'Test Generator',
    'doc-writer': 'Documentation Writer',
    'refactor': 'Refactoring Assistant',
    'security': 'Security Auditor',
    'performance': 'Performance Optimizer'
  };

  const name = agentNames[agentValue] || agentValue;

  return `# ${name}

## Description
This is a placeholder for the ${name} agent. Replace this content with actual agent instructions.

## Usage
Invoke this agent to get assistance with ${name.toLowerCase()} tasks.

## Instructions
- Analyze the provided code
- Provide actionable feedback
- Follow best practices for the given programming language
`;
}
