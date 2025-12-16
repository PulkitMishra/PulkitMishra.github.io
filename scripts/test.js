const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SiteValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validateHTML() {
    const htmlFiles = this.findFiles('dist', '.html');
    
    htmlFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Basic HTML validation
      if (!content.includes('<!DOCTYPE html>')) {
        this.errors.push(`Missing DOCTYPE in ${file}`);
      }
      
      if (!content.includes('<meta name="description"')) {
        this.warnings.push(`Missing meta description in ${file}`);
      }
      
      if (!content.includes('<title>')) {
        this.errors.push(`Missing title tag in ${file}`);
      }
      
      // Check for broken internal links
      const links = content.match(/href="([^"]*\.html?)"/g) || [];
      links.forEach(link => {
        const href = link.match(/href="([^"]*)"/)[1];
        if (href.startsWith('/') && !fs.existsSync(`dist${href}`)) {
          this.errors.push(`Broken link: ${href} in ${file}`);
        }
      });
    });
  }

  validateAssets() {
    // Check if critical assets exist
    const criticalAssets = [
      'dist/assets/css/styles.min.css',
      'dist/assets/js/scripts.min.js',
      'dist/sw.js',
      'dist/sitemap.xml',
      'dist/robots.txt'
    ];

    criticalAssets.forEach(asset => {
      if (!fs.existsSync(asset)) {
        this.errors.push(`Missing critical asset: ${asset}`);
      }
    });
  }

  validatePerformance() {
    const cssFile = 'dist/assets/css/styles.min.css';
    const jsFile = 'dist/assets/js/scripts.min.js';
    
    if (fs.existsSync(cssFile)) {
      const cssSize = fs.statSync(cssFile).size;
      if (cssSize > 100 * 1024) { // 100KB
        this.warnings.push(`CSS bundle is large: ${Math.round(cssSize/1024)}KB`);
      }
    }
    
    if (fs.existsSync(jsFile)) {
      const jsSize = fs.statSync(jsFile).size;
      if (jsSize > 200 * 1024) { // 200KB
        this.warnings.push(`JS bundle is large: ${Math.round(jsSize/1024)}KB`);
      }
    }
  }

  findFiles(dir, extension) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    items.forEach(item => {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...this.findFiles(fullPath, extension));
      } else if (item.name.endsWith(extension)) {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  run() {
    console.log('Running site validation...');
    
    this.validateHTML();
    this.validateAssets();
    this.validatePerformance();
    
    // Report results
    if (this.errors.length > 0) {
      console.log(chalk.red('\nErrors found:'));
      this.errors.forEach(error => console.log(chalk.red(`  ❌ ${error}`)));
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      this.warnings.forEach(warning => console.log(chalk.yellow(`  ⚠️  ${warning}`)));
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('✅ All tests passed!'));
    }
    
    return this.errors.length === 0;
  }
}

if (require.main === module) {
  const validator = new SiteValidator();
  const passed = validator.run();
  process.exit(passed ? 0 : 1);
}

module.exports = SiteValidator;
