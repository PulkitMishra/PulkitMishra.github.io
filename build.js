const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const { minify } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const Terser = require('terser');
const chalk = require('chalk');

class ProductionBuilder {
  constructor() {
    this.config = this.loadConfig();
    this.setupMarked();
  }

  loadConfig() {
    try {
      const config = JSON.parse(fs.readFileSync('config/site.json', 'utf8'));
      console.log(chalk.green('✓ Configuration loaded'));
      return config;
    } catch (error) {
      console.error(chalk.red('✗ Error loading config:'), error.message);
      process.exit(1);
    }
  }

  setupMarked() {
    marked.setOptions({
      gfm: true,
      breaks: true,
      smartypants: true,
    });
  }

  // Simple template engine
  renderTemplate(template, data) {
    let result = template;

    // Replace simple variables: {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || '';
    });

    // Handle conditionals: {{#if condition}}content{{/if}}
    result = result.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
      return data[condition] ? content : '';
    });

    // Handle loops: {{#each array}}{{this}}{{/each}}
    result = result.replace(/\{\{#each\s+(\w+)\}\}(.*?)\{\{\/each\}\}/gs, (match, arrayName, itemTemplate) => {
      const array = data[arrayName];
      if (!array || !Array.isArray(array)) return '';
      
      return array.map(item => {
        if (typeof item === 'string') {
          return itemTemplate.replace(/\{\{this\}\}/g, item);
        } else {
          let rendered = itemTemplate;
          Object.keys(item).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            rendered = rendered.replace(regex, item[key] || '');
          });
          return rendered;
        }
      }).join('');
    });

    return result;
  }

  async optimizeCSS() {
    console.log(chalk.blue('Optimizing CSS...'));
    try {
      const cssFiles = ['themes.css', 'base.css', 'components.css'];
      const combinedCSS = cssFiles
        .map(file => {
          const filePath = path.join('assets/css', file);
          return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
        })
        .join('\n');
      
      const result = new CleanCSS({ 
        level: 2,
        inline: ['remote'],
        format: false
      }).minify(combinedCSS);

      if (result.errors.length > 0) {
        console.warn(chalk.yellow('CSS minification warnings:'), result.errors);
        return combinedCSS;
      }

      console.log(chalk.green('✓ CSS optimized'));
      return result.styles;
    } catch (error) {
      console.error(chalk.red('CSS optimization failed:'), error.message);
      return '';
    }
  }

  async optimizeJS() {
    console.log(chalk.blue('Optimizing JavaScript...'));
    try {
      const jsPath = path.join('assets/js/main.js');
      if (!fs.existsSync(jsPath)) {
        console.warn(chalk.yellow('No main.js found, skipping JS optimization'));
        return '';
      }

      const jsContent = fs.readFileSync(jsPath, 'utf8');
      
      const result = await Terser.minify(jsContent, {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: true,
        },
        mangle: true,
        format: {
          comments: false,
        },
      });

      if (result.error) {
        throw result.error;
      }
      
      console.log(chalk.green('✓ JavaScript optimized'));
      return result.code || jsContent;
    } catch (error) {
      console.error(chalk.red('JavaScript optimization failed:'), error.message);
      return '';
    }
  }

  generateServiceWorker() {
    return `
const CACHE_NAME = 'pulkit-portfolio-v1';
const urlsToCache = [
  '/',
  '/assets/css/styles.min.css',
  '/assets/js/scripts.min.js',
  '/assets/images/avatar.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
    `.trim();
  }

  async copyAssets() {
    console.log(chalk.blue('Copying assets...'));
    try {
      // Create directories
      await fs.ensureDir('dist/assets/images');
      
      // Copy images if they exist
      const imagesDir = path.join('assets', 'images');
      if (fs.existsSync(imagesDir)) {
        await fs.copy(imagesDir, path.join('dist', 'assets', 'images'));
      }
      
      // Copy static files
      const staticFiles = ['favicon.ico', 'manifest.json'];
      for (const file of staticFiles) {
        const srcPath = path.join('assets', file);
        if (fs.existsSync(srcPath)) {
          await fs.copy(srcPath, path.join('dist', file));
        }
      }
      
      console.log(chalk.green('✓ Assets copied'));
    } catch (error) {
      console.error(chalk.red('Failed to copy assets:'), error.message);
    }
  }

  generateBaseHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <meta name="description" content="{{description}}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/styles.min.css">
    <link rel="manifest" href="/manifest.json">
</head>
<body class="{{theme_class}}">
    <!-- Dynamic background elements -->
    <div class="data-flow"></div>
    <div class="circuit-nodes"></div>
    <div class="particles-container"></div>
    
    <header>
        <div class="logo">
            <div class="logo-container">
                <!-- Sunrise (Tech) -->
                <div class="sunrise-logo">
                    <div class="terminal-container">
                        <div class="terminal-header">
                            <div class="terminal-btn terminal-btn-red"></div>
                            <div class="terminal-btn terminal-btn-yellow"></div>
                            <div class="terminal-btn terminal-btn-green"></div>
                        </div>
                        <div class="terminal-body">
                            <div class="terminal-line">
                                <span class="terminal-prompt">></span>
                                <span class="terminal-command"></span>
                            </div>
                            <div class="terminal-line">
                                <span class="terminal-prompt">></span>
                                <span class="terminal-result">Epoch 1/10</span>
                            </div>
                            <div class="terminal-line">
                                <span class="terminal-prompt">></span>
                                <span class="terminal-result loading">loss: 0.314</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Sunset (Phoenix) -->
                <div class="sunset-logo">
                    <div class="phoenix-symbol">
                        <div class="phoenix-flames"></div>
                        <div class="phoenix-wings"></div>
                        <div class="phoenix-body"></div>
                        <div class="phoenix-head"></div>
                        <div class="phoenix-beak"></div>
                        <div class="phoenix-tail"></div>
                    </div>
                </div>
                
                <!-- Midnight (Starry Night) -->
                <div class="midnight-logo">
                    <div class="moon">
                        <div class="moon-crater"></div>
                        <div class="moon-swirl"></div>
                    </div>
                    <div class="stars">
                        <div class="star star-1"></div>
                        <div class="star star-2"></div>
                        <div class="star star-3"></div>
                    </div>
                    <div class="midnight-cypress"></div>
                </div>
            </div>
            <h1 class="site-title"><a href="/">Pulkit Mishra</a></h1>
        </div>
        
        <!-- Navigation -->
        <div class="nav-container">
            <div class="hamburger" id="hamburger">
                <span></span>
                <span></span>
                <span></span>
            </div>
            
            <nav class="main-nav" id="main-nav">
                <a href="/" class="nav-link">Home</a>
                <a href="#projects" class="nav-link">Projects</a>
                <a href="#blog" class="nav-link">Blog</a>
                <a href="#connect" class="nav-link">Connect</a>
            </nav>
        </div>
    </header>

    <!-- Theme Toggle -->
    <div class="theme-toggle">
        <button class="theme-trigger" id="theme-trigger" aria-label="Choose theme">
            🎨
        </button>
        <div class="theme-popup" id="theme-popup">
            <button class="theme-option active" id="sunrise-option" data-theme="before-sunrise">
                <span class="theme-option-icon">☀️</span>
                <span class="theme-option-text">Sunrise</span>
            </button>
            <button class="theme-option" id="sunset-option" data-theme="before-sunset">
                <span class="theme-option-icon">🌅</span>
                <span class="theme-option-text">Sunset</span>
            </button>
            <button class="theme-option" id="midnight-option" data-theme="before-midnight">
                <span class="theme-option-icon">🌃</span>
                <span class="theme-option-text">Midnight</span>
            </button>
        </div>
    </div>

    <main>
        {{content}}
    </main>

    <footer>
        <div class="quote-container">
            <blockquote id="current-quote" class="footer-quote">
                "Your work is not who you are, it is what you do. But do your work with dedication as if the final outcome defines you." — Bhagavad Gita
            </blockquote>
            <button id="next-quote" class="quote-button" aria-label="Show next quote">
                <span class="quote-icon">⟳</span>
            </button>
        </div>
        <div class="footer-credit">
            <p>© 2025 Pulkit Mishra — Always rising, always learning</p>
        </div>
    </footer>

    <script src="/assets/js/scripts.min.js"></script>
    {{#if register_sw}}
    <script>
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }
    </script>
    {{/if}}
</body>
</html>`;
  }

  async buildHomepage() {
    console.log(chalk.blue('Building homepage...'));
    try {
      const featuredProjects = this.config.projects.filter(p => p.featured).slice(0, 4);
      const technicalPosts = this.config.blog_posts.filter(p => p.category === 'technical').slice(0, 2);
      const reflectionPosts = this.config.blog_posts.filter(p => p.category === 'reflections').slice(0, 2);

      const homeContent = `
        <section class="hero">
            <h2 class="hero-title">ML Research & Engineering</h2>
            <p class="hero-subtitle">Building intelligent systems with rigorous research and scalable engineering</p>
            <div class="hero-pattern"></div>
        </section>

        <section id="about" class="about">
            <h2>About Me</h2>
            <div class="about-content">
                <div class="about-text">
                    <p>I'm a <strong>Machine Learning Engineer</strong> at Google, developing the ML platform for Google Pay. My work spans the full ML lifecycle, from foundational research to production systems at scale. I've been immersed in the generative AI space for quite a while and closely follow its rapid developments.</p>
                    
                    <p>Previously at Jio AICoE, I led initiatives on improving reasoning in small language models and built real-time computer vision systems. I worked across the ML spectrum - from training models to deployment, be it as REST APIs or on edge devices while also building expertise in MLOps and ML infrastructure.</p>
                    
                    <p>Before Jio, I was a Machine Learning Research Assistant at skit.ai, where I worked on text-to-speech systems. I also interned at Hike Messenger, developing a real-time 3D avatar system. I've also had stints at a few other startups, each adding something new to my ML toolkit.</p>
                    
                    <p>I'm an active open source contributor, participating in Google Summer of Code both as a student and mentor, and contributing to Facebook's Pysa as an MLH Fellow. Hackathons have been my creative playground, with wins including Smart India Hackathon where I built solutions for Government of Goa.</p>
                    
                    <p>I see machine learning as modern alchemy, transforming raw data into intelligence through mathematical transmutation. In this pursuit, I follow the principle of equivalent exchange: meaningful insights require rigorous work and careful thought. Yet I've learned that our models possess emergent behaviors that transcend their mathematical foundations - a kind of computational essence that defies complete explanation. This mysterious element is what transforms mere calculation into something that appears genuinely intelligent, reminding us that even in our most advanced formulas, there remains something we cannot fully quantify (yet).</p>
                </div>
                <div class="about-image">
                    <div class="profile-circle"></div>
                    <div class="links-container">
                        <a href="https://github.com/PulkitMishra" class="profile-link" target="_blank" rel="noopener">GitHub</a>
                        <a href="https://linkedin.com/in/pulkit-mishra" class="profile-link" target="_blank" rel="noopener">LinkedIn</a>
                        <a href="mailto:pulkitmishra007@gmail.com" class="profile-link">Email</a>
                        <a href="https://x.com/its_only_words_" class="profile-link" target="_blank" rel="noopener">Twitter</a>
                        <a href="/assets/PulkitMishra_Resume.pdf" class="profile-link" target="_blank" rel="noopener">Resume</a>
                    </div>
                </div>
            </div>
        </section>

        <section id="projects" class="projects-section">
            <h2>Featured Projects</h2>
            <div class="projects-grid">
                ${featuredProjects.map(project => `
                    <article class="project-card">
                        <h3>${project.title}</h3>
                        <p>${project.description}</p>
                        <a href="#projects/${project.slug}">View project →</a>
                    </article>
                `).join('')}
            </div>
            <div class="section-link">
                <a href="#projects">See all projects →</a>
            </div>
        </section>

        <section id="blog" class="writing-section">
            <h2>Writing</h2>
            <div class="writing-tabs">
                <button class="tab-active" id="technical-tab" data-tab="technical">Technical</button>
                <button class="tab" id="reflections-tab" data-tab="reflections">Reflections</button>
            </div>
            
            <div class="writing-content" id="technical-content">
                ${technicalPosts.map(post => `
                    <article class="post">
                        <div class="post-meta">${post.date}</div>
                        <h3><a href="#blog/${post.slug}">${post.title}</a></h3>
                        <p>${post.description}</p>
                    </article>
                `).join('')}
                <div class="section-link">
                    <a href="#blog/technical">Read all technical posts →</a>
                </div>
            </div>
            
            <div class="writing-content hidden" id="reflections-content">
                ${reflectionPosts.map(post => `
                    <article class="post">
                        <div class="post-meta">${post.date}</div>
                        <h3><a href="#blog/${post.slug}">${post.title}</a></h3>
                        <p>${post.description}</p>
                    </article>
                `).join('')}
                <div class="section-link">
                    <a href="#blog/reflections">Read all reflections →</a>
                </div>
            </div>
        </section>
      `;

      const data = {
        title: `${this.config.site.title} - ML Research & Engineering`,
        description: this.config.site.description,
        theme_class: 'before-sunrise',
        content: homeContent,
        register_sw: true
      };

      const baseTemplate = this.generateBaseHTML();
      const html = this.renderTemplate(baseTemplate, data);
      
      const minified = await minify(html, {
        collapseWhitespace: true,
        removeComments: true,
        removeEmptyAttributes: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true
      });

      await fs.writeFile('dist/index.html', minified);
      console.log(chalk.green('✓ Homepage built'));
    } catch (error) {
      console.error(chalk.red('Homepage build failed:'), error.message);
      throw error;
    }
  }

  generateSitemap() {
    const urls = [
      { url: '/', changefreq: 'weekly', priority: 1.0 },
      { url: '/projects/', changefreq: 'monthly', priority: 0.8 },
      ...this.config.projects.map(p => ({
        url: `/projects/${p.slug}/`,
        changefreq: 'monthly',
        priority: 0.7
      }))
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${this.config.site.url}${url.url}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    fs.writeFileSync('dist/sitemap.xml', sitemap.trim());
    console.log(chalk.green('✓ Sitemap generated'));
  }

  generateRobotsTxt() {
    const robots = `User-agent: *
Allow: /

Sitemap: ${this.config.site.url}/sitemap.xml`;

    fs.writeFileSync('dist/robots.txt', robots);
    console.log(chalk.green('✓ robots.txt generated'));
  }

  async buildAll() {
    console.log(chalk.blue.bold('🚀 Starting production build...\n'));
    
    // Clean and create dist directory
    if (fs.existsSync('dist')) {
      await fs.remove('dist');
    }
    await fs.ensureDir('dist');
    await fs.ensureDir('dist/assets/css');
    await fs.ensureDir('dist/assets/js');

    try {
      // Build optimized assets
      const [optimizedCSS, optimizedJS] = await Promise.all([
        this.optimizeCSS(),
        this.optimizeJS(),
      ]);
      
      // Write optimized files
      await fs.writeFile('dist/assets/css/styles.min.css', optimizedCSS);
      await fs.writeFile('dist/assets/js/scripts.min.js', optimizedJS);

      // Generate service worker
      const serviceWorker = this.generateServiceWorker();
      await fs.writeFile('dist/sw.js', serviceWorker);
      
      // Copy assets and build pages
      await this.copyAssets();
      await this.buildHomepage();
      
      // Generate SEO files
      this.generateSitemap();
      this.generateRobotsTxt();

      console.log(chalk.green.bold('\n✅ Production build completed successfully!'));
      console.log(chalk.blue('📁 Generated files in ./dist/'));
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Build failed:'), error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const builder = new ProductionBuilder();
  builder.buildAll();
}

module.exports = ProductionBuilder;
