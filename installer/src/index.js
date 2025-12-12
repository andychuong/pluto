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

// Git commands used by Pluto commands that should be added to allow list
const PLUTO_ALLOWED_COMMANDS = [
  'git status',
  'git diff',
  'git add',
  'git commit',
  'git log',
  'git rev-parse',
  'git stash',
  'git checkout',
  'git rebase',
  'git reset'
];

// AI Tools configuration
const AI_TOOLS = [
  { name: 'Claude Code', value: 'claude-code', dir: '.claude/commands', settingsFile: '.claude/settings.json' },
  { name: 'Cursor', value: 'cursor', dir: '.cursor/rules', settingsFile: '.cursor/settings.json' },
  { name: 'Windsurf', value: 'windsurf', dir: '.windsurf/rules', settingsFile: '.windsurf/settings.json' },
  { name: 'GitHub Copilot', value: 'copilot', dir: '.github', settingsFile: null },
  { name: 'Cline', value: 'cline', dir: '.cline/rules', settingsFile: '.cline/settings.json' },
  { name: 'Codex', value: 'codex', dir: '', settingsFile: null },
];

// Dynamically discover available agents from the commands directory
async function discoverAvailableAgents() {
  const commandsDir = path.join(__dirname, '..', 'commands');
  const claudeCodeDir = path.join(commandsDir, 'claude-code');
  
  try {
    const allFiles = await findMarkdownFilesRecursive(claudeCodeDir, claudeCodeDir, ['.md']);
    
    // Use the same deduplication logic as generateDestinationFilename
    const fileMap = generateDestinationFilename(allFiles, '.md');
    
    const agents = fileMap.map(file => {
      // Get the value without extension (this will be the agent identifier)
      const value = file.destFilename.replace('.md', '');
      
      // Use the original file name as-is for display
      const friendlyName = file.originalName;
      
      // Description shows source location
      const description = file.subdirectory ? `From ${file.subdirectory}/` : 'Command';
      
      return {
        name: friendlyName,
        value: value,
        description: description,
        subdirectory: file.subdirectory,
        originalName: file.originalName
      };
    });
    
    return agents.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    // Fallback to hardcoded list if discovery fails
    return [
      { name: 'Pluto Snap', value: 'pluto-snap', description: 'Commit with prompt & explanation' },
      { name: 'Pluto Start', value: 'pluto-start', description: 'Enable auto-commit tracking for session' },
      { name: 'Code Reviewer', value: 'code-reviewer', description: 'Reviews code for best practices and bugs' },
    ];
  }
}

// Available agents/commands (will be populated dynamically)
let AVAILABLE_AGENTS = [];

// Initialize agents list
async function initializeAgents() {
  AVAILABLE_AGENTS = await discoverAvailableAgents();
}

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
    // Initialize agents list
    await initializeAgents();
    
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
    let commitMode = 'manual';
    if (selectedTools.includes('claude-code')) {
      const { workflow } = await inquirer.prompt([
        {
          type: 'list',
          name: 'workflow',
          message: 'How should Pluto handle commits?',
          choices: [
            { name: 'Auto Mode - Automatically prompt to commit after each response', value: 'auto' },
            { name: 'Manual Mode - Use /pluto-start to enable commits per session', value: 'manual' }
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

    // Step 4: Ask about allow list (only for Claude Code)
    let addToAllowList = false;
    if (selectedTools.includes('claude-code')) {
      const { allowList } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'allowList',
          message: `Add git commands to Claude's allow list? (${PLUTO_ALLOWED_COMMANDS.slice(0, 3).join(', ')}...)`,
          default: true
        }
      ]);
      addToAllowList = allowList;
      if (addToAllowList) {
        console.log(chalk.green(`\n✓ Will add ${PLUTO_ALLOWED_COMMANDS.length} git commands to allow list\n`));
      }
    }

    // Step 5: Install
    const spinner = ora('Installing commands...').start();

    // Check for and clean up previous Pluto installation
    const cwd = process.cwd();
    spinner.text = 'Checking for previous installation...';
    await cleanupPreviousInstall(cwd);

    try {
      const commandsDir = path.join(__dirname, '..', 'commands');
      const hooksDir = path.join(__dirname, '..', 'hooks');

      for (const toolValue of selectedTools) {
        const tool = AI_TOOLS.find(t => t.value === toolValue);
        spinner.text = `Setting up ${tool.name}...`;

        await installForTool(cwd, tool, selectedAgents, commandsDir);
        await installHooksForTool(cwd, tool, hooksDir, commitMode, addToAllowList);
      }

      // Save config
      await fs.mkdir(path.join(cwd, '.pluto'), { recursive: true });
      await fs.writeFile(
        path.join(cwd, '.pluto', 'config.json'),
        JSON.stringify({ tools: selectedTools, agents: selectedAgents, commitMode, addToAllowList, version: '1.0.0' }, null, 2)
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
    // Initialize agents list
    await initializeAgents();
    
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

// Update command
program
  .command('update')
  .description('Update agents from remote repository')
  .option('-b, --branch <branch>', 'Git branch to pull from (default: main)', 'main')
  .action(async (options) => {
    const cwd = process.cwd();
    const configPath = path.join(cwd, '.pluto', 'config.json');

    // Check if pluto is initialized
    try {
      await fs.access(configPath);
    } catch {
      console.error(chalk.red('\n❌ Pluto not initialized in this directory.'));
      console.log(chalk.yellow('Run "pluto init" first.\n'));
      return;
    }

    // Read config to get currently installed tools and agents
    let config;
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to read configuration.'));
      console.error(chalk.red(error.message + '\n'));
      return;
    }

    const spinner = ora('Updating agents...').start();

    try {
      // Pull from remote
      const repo = 'https://github.com/andychuong/pluto';
      spinner.text = `Pulling from ${repo} (${options.branch})...`;
      
      const tempDir = path.join(cwd, '.pluto', 'temp-update');
      
      // Remove temp dir if it exists
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
      
      await fs.mkdir(tempDir, { recursive: true });

      // Clone the repository
      const { execSync } = await import('child_process');
      try {
        execSync(
          `git clone --depth 1 --branch ${options.branch} ${repo} ${tempDir}`,
          { stdio: 'pipe' }
        );
      } catch (error) {
        spinner.fail(chalk.red('Failed to pull from remote'));
        console.error(chalk.red(`Git error: ${error.message}\n`));
        
        // Clean up
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch {}
        
        return;
      }

      // Update agents
      spinner.text = 'Installing updated agents...';
      
      const commandsDir = path.join(tempDir, 'installer', 'commands');
      const hooksDir = path.join(tempDir, 'installer', 'hooks');

      for (const toolValue of config.tools) {
        const tool = AI_TOOLS.find(t => t.value === toolValue);
        if (!tool) continue;

        await installForTool(cwd, tool, config.agents, commandsDir);
        await installHooksForTool(cwd, tool, hooksDir, config.commitMode);
      }

      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}

      spinner.succeed(chalk.green('Agents updated successfully!'));
      
      console.log(chalk.cyan('\n═══════════════════════════════════════════'));
      console.log(chalk.bold('\n📦 Updated:\n'));
      
      for (const toolValue of config.tools) {
        const tool = AI_TOOLS.find(t => t.value === toolValue);
        console.log(chalk.white(`  ${tool.name}:`));
        for (const agentValue of config.agents) {
          console.log(chalk.dim(`    • ${agentValue}`));
        }
      }
      
      console.log(chalk.cyan('\n═══════════════════════════════════════════\n'));

    } catch (error) {
      spinner.fail(chalk.red('Update failed'));
      console.error(chalk.red(error.message + '\n'));
    }
  });

program.parse();

// Helper function to recursively find all markdown files in a directory
async function findMarkdownFilesRecursive(dir, baseDir = dir, extensions = ['.md']) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await findMarkdownFilesRecursive(fullPath, baseDir, extensions);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Check if file has one of the allowed extensions
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          // Calculate relative path from base directory
          const relativePath = path.relative(baseDir, fullPath);
          const subdir = path.dirname(relativePath);
          
          files.push({
            fullPath,
            filename: entry.name,
            basename: path.basename(entry.name, ext),
            extension: ext,
            subdirectory: subdir === '.' ? '' : subdir
          });
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return files;
}

// Generate a unique destination filename, handling conflicts
function generateDestinationFilename(files, extension) {
  const nameMap = new Map();
  
  // First pass: collect all basenames and their subdirectories
  for (const file of files) {
    const { basename, subdirectory } = file;
    if (!nameMap.has(basename)) {
      nameMap.set(basename, []);
    }
    nameMap.get(basename).push({ subdirectory, file });
  }
  
  // Second pass: generate unique names
  const result = [];
  for (const [basename, entries] of nameMap) {
    if (entries.length === 1) {
      // No conflict, use original name
      const entry = entries[0];
      result.push({
        sourcePath: entry.file.fullPath,
        destFilename: `${basename}${extension}`,
        originalName: basename,
        subdirectory: entry.subdirectory
      });
    } else {
      // Conflict: add subdirectory suffix
      for (const entry of entries) {
        const subdir = entry.subdirectory || 'root';
        const subdirSuffix = subdir.replace(/\//g, '-').replace(/\\/g, '-');
        const destFilename = `${basename}-${subdirSuffix}${extension}`;
        result.push({
          sourcePath: entry.file.fullPath,
          destFilename,
          originalName: basename,
          subdirectory: entry.subdirectory
        });
      }
    }
  }
  
  return result;
}

// Clean up previous Pluto installation
async function cleanupPreviousInstall(cwd) {
  // Remove .pluto directory (hooks, config)
  const plutoDir = path.join(cwd, '.pluto');
  try {
    await fs.rm(plutoDir, { recursive: true, force: true });
  } catch {
    // Directory doesn't exist, that's fine
  }

  // Remove Pluto commands from .claude/commands (only files that look like pluto commands)
  const claudeCommandsDir = path.join(cwd, '.claude', 'commands');
  try {
    const files = await fs.readdir(claudeCommandsDir);
    for (const file of files) {
      // Only remove files that are pluto-related or were installed by pluto
      if (file.startsWith('pluto-') || file.includes('-alexis') || file.includes('-justice')) {
        await fs.unlink(path.join(claudeCommandsDir, file));
      }
    }
  } catch {
    // Directory doesn't exist, that's fine
  }

  // Clean up Pluto-specific settings from .claude/settings.json (but preserve other settings)
  const settingsPath = path.join(cwd, '.claude', 'settings.json');
  try {
    const existing = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(existing);

    // Remove Pluto hooks but keep other hooks
    if (settings.hooks) {
      // Remove Stop hooks that reference pluto
      if (settings.hooks.Stop) {
        settings.hooks.Stop = settings.hooks.Stop.filter(
          h => !h.hooks?.some(hook => hook.command?.includes('.pluto/'))
        );
        if (settings.hooks.Stop.length === 0) delete settings.hooks.Stop;
      }
      // Remove PreCompact hooks that reference pluto
      if (settings.hooks.PreCompact) {
        settings.hooks.PreCompact = settings.hooks.PreCompact.filter(
          h => !h.hooks?.some(hook => hook.command?.includes('.pluto/'))
        );
        if (settings.hooks.PreCompact.length === 0) delete settings.hooks.PreCompact;
      }
      // Remove PostToolUse hooks that reference pluto
      if (settings.hooks.PostToolUse) {
        settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(
          h => !h.hooks?.some(hook => hook.command?.includes('.pluto/'))
        );
        if (settings.hooks.PostToolUse.length === 0) delete settings.hooks.PostToolUse;
      }

      // Remove hooks object if empty
      if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
    }

    // Remove Pluto-added commands from allowedCommands but keep others
    if (settings.allowedCommands) {
      settings.allowedCommands = settings.allowedCommands.filter(
        cmd => !PLUTO_ALLOWED_COMMANDS.includes(cmd)
      );
      if (settings.allowedCommands.length === 0) delete settings.allowedCommands;
    }

    // Write back cleaned settings (or delete if empty)
    if (Object.keys(settings).length === 0) {
      await fs.unlink(settingsPath);
    } else {
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    }
  } catch {
    // Settings file doesn't exist or can't be parsed, that's fine
  }
}

// Hook installation function
async function installHooksForTool(cwd, tool, hooksDir, commitMode, addToAllowList = false) {
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

  // Add commands to allow list if requested
  if (addToAllowList && tool.value === 'claude-code') {
    if (!settings.allowedCommands) {
      settings.allowedCommands = [];
    }
    // Add each command if not already present
    for (const cmd of PLUTO_ALLOWED_COMMANDS) {
      if (!settings.allowedCommands.includes(cmd)) {
        settings.allowedCommands.push(cmd);
      }
    }
  }

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

      // Find all markdown files recursively
      const allFiles = await findMarkdownFilesRecursive(toolCommandsDir, toolCommandsDir, ['.md']);
      
      // Generate destination filenames with conflict resolution
      const fileMap = generateDestinationFilename(allFiles, '.md');
      
      // Filter to only install selected agents if agents array is provided
      // Match against both the destination filename (without extension) and original basename
      // This allows selecting either 'micro' (installs all) or 'micro-justice-commands' (installs specific)
      const filesToInstall = agents && agents.length > 0 
        ? fileMap.filter(f => {
            const destValue = f.destFilename.replace('.md', '');
            return agents.includes(destValue) || agents.includes(f.originalName);
          })
        : fileMap;

      for (const { sourcePath, destFilename } of filesToInstall) {
        const dest = path.join(destDir, destFilename);
        try {
          await fs.copyFile(sourcePath, dest);
        } catch (error) {
          // Skip if file can't be copied
        }
      }
      break;
    }

    case 'cursor': {
      const destDir = path.join(cwd, '.cursor', 'rules');
      await fs.mkdir(destDir, { recursive: true });

      // Find all markdown files recursively (try .mdc first, fallback to .md)
      const mdcFiles = await findMarkdownFilesRecursive(toolCommandsDir, toolCommandsDir, ['.mdc']);
      const mdFiles = await findMarkdownFilesRecursive(toolCommandsDir, toolCommandsDir, ['.md']);
      
      // Prefer .mdc files, but include .md files that don't have .mdc equivalents
      const mdcBasenames = new Set(mdcFiles.map(f => f.basename));
      const allFiles = [...mdcFiles, ...mdFiles.filter(f => !mdcBasenames.has(f.basename))];
      
      // Use .mdc extension for output
      const fileMap = generateDestinationFilename(allFiles, '.mdc');
      
      const filesToInstall = agents && agents.length > 0 
        ? fileMap.filter(f => {
            const destValue = f.destFilename.replace('.mdc', '');
            return agents.includes(destValue) || agents.includes(f.originalName);
          })
        : fileMap;

      for (const { sourcePath, destFilename } of filesToInstall) {
        const dest = path.join(destDir, destFilename);
        try {
          await fs.copyFile(sourcePath, dest);
        } catch (error) {
          // Skip if file can't be copied
        }
      }
      break;
    }

    case 'windsurf':
    case 'cline': {
      const destDir = path.join(cwd, tool.dir);
      await fs.mkdir(destDir, { recursive: true });

      const allFiles = await findMarkdownFilesRecursive(toolCommandsDir, toolCommandsDir, ['.md']);
      const fileMap = generateDestinationFilename(allFiles, '.md');
      
      const filesToInstall = agents && agents.length > 0 
        ? fileMap.filter(f => {
            const destValue = f.destFilename.replace('.md', '');
            return agents.includes(destValue) || agents.includes(f.originalName);
          })
        : fileMap;

      for (const { sourcePath, destFilename } of filesToInstall) {
        const dest = path.join(destDir, destFilename);
        try {
          await fs.copyFile(sourcePath, dest);
        } catch (error) {
          // Skip if file can't be copied
        }
      }
      break;
    }

    case 'copilot': {
      const destDir = path.join(cwd, '.github');
      await fs.mkdir(destDir, { recursive: true });

      const allFiles = await findMarkdownFilesRecursive(toolCommandsDir, toolCommandsDir, ['.md']);
      const fileMap = generateDestinationFilename(allFiles, '.md');
      
      const filesToInstall = agents && agents.length > 0 
        ? fileMap.filter(f => {
            const destValue = f.destFilename.replace('.md', '');
            return agents.includes(destValue) || agents.includes(f.originalName);
          })
        : fileMap;

      let content = '# GitHub Copilot Instructions\n\nGenerated by Pluto.\n\n';
      for (const { sourcePath } of filesToInstall) {
        try {
          const agentContent = await fs.readFile(sourcePath, 'utf-8');
          content += agentContent + '\n\n';
        } catch {
          // Skip if file can't be read
        }
      }
      await fs.writeFile(path.join(destDir, 'copilot-instructions.md'), content);
      break;
    }

    case 'codex': {
      const allFiles = await findMarkdownFilesRecursive(toolCommandsDir, toolCommandsDir, ['.md']);
      const fileMap = generateDestinationFilename(allFiles, '.md');
      
      const filesToInstall = agents && agents.length > 0 
        ? fileMap.filter(f => {
            const destValue = f.destFilename.replace('.md', '');
            return agents.includes(destValue) || agents.includes(f.originalName);
          })
        : fileMap;

      let content = '# AI Agents\n\nGenerated by Pluto.\n\n';
      for (const { sourcePath } of filesToInstall) {
        try {
          const agentContent = await fs.readFile(sourcePath, 'utf-8');
          content += agentContent + '\n\n';
        } catch {
          // Skip if file can't be read
        }
      }
      await fs.writeFile(path.join(cwd, 'AGENTS.md'), content);
      break;
    }
  }
}
