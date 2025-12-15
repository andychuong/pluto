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

// Specific commands used by Pluto agents/commands
// Uses Claude Code's permissions.allow format with Bash() glob patterns
const PLUTO_ALLOWED_COMMANDS = [
  // Git status/diff commands
  'Bash(git status:*)',
  'Bash(git diff:*)',
  // Git staging
  'Bash(git add:*)',
  // Git commits
  'Bash(git commit:*)',
  // Git log commands
  'Bash(git log:*)',
  // Git rev-parse
  'Bash(git rev-parse:*)',
  // Git stash (for QA checkout)
  'Bash(git stash:*)',
  // Git checkout (for QA)
  'Bash(git checkout:*)',
  // Git rebase (for consolidation)
  'Bash(git rebase:*)',
  // Git reset (for recovery)
  'Bash(git reset:*)',
  // Git reflog (for recovery)
  'Bash(git reflog:*)',
  // Directory/file operations for .ai-git
  'Bash(mkdir -p .ai-git:*)',
  'Bash(rm -f .ai-git/*)',
  // Session ID generation
  'Bash(openssl rand:*)',
  'Bash(SESSION_ID=*)',
  'Bash(SESSION_ID="ses_$(openssl rand -hex 4)" && echo $SESSION_ID)'

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

    // Claude Code is the only supported tool
    const selectedTools = ['claude-code'];

    // Install all available agents/commands
    const selectedAgents = AVAILABLE_AGENTS.map(a => a.value);

    // Step 1: Ask about allow list
    console.log(chalk.cyan('\nCommands that will be added to the allow list:'));
    PLUTO_ALLOWED_COMMANDS.forEach(cmd => console.log(chalk.dim(`  - ${cmd}`)));
    console.log('');

    const { addToAllowList } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addToAllowList',
        message: `Add these ${PLUTO_ALLOWED_COMMANDS.length} commands to Claude's allow list?`,
        default: true
      }
    ]);
    if (addToAllowList) {
      console.log(chalk.green(`\n✓ Will add ${PLUTO_ALLOWED_COMMANDS.length} commands to allow list\n`));
    }

    // Step 2: Install
    const spinner = ora('Installing commands...').start();

    // Check for and clean up previous Pluto installation
    const cwd = process.cwd();
    spinner.text = 'Checking for previous installation...';
    await cleanupPreviousInstall(cwd);

    try {
      const commandsDir = path.join(__dirname, '..', 'commands');

      // Create .ai-git directory for session tracking
      spinner.text = 'Creating .ai-git directory...';
      await fs.mkdir(path.join(cwd, '.ai-git'), { recursive: true });

      // Initialize state.json
      const initialState = {
        sessions_spun: [],
        status: "idle",
        initialized: new Date().toISOString()
      };
      await fs.writeFile(
        path.join(cwd, '.ai-git', 'state.json'),
        JSON.stringify(initialState, null, 2)
      );

      // Initialize pluto-log.md
      const logHeader = `# Pluto Session Log

This file tracks all spin operations for audit purposes.

---

`;
      await fs.writeFile(
        path.join(cwd, '.ai-git', 'pluto-log.md'),
        logHeader
      );

      for (const toolValue of selectedTools) {
        const tool = AI_TOOLS.find(t => t.value === toolValue);
        spinner.text = `Setting up ${tool.name}...`;

        await installForTool(cwd, tool, selectedAgents, commandsDir);
        await updateSettingsForTool(cwd, tool, addToAllowList);
      }

      // Add .ai-git, .claude, and .pluto to .gitignore after folders are created
      spinner.text = 'Updating .gitignore...';
      await addToGitignore(cwd, '.ai-git');
      await addToGitignore(cwd, '.claude');
      await addToGitignore(cwd, '.pluto');

      // Save config
      await fs.mkdir(path.join(cwd, '.pluto'), { recursive: true });
      await fs.writeFile(
        path.join(cwd, '.pluto', 'config.json'),
        JSON.stringify({ tools: selectedTools, agents: selectedAgents, addToAllowList, version: '1.0.0' }, null, 2)
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
  .description('Update Pluto CLI and agents from remote repository')
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
          `git clone --depth 1 --branch ${options.branch} "${repo}" "${tempDir}"`,
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

      // Reinstall Pluto CLI
      spinner.text = 'Reinstalling Pluto CLI...';
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const plutoInstallDir = path.join(homeDir, '.pluto');
      const installerDir = path.join(tempDir, 'installer');

      try {
        // Remove existing installation
        await fs.rm(plutoInstallDir, { recursive: true, force: true });

        // Copy new installer to ~/.pluto
        await fs.mkdir(plutoInstallDir, { recursive: true });
        await fs.cp(installerDir, plutoInstallDir, { recursive: true });

        // Install dependencies
        execSync('npm install --silent', {
          cwd: plutoInstallDir,
          stdio: 'pipe'
        });

        // Make entry point executable
        await fs.chmod(path.join(plutoInstallDir, 'src', 'index.js'), 0o755);
      } catch (error) {
        spinner.fail(chalk.red('Failed to reinstall Pluto CLI'));
        console.error(chalk.red(`Error: ${error.message}\n`));

        // Clean up
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch {}

        return;
      }

      // Update agents
      spinner.text = 'Installing updated agents...';

      const commandsDir = path.join(tempDir, 'installer', 'commands');

      for (const toolValue of config.tools) {
        const tool = AI_TOOLS.find(t => t.value === toolValue);
        if (!tool) continue;

        await installForTool(cwd, tool, config.agents, commandsDir);
        await updateSettingsForTool(cwd, tool, config.addToAllowList);
      }

      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}

      spinner.succeed(chalk.green('Pluto updated successfully!'));

      console.log(chalk.cyan('\n═══════════════════════════════════════════'));
      console.log(chalk.bold('\n📦 Updated:\n'));

      console.log(chalk.white('  Pluto CLI'));

      for (const toolValue of config.tools) {
        const tool = AI_TOOLS.find(t => t.value === toolValue);
        console.log(chalk.white(`  ${tool.name} agents:`));
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

// Uninstall command
program
  .command('uninstall')
  .description('Uninstall Pluto from your system')
  .action(async () => {
    const { confirmUninstall } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmUninstall',
        message: 'Are you sure you want to uninstall Pluto from your system?',
        default: false
      }
    ]);

    if (!confirmUninstall) {
      console.log(chalk.yellow('\nUninstall cancelled.\n'));
      return;
    }

    const spinner = ora('Uninstalling Pluto...').start();

    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const installDir = path.join(homeDir, '.pluto');
      const binLocations = [
        path.join('/usr/local/bin', 'pluto'),
        path.join(homeDir, '.local', 'bin', 'pluto')
      ];

      // Remove symlinks
      for (const binPath of binLocations) {
        try {
          await fs.unlink(binPath);
          spinner.text = `Removed ${binPath}`;
        } catch {
          // Symlink doesn't exist, that's fine
        }
      }

      // Remove installation directory
      spinner.text = `Removing ${installDir}...`;
      await fs.rm(installDir, { recursive: true, force: true });

      spinner.succeed(chalk.green('Pluto uninstalled successfully!\n'));

    } catch (error) {
      spinner.fail(chalk.red('Uninstall failed'));
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

    // Remove Pluto-added commands from old allowedCommands format (deprecated)
    if (settings.allowedCommands) {
      settings.allowedCommands = settings.allowedCommands.filter(
        cmd => !PLUTO_ALLOWED_COMMANDS.includes(cmd)
      );
      if (settings.allowedCommands.length === 0) delete settings.allowedCommands;
    }

    // Remove Pluto-added commands from new permissions.allow format
    if (settings.permissions?.allow) {
      settings.permissions.allow = settings.permissions.allow.filter(
        cmd => !PLUTO_ALLOWED_COMMANDS.includes(cmd)
      );
      if (settings.permissions.allow.length === 0) delete settings.permissions.allow;
      if (Object.keys(settings.permissions).length === 0) delete settings.permissions;
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

// Update settings for tool (add commands to allow list)
async function updateSettingsForTool(cwd, tool, addToAllowList = false) {
  if (!tool.settingsFile) return; // Tool doesn't support settings

  // Only add to allow list for Claude Code
  if (!addToAllowList || tool.value !== 'claude-code') return;

  const settingsPath = path.join(cwd, tool.settingsFile);

  // Read existing settings or create new
  let settings = {};
  try {
    const existing = await fs.readFile(settingsPath, 'utf-8');
    settings = JSON.parse(existing);
  } catch {
    // No existing settings
  }

  // Add commands to permissions.allow using Claude Code's new format
  if (!settings.permissions) {
    settings.permissions = {};
  }
  if (!settings.permissions.allow) {
    settings.permissions.allow = [];
  }
  
  // Add each command if not already present
  for (const cmd of PLUTO_ALLOWED_COMMANDS) {
    if (!settings.permissions.allow.includes(cmd)) {
      settings.permissions.allow.push(cmd);
    }
  }

  // Ensure directory exists and write settings
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

// Add entry to .gitignore if not already present
async function addToGitignore(cwd, entry) {
  const gitignorePath = path.join(cwd, '.gitignore');
  let content = '';

  try {
    content = await fs.readFile(gitignorePath, 'utf-8');
  } catch {
    // .gitignore doesn't exist, will create it
  }

  // Check if entry already exists (as a line by itself)
  const lines = content.split('\n');
  const entryExists = lines.some(line => line.trim() === entry);

  if (!entryExists) {
    // Add entry with a newline if file doesn't end with one
    const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
    const newContent = content + separator + entry + '\n';
    await fs.writeFile(gitignorePath, newContent);
  }
}

// Installation functions
async function installForTool(cwd, tool, agents, commandsDir) {
  const toolCommandsDir = path.join(commandsDir, tool.value);

  switch (tool.value) {
    case 'claude-code': {
      // Install commands to .claude/commands/
      const commandsDestDir = path.join(cwd, '.claude', 'commands');
      await fs.mkdir(commandsDestDir, { recursive: true });

      // Find command files (top-level .md files, not in agents/ subdirectory)
      const allFiles = await findMarkdownFilesRecursive(toolCommandsDir, toolCommandsDir, ['.md']);
      const commandFiles = allFiles.filter(f => !f.subdirectory.startsWith('agents'));

      // Generate destination filenames with conflict resolution
      const commandFileMap = generateDestinationFilename(commandFiles, '.md');

      // Filter to only install selected agents if agents array is provided
      const commandsToInstall = agents && agents.length > 0
        ? commandFileMap.filter(f => {
            const destValue = f.destFilename.replace('.md', '');
            return agents.includes(destValue) || agents.includes(f.originalName);
          })
        : commandFileMap;

      for (const { sourcePath, destFilename } of commandsToInstall) {
        const dest = path.join(commandsDestDir, destFilename);
        try {
          await fs.copyFile(sourcePath, dest);
        } catch (error) {
          // Skip if file can't be copied
        }
      }

      // Install agents to .claude/agents/
      const agentsDestDir = path.join(cwd, '.claude', 'agents');
      await fs.mkdir(agentsDestDir, { recursive: true });

      // Find agent files (in agents/ subdirectory)
      const agentFiles = allFiles.filter(f => f.subdirectory.startsWith('agents'));
      const agentFileMap = generateDestinationFilename(agentFiles, '.md');

      const agentsToInstall = agents && agents.length > 0
        ? agentFileMap.filter(f => {
            const destValue = f.destFilename.replace('.md', '');
            return agents.includes(destValue) || agents.includes(f.originalName);
          })
        : agentFileMap;

      for (const { sourcePath, destFilename } of agentsToInstall) {
        const dest = path.join(agentsDestDir, destFilename);
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
