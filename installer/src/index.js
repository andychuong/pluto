#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

// AI Tools configuration
const AI_TOOLS = [
  { name: 'Claude Code', value: 'claude-code', dir: '.claude/commands', settingsFile: '.claude/settings.json' },
  { name: 'Cursor', value: 'cursor', dir: '.cursor/rules', settingsFile: '.cursor/settings.json' },
  { name: 'Windsurf', value: 'windsurf', dir: '.windsurf/rules', settingsFile: '.windsurf/settings.json' },
  { name: 'GitHub Copilot', value: 'copilot', dir: '.github', settingsFile: null },
  { name: 'Cline', value: 'cline', dir: '.cline/rules', settingsFile: '.cline/settings.json' },
  { name: 'Codex', value: 'codex', dir: '', settingsFile: null },
];

// Available agents/commands
const AVAILABLE_AGENTS = [
  { name: 'Pluto Snap', value: 'pluto-snap', description: 'Commit with prompt & explanation' },
  { name: 'Pluto Start', value: 'pluto-start', description: 'Enable auto-commit tracking for session' },
  { name: 'Code Reviewer', value: 'code-reviewer', description: 'Reviews code for best practices and bugs' },
  { name: 'Test Generator', value: 'test-generator', description: 'Generates test suites for your code' },
  { name: 'Documentation Writer', value: 'doc-writer', description: 'Creates documentation for your codebase' },
  { name: 'Refactoring Assistant', value: 'refactor', description: 'Helps refactor code for maintainability' },
  { name: 'Security Auditor', value: 'security', description: 'Scans code for security vulnerabilities' },
  { name: 'Performance Optimizer', value: 'performance', description: 'Identifies performance bottlenecks' },
];

// Only show banner for interactive commands
const isQuietCommand = process.argv.includes('--quiet') || process.argv.includes('-q');
if (!isQuietCommand) {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║                                           ║
║   ${chalk.bold('🪐 PLUTO')}                               ║
║   ${chalk.dim('AI Agent & Command Installer')}           ║
║                                           ║
╚═══════════════════════════════════════════╝
`));
}

program
  .name('pluto')
  .description('CLI installer for AI coding agent commands')
  .version('1.0.0');

// Init command
program
  .command('init')
  .description('Initialize Pluto in your project')
  .action(async () => {
    console.log(chalk.yellow('\n📋 Let\'s set up Pluto for your project!\n'));

    // Step 1: Select AI tools
    const { selectedTools } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedTools',
        message: 'Which AI coding tools do you use?',
        choices: AI_TOOLS.map(tool => ({
          name: tool.name,
          value: tool.value,
          checked: false
        })),
        validate: (answer) => answer.length > 0 || 'Select at least one tool.'
      }
    ]);

    console.log(chalk.green(`\n✓ Selected: ${selectedTools.map(t => AI_TOOLS.find(a => a.value === t)?.name).join(', ')}\n`));

    // Step 2: Select commit workflow (only for Claude Code)
    let commitMode = 'none';
    if (selectedTools.includes('claude-code')) {
      const { workflow } = await inquirer.prompt([
        {
          type: 'list',
          name: 'workflow',
          message: 'How should Pluto handle commits?',
          choices: [
            { name: 'Auto Mode - Automatically prompt to commit after each response', value: 'auto' },
            { name: 'Manual Mode - Use /pluto-start to enable commits per session', value: 'manual' },
            { name: 'Off - Only use /pluto-snap manually when needed', value: 'none' }
          ],
          default: 'manual'
        }
      ]);
      commitMode = workflow;
      console.log(chalk.green(`\n✓ Commit mode: ${commitMode}\n`));
    }

    // Step 3: Select additional agents/commands
    // Filter agents based on commit mode - pluto-snap/pluto-start are auto-included based on mode
    const coreAgents = ['pluto-snap', 'pluto-start'];
    const additionalAgents = AVAILABLE_AGENTS.filter(a => !coreAgents.includes(a.value));

    // Determine which core agents to install based on mode
    let selectedAgents = [];
    if (commitMode === 'auto' || commitMode === 'manual' || commitMode === 'none') {
      selectedAgents.push('pluto-snap'); // Always include pluto-snap
    }
    if (commitMode === 'manual') {
      selectedAgents.push('pluto-start'); // Include pluto-start for manual mode
    }

    // Ask about additional commands
    const { extraAgents } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'extraAgents',
        message: 'Would you like any additional commands?',
        choices: additionalAgents.map(agent => ({
          name: `${agent.name} - ${chalk.dim(agent.description)}`,
          value: agent.value,
          checked: false
        })),
        pageSize: 10
      }
    ]);

    selectedAgents = [...selectedAgents, ...extraAgents];

    // Step 4: Install
    const spinner = ora('Installing commands...').start();

    try {
      const cwd = process.cwd();
      const commandsDir = path.join(__dirname, '..', 'commands');
      const hooksDir = path.join(__dirname, '..', 'hooks');

      for (const toolValue of selectedTools) {
        const tool = AI_TOOLS.find(t => t.value === toolValue);
        spinner.text = `Setting up ${tool.name}...`;

        await installForTool(cwd, tool, selectedAgents, commandsDir);
        await installHooksForTool(cwd, tool, hooksDir, commitMode);
      }

      // Save config
      await fs.mkdir(path.join(cwd, '.pluto'), { recursive: true });
      await fs.writeFile(
        path.join(cwd, '.pluto', 'config.json'),
        JSON.stringify({ tools: selectedTools, agents: selectedAgents, commitMode, version: '1.0.0' }, null, 2)
      );

      spinner.succeed(chalk.green('Installation complete!'));

      // Summary
      console.log(chalk.cyan('\n═══════════════════════════════════════════'));
      console.log(chalk.bold('\n📦 Installed:\n'));

      for (const toolValue of selectedTools) {
        const tool = AI_TOOLS.find(t => t.value === toolValue);
        console.log(chalk.white(`  ${tool.name}:`));
        for (const agentValue of selectedAgents) {
          const agent = AVAILABLE_AGENTS.find(a => a.value === agentValue);
          console.log(chalk.dim(`    • ${agent.name}`));
        }
      }

      console.log(chalk.cyan('\n═══════════════════════════════════════════'));

      if (selectedTools.includes('claude-code')) {
        console.log(chalk.green('\n✨ Commands installed! Use /command-name in Claude Code.\n'));
      }

    } catch (error) {
      spinner.fail(chalk.red('Installation failed'));
      console.error(chalk.red(error.message));
    }
  });

// List command
program
  .command('list')
  .description('List available commands')
  .action(async () => {
    console.log(chalk.bold('\n🤖 Available Commands:\n'));

    for (const agent of AVAILABLE_AGENTS) {
      console.log(chalk.white(`  ${agent.name}`));
      console.log(chalk.dim(`     ${agent.description}\n`));
    }

    console.log(chalk.bold('🛠️  Supported Tools:\n'));
    for (const tool of AI_TOOLS) {
      console.log(chalk.white(`  • ${tool.name}`));
    }
    console.log('');
  });

program.parse();

// Hook installation function
async function installHooksForTool(cwd, tool, hooksDir, commitMode) {
  if (!tool.settingsFile) return; // Tool doesn't support hooks

  const settingsPath = path.join(cwd, tool.settingsFile);
  const hooksDestDir = path.join(cwd, '.pluto', 'hooks');

  // Copy hook scripts to .pluto/hooks
  await fs.mkdir(hooksDestDir, { recursive: true });

  // Copy all hooks (they'll be used based on mode)
  const hookFiles = ['on-stop.sh', 'on-compact.sh'];
  for (const hookFile of hookFiles) {
    const src = path.join(hooksDir, hookFile);
    const dest = path.join(hooksDestDir, hookFile);
    try {
      await fs.copyFile(src, dest);
      await fs.chmod(dest, 0o755);
    } catch {
      // Skip if hook doesn't exist
    }
  }

  // Read existing settings or create new
  let settings = {};
  try {
    const existing = await fs.readFile(settingsPath, 'utf-8');
    settings = JSON.parse(existing);
  } catch {
    // No existing settings
  }

  // Add hooks configuration based on mode
  if (!settings.hooks) {
    settings.hooks = {};
  }

  if (commitMode === 'auto') {
    // Auto mode: Stop hook blocks until /pluto-snap is run
    if (!settings.hooks.Stop) {
      settings.hooks.Stop = [];
    }
    const stopHookExists = settings.hooks.Stop.some(
      h => h.hooks?.some(hook => hook.command?.includes('on-stop.sh'))
    );
    if (!stopHookExists) {
      settings.hooks.Stop.push({
        hooks: [
          {
            type: 'command',
            command: '"$CLAUDE_PROJECT_DIR/.pluto/hooks/on-stop.sh"'
          }
        ]
      });
    }
  } else if (commitMode === 'manual') {
    // Manual mode: PreCompact hook runs /pluto-snap before context summarization
    // User starts tracking with /pluto-start command
    if (!settings.hooks.PreCompact) {
      settings.hooks.PreCompact = [];
    }
    const compactHookExists = settings.hooks.PreCompact.some(
      h => h.hooks?.some(hook => hook.command?.includes('on-compact.sh'))
    );
    if (!compactHookExists) {
      settings.hooks.PreCompact.push({
        hooks: [
          {
            type: 'command',
            command: '"$CLAUDE_PROJECT_DIR/.pluto/hooks/on-compact.sh"'
          }
        ]
      });
    }
  }
  // 'none' mode: no hooks, user manually runs /pluto-snap

  // Ensure directory exists and write settings
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

// Installation functions
async function installForTool(cwd, tool, agents, commandsDir) {
  const toolCommandsDir = path.join(commandsDir, tool.value);

  switch (tool.value) {
    case 'claude-code': {
      const destDir = path.join(cwd, '.claude', 'commands');
      await fs.mkdir(destDir, { recursive: true });

      for (const agent of agents) {
        const src = path.join(toolCommandsDir, `${agent}.md`);
        const dest = path.join(destDir, `${agent}.md`);
        try {
          await fs.copyFile(src, dest);
        } catch {
          // Skip if file doesn't exist
        }
      }
      break;
    }

    case 'cursor': {
      const destDir = path.join(cwd, '.cursor', 'rules');
      await fs.mkdir(destDir, { recursive: true });

      for (const agent of agents) {
        const src = path.join(toolCommandsDir, `${agent}.mdc`);
        const dest = path.join(destDir, `${agent}.mdc`);
        try {
          await fs.copyFile(src, dest);
        } catch {
          // Try .md fallback
          try {
            const srcMd = path.join(toolCommandsDir, `${agent}.md`);
            await fs.copyFile(srcMd, dest.replace('.mdc', '.md'));
          } catch {
            // Skip
          }
        }
      }
      break;
    }

    case 'windsurf':
    case 'cline': {
      const destDir = path.join(cwd, tool.dir);
      await fs.mkdir(destDir, { recursive: true });

      for (const agent of agents) {
        const src = path.join(toolCommandsDir, `${agent}.md`);
        const dest = path.join(destDir, `${agent}.md`);
        try {
          await fs.copyFile(src, dest);
        } catch {
          // Skip
        }
      }
      break;
    }

    case 'copilot': {
      const destDir = path.join(cwd, '.github');
      await fs.mkdir(destDir, { recursive: true });

      let content = '# GitHub Copilot Instructions\n\nGenerated by Pluto.\n\n';
      for (const agent of agents) {
        const src = path.join(toolCommandsDir, `${agent}.md`);
        try {
          const agentContent = await fs.readFile(src, 'utf-8');
          content += agentContent + '\n\n';
        } catch {
          // Skip
        }
      }
      await fs.writeFile(path.join(destDir, 'copilot-instructions.md'), content);
      break;
    }

    case 'codex': {
      let content = '# AI Agents\n\nGenerated by Pluto.\n\n';
      for (const agent of agents) {
        const src = path.join(toolCommandsDir, `${agent}.md`);
        try {
          const agentContent = await fs.readFile(src, 'utf-8');
          content += agentContent + '\n\n';
        } catch {
          // Skip
        }
      }
      await fs.writeFile(path.join(cwd, 'AGENTS.md'), content);
      break;
    }
  }
}
