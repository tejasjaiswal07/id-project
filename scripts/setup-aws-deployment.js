#!/usr/bin/env node

/**
 * This script helps set up AWS deployment for your Next.js application
 * It provides guidance on creating the necessary AWS resources
 */

const readline = require('readline');
const chalk = require('chalk');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if AWS CLI is installed
function checkAwsCli() {
  try {
    execSync('aws --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Main function
async function main() {
  console.log(chalk.blue('=== AWS Deployment Setup Guide ==='));
  
  // Check AWS CLI
  if (!checkAwsCli()) {
    console.log(chalk.red('❌ AWS CLI is not installed or not in PATH'));
    console.log(chalk.yellow('Please install AWS CLI: https://aws.amazon.com/cli/'));
    process.exit(1);
  }
  
  console.log(chalk.green('✅ AWS CLI is installed'));
  
  // Check AWS configuration
  try {
    execSync('aws configure list', { stdio: 'ignore' });
    console.log(chalk.green('✅ AWS CLI is configured'));
  } catch (error) {
    console.log(chalk.yellow('⚠️ AWS CLI is not configured'));
    console.log('Please run: aws configure');
    process.exit(1);
  }
  
  console.log('\n' + chalk.blue('=== AWS Deployment Requirements ==='));
  console.log('To deploy your Next.js app to AWS, you need:');
  console.log('1. An S3 bucket for hosting static files');
  console.log('2. CloudFront distribution (optional but recommended)');
  console.log('3. IAM user with appropriate permissions');
  
  // Get or create bucket
  console.log('\n' + chalk.blue('=== S3 Bucket Setup ==='));
  const bucketName = await askQuestion('Enter a unique S3 bucket name (e.g., my-nextjs-app): ');
  
  try {
    // Check if bucket exists
    try {
      execSync(`aws s3api head-bucket --bucket ${bucketName}`, { stdio: 'ignore' });
      console.log(chalk.green(`✅ Bucket ${bucketName} already exists`));
    } catch (error) {
      // Create bucket
      console.log(`Creating bucket ${bucketName}...`);
      const region = await askQuestion('Enter AWS region for the bucket (e.g., us-east-1): ');
      
      if (region === 'us-east-1') {
        execSync(`aws s3api create-bucket --bucket ${bucketName} --region ${region}`);
      } else {
        execSync(`aws s3api create-bucket --bucket ${bucketName} --region ${region} --create-bucket-configuration LocationConstraint=${region}`);
      }
      
      console.log(chalk.green(`✅ Created bucket ${bucketName}`));
      
      // Configure static website hosting
      console.log('Configuring bucket for static website hosting...');
      execSync(`aws s3 website s3://${bucketName} --index-document index.html --error-document 404.html`);
      
      // Set bucket policy for public read access
      const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${bucketName}/*`
          }
        ]
      };
      
      fs.writeFileSync('bucket-policy.json', JSON.stringify(bucketPolicy, null, 2));
      execSync(`aws s3api put-bucket-policy --bucket ${bucketName} --policy file://bucket-policy.json`);
      fs.unlinkSync('bucket-policy.json');
      
      console.log(chalk.green('✅ Configured bucket for static website hosting'));
    }
    
    // Get bucket website URL
    const bucketWebsiteUrl = `http://${bucketName}.s3-website.${region || 'us-east-1'}.amazonaws.com`;
    console.log(chalk.green(`✅ Bucket website URL: ${bucketWebsiteUrl}`));
    
    // CloudFront setup
    console.log('\n' + chalk.blue('=== CloudFront Setup (Optional) ==='));
    const setupCloudFront = await askQuestion('Do you want to set up CloudFront? (y/n): ');
    
    let distributionId = '';
    if (setupCloudFront.toLowerCase() === 'y') {
      console.log(chalk.yellow('CloudFront setup requires manual steps in the AWS Console.'));
      console.log('1. Go to the CloudFront console: https://console.aws.amazon.com/cloudfront/');
      console.log('2. Create a new distribution');
      console.log(`3. Set the origin domain to your S3 website endpoint: ${bucketWebsiteUrl}`);
      console.log('4. Configure the settings as described in the README-DEPLOYMENT.md file');
      
      distributionId = await askQuestion('After creating the distribution, enter the Distribution ID (or leave empty to skip): ');
    }
    
    // GitHub Actions secrets
    console.log('\n' + chalk.blue('=== GitHub Actions Secrets ==='));
    console.log('Add these secrets to your GitHub repository:');
    
    // Get AWS credentials
    const credentials = path.join(process.env.HOME || process.env.USERPROFILE, '.aws', 'credentials');
    if (fs.existsSync(credentials)) {
      const content = fs.readFileSync(credentials, 'utf8');
      const accessKeyMatch = content.match(/aws_access_key_id\s*=\s*([A-Z0-9]+)/);
      const secretKeyMatch = content.match(/aws_secret_access_key\s*=\s*([A-Za-z0-9/+]+)/);
      
      if (accessKeyMatch && secretKeyMatch) {
        console.log(chalk.cyan('AWS_ACCESS_KEY_ID:'), chalk.yellow(accessKeyMatch[1]));
        console.log(chalk.cyan('AWS_SECRET_ACCESS_KEY:'), chalk.yellow(secretKeyMatch[1]));
      }
    }
    
    console.log(chalk.cyan('AWS_REGION:'), chalk.yellow(region || 'us-east-1'));
    console.log(chalk.cyan('AWS_S3_BUCKET:'), chalk.yellow(bucketName));
    
    if (distributionId) {
      console.log(chalk.cyan('AWS_CLOUDFRONT_DISTRIBUTION_ID:'), chalk.yellow(distributionId));
    }
    
    // Next.js configuration
    console.log('\n' + chalk.blue('=== Next.js Configuration ==='));
    console.log('Make sure your next.config.js includes:');
    console.log(chalk.green(`
module.exports = {
  // ... your other config
  output: 'export',
  images: {
    unoptimized: true, // For static export
  },
}`));
    
    console.log('\n' + chalk.green('✅ AWS deployment setup complete!'));
    console.log('Follow the instructions in README-DEPLOYMENT.md for more details.');
    
  } catch (error) {
    console.error(chalk.red('Error setting up AWS deployment:'), error.message);
  }
  
  rl.close();
}

// Helper function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run the main function
main().catch(console.error);
