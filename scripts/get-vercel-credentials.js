#!/usr/bin/env node

/**
 * This script helps extract Vercel credentials from the .vercel/project.json file
 * Run this after linking your project with Vercel using `vercel link`
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

try {
  // Try to find the .vercel directory
  const vercelConfigPath = path.join(process.cwd(), '.vercel', 'project.json');
  
  if (!fs.existsSync(vercelConfigPath)) {
    console.error(chalk.red('❌ .vercel/project.json not found!'));
    console.log(chalk.yellow('Please run `vercel link` first to connect your project to Vercel.'));
    process.exit(1);
  }
  
  // Read and parse the config file
  const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  
  console.log(chalk.green('✅ Vercel credentials found!'));
  console.log('\nAdd these as secrets to your GitHub repository:');
  console.log(chalk.cyan('\nVERCEL_ORG_ID:'), chalk.yellow(vercelConfig.orgId));
  console.log(chalk.cyan('VERCEL_PROJECT_ID:'), chalk.yellow(vercelConfig.projectId));
  console.log(chalk.cyan('\nVERCEL_TOKEN:'), chalk.yellow('Get this from https://vercel.com/account/tokens'));
  
  console.log(chalk.green('\n✨ Done! Use these values in your GitHub repository secrets.'));
  
} catch (error) {
  console.error(chalk.red('❌ Error reading Vercel credentials:'), error.message);
  process.exit(1);
}
