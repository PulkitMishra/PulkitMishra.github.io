const { execSync } = require('child_process');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');

class GitHubDeployer {
  constructor() {
    this.repoUrl = 'https://github.com/PulkitMishra/portfolio';
    this.branch = 'gh-pages';
  }

  async deploy() {
    try {
      console.log(chalk.blue('🚀 Starting GitHub Pages deployment...'));

      // Check if dist directory exists
      if (!fs.existsSync('dist')) {
        throw new Error('Build directory not found. Run npm run build first.');
      }

      // Create CNAME file for custom domain (optional)
      const customDomain = process.env.CUSTOM_DOMAIN;
      if (customDomain) {
        fs.writeFileSync('dist/CNAME', customDomain);
        console.log(chalk.green(`📝 Created CNAME file for ${customDomain}`));
      }

      // Create .nojekyll file to prevent Jekyll processing
      fs.writeFileSync('dist/.nojekyll', '');
      console.log(chalk.green('📝 Created .nojekyll file'));

      // Save current directory
      const originalDir = process.cwd();
      
      try {
        // Initialize git in dist directory
        process.chdir('dist');
        
        execSync('git init', { stdio: 'pipe' });
        execSync('git add -A', { stdio: 'pipe' });
        execSync(`git commit -m "Deploy to GitHub Pages - ${new Date().toISOString()}"`, { stdio: 'pipe' });
        
        // Force push to gh-pages branch
        execSync(`git push --force ${this.repoUrl} master:${this.branch}`, { stdio: 'pipe' });
        
        console.log(chalk.green('✅ Successfully deployed to GitHub Pages!'));
        console.log(chalk.blue(`🌐 Your site will be available at: https://pulkitmishra.github.io/portfolio`));
        
      } catch (gitError) {
        console.error(chalk.red('Git deployment failed:'), gitError.message);
        throw gitError;
      } finally {
        process.chdir(originalDir);
      }

    } catch (error) {
      console.error(chalk.red('❌ Deployment failed:'), error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const deployer = new GitHubDeployer();
  deployer.deploy();
}

module.exports = GitHubDeployer;
