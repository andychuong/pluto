#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init } from './commands/init.js';
import { list } from './commands/list.js';

const program = new Command();

console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║                                           ║
║   ${chalk.bold('🪐 PLUTO')}                               ║
║   ${chalk.dim('AI Agent & Command Installer')}           ║
║                                           ║
╚═══════════════════════════════════════════╝
`));

program
  .name('pluto')
  .description('CLI installer for AI coding agent commands and configurations')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize Pluto in your project and select your AI coding tools')
  .action(init);

program
  .command('list')
  .description('List available agents and commands')
  .action(list);

program.parse();
