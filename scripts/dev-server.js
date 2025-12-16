const express = require('express');
const path = require('path');
const chokidar = require('chokidar');
const compression = require('compression');
const helmet = require('helmet');
const chalk = require('chalk');
const ProductionBuilder = require('../build.js');

class DevServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.builder = new ProductionBuilder();
    this.isBuilding = false;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWatcher();
  }

  setupMiddleware() {
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));
    this.app.use(compression());
    
    // Serve static files with proper MIME types
    this.app.use('/assets', express.static('dist/assets', {
      maxAge: '1d',
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));
    
    this.app.use(express.static('dist', {
      maxAge: '1h',
      etag: true
    }));
  }

  setupRoutes() {
    // SPA fallback routing
    this.app.get('*', (req, res) => {
      const filePath = path.join(__dirname, '../dist', req.path);
      
      require('fs').access(filePath, require('fs').constants.F_OK, (err) => {
        if (err) {
          // Serve index.html for SPA routes
          res.sendFile(path.join(__dirname, '../dist/index.html'));
        } else {
          res.sendFile(filePath);
        }
      });
    });
  }

  setupWatcher() {
    const watcher = chokidar.watch([
      'templates/**/*',
      'content/**/*',
      'config/**/*',
      'assets/**/*'
    ], {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true
    });

    const handleFileChange = (filePath) => {
      console.log(chalk.blue('📝 File changed:'), filePath);
      this.rebuild();
    };

    watcher.on('change', handleFileChange);
    watcher.on('add', handleFileChange);
    watcher.on('unlink', handleFileChange);
  }

  async rebuild() {
    if (this.isBuilding) {
      console.log(chalk.yellow('Build already in progress, skipping...'));
      return;
    }

    this.isBuilding = true;
    console.log(chalk.yellow('🔄 Rebuilding...'));
    
    try {
      await this.builder.buildAll();
      console.log(chalk.green('✅ Rebuild complete!'));
    } catch (error) {
      console.error(chalk.red('❌ Build error:'), error.message);
    } finally {
      this.isBuilding = false;
    }
  }

  async start() {
    // Initial build
    await this.rebuild();

    this.app.listen(this.port, () => {
      console.log(chalk.green.bold('\n🚀 Development server started!'));
      console.log(chalk.blue(`   Local: http://localhost:${this.port}`));
      console.log(chalk.gray('   Watching for changes...\n'));
    });
  }
}

if (require.main === module) {
  const server = new DevServer();
  server.start().catch(console.error);
}

module.exports = DevServer;
