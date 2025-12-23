// Main JavaScript - Complete with all animations, theme system, and routing
(function() {
    'use strict';

    // ==================== ROUTER ====================
    const Router = {
        routes: {},
        
        init() {
            window.addEventListener('hashchange', () => this.handleRoute());
            window.addEventListener('load', () => this.handleRoute());
        },
        
        handleRoute() {
            const hash = window.location.hash.slice(1) || '/';
            const [section, ...rest] = hash.split('/').filter(Boolean);
            const slug = rest.join('/');
            
            // Hide all dynamic content sections first
            document.querySelectorAll('.dynamic-content').forEach(el => el.remove());
            
            // Show/hide main content based on route
            const mainContent = document.getElementById('main-content');
            const dynamicContainer = document.getElementById('dynamic-container');
            
            if (!section || section === '') {
                // Home route
                if (mainContent) mainContent.style.display = 'block';
                if (dynamicContainer) dynamicContainer.innerHTML = '';
                return;
            }
            
            // Route handling
            if (section === 'projects' && slug === 'all') {
                // "See all projects" → show all projects page
                this.showAllProjects();
            } else if (section === 'projects' && slug) {
                // Individual project page
                this.showProject(slug);
            } else if (section === 'projects') {
                // Nav "Projects" → scroll to section on homepage
                if (mainContent) mainContent.style.display = 'block';
                if (dynamicContainer) dynamicContainer.innerHTML = '';
                const targetSection = document.getElementById('projects');
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            } else if (section === 'blog' && slug === 'all') {
                // "Read all posts" → show all blog page
                this.showAllBlog(null);
            } else if (section === 'blog' && (slug === 'technical' || slug === 'reflections')) {
                // Filtered blog list
                this.showAllBlog(slug);
            } else if (section === 'blog' && slug) {
                // Individual blog post
                this.showBlogPost(slug);
            } else if (section === 'blog') {
                // Nav "Blog" → scroll to section on homepage
                if (mainContent) mainContent.style.display = 'block';
                if (dynamicContainer) dynamicContainer.innerHTML = '';
                const targetSection = document.getElementById('blog');
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            } else if (section === 'connect') {
                this.showConnect();
            } else {
                // Default: scroll to section if it exists on homepage
                if (mainContent) mainContent.style.display = 'block';
                if (dynamicContainer) dynamicContainer.innerHTML = '';
                const targetSection = document.getElementById(section);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        },
        
        // Helper to scroll to top after rendering
        scrollToTop() {
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }, 0);
        },
        
        showProject(slug) {
            const mainContent = document.getElementById('main-content');
            const dynamicContainer = document.getElementById('dynamic-container');
            
            if (mainContent) mainContent.style.display = 'none';
            
            const project = window.siteData?.projects?.find(p => p.slug === slug);
            
            if (!project) {
                dynamicContainer.innerHTML = `
                    <div class="dynamic-content error-page">
                        <h2>Project Not Found</h2>
                        <p>The project "${slug}" could not be found.</p>
                        <a href="#projects/all" class="back-link">← Back to Projects</a>
                    </div>
                `;
                this.scrollToTop();
                return;
            }
            
            dynamicContainer.innerHTML = `
                <div class="dynamic-content project-page">
                    <div class="page-breadcrumb">
                        <a href="#">Home</a> / <a href="#projects/all">Projects</a> / <span>${project.title}</span>
                    </div>
                    
                    <article class="project-detail">
                        <header class="project-header">
                            <h1>${project.title}</h1>
                            ${project.subtitle ? `<p class="project-subtitle">${project.subtitle}</p>` : ''}
                            
                            <div class="project-meta-bar">
                                <div class="project-tags">
                                    ${(project.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                                </div>
                                <div class="project-links">
                                    ${project.github_url ? `<a href="${project.github_url}" target="_blank" rel="noopener" class="project-link">🔗 GitHub</a>` : ''}
                                    ${project.demo_url ? `<a href="${project.demo_url}" target="_blank" rel="noopener" class="project-link">🚀 Live Demo</a>` : ''}
                                </div>
                            </div>
                        </header>
                        
                        <div class="project-content-grid">
                            <main class="project-main">
                                <p class="project-description">${project.description}</p>
                                
                                ${project.key_achievements ? `
                                    <section class="achievements-section">
                                        <h3>Key Achievements</h3>
                                        <ul class="achievements-list">
                                            ${project.key_achievements.map(a => `<li>${a}</li>`).join('')}
                                        </ul>
                                    </section>
                                ` : ''}
                            </main>
                            
                            <aside class="project-sidebar">
                                <div class="sidebar-card">
                                    <h4>Project Details</h4>
                                    <dl class="project-facts">
                                        ${project.tech_stack ? `<dt>Tech Stack</dt><dd>${project.tech_stack}</dd>` : ''}
                                        ${project.duration ? `<dt>Duration</dt><dd>${project.duration}</dd>` : ''}
                                        ${project.role ? `<dt>Role</dt><dd>${project.role}</dd>` : ''}
                                        ${project.date ? `<dt>Date</dt><dd>${project.date}</dd>` : ''}
                                    </dl>
                                </div>
                            </aside>
                        </div>
                        
                        <nav class="project-navigation">
                            <a href="#projects/all" class="nav-all">← All Projects</a>
                        </nav>
                    </article>
                </div>
            `;
            
            this.scrollToTop();
        },
        
        showAllProjects() {
            const mainContent = document.getElementById('main-content');
            const dynamicContainer = document.getElementById('dynamic-container');
            
            if (mainContent) mainContent.style.display = 'none';
            
            const projects = window.siteData?.projects || [];
            
            dynamicContainer.innerHTML = `
                <div class="dynamic-content all-projects-page">
                    <div class="page-breadcrumb">
                        <a href="#">Home</a> / <span>Projects</span>
                    </div>
                    
                    <h1>All Projects</h1>
                    
                    <div class="projects-grid">
                        ${projects.map(project => `
                            <article class="project-card">
                                <h3>${project.title}</h3>
                                <p>${project.description}</p>
                                <div class="project-tags-small">
                                    ${(project.tags || []).slice(0, 3).map(tag => `<span class="tag-small">${tag}</span>`).join('')}
                                </div>
                                <a href="#projects/${project.slug}" class="project-card-link">View project →</a>
                            </article>
                        `).join('')}
                    </div>
                    
                    <div class="back-link-container">
                        <a href="#" class="back-link">← Back to Home</a>
                    </div>
                </div>
            `;
            
            this.scrollToTop();
        },
        
        showBlogPost(slug) {
            const mainContent = document.getElementById('main-content');
            const dynamicContainer = document.getElementById('dynamic-container');
            
            if (mainContent) mainContent.style.display = 'none';
            
            const post = window.siteData?.blog_posts?.find(p => p.slug === slug);
            
            if (!post) {
                dynamicContainer.innerHTML = `
                    <div class="dynamic-content error-page">
                        <h2>Post Not Found</h2>
                        <p>The blog post "${slug}" could not be found.</p>
                        <a href="#blog/all" class="back-link">← Back to Blog</a>
                    </div>
                `;
                this.scrollToTop();
                return;
            }
            
            // Get the full content from blog_content (loaded from markdown files)
            const content = window.siteData?.blog_content?.[slug] || `<p>${post.description}</p><p class="content-note"><em>Full article content coming soon...</em></p>`;
            
            dynamicContainer.innerHTML = `
                <div class="dynamic-content blog-post-page">
                    <div class="page-breadcrumb">
                        <a href="#">Home</a> / <a href="#blog/all">Blog</a> / <span>${post.title}</span>
                    </div>
                    
                    <article class="blog-article">
                        <header class="blog-header">
                            <h1>${post.title}</h1>
                        </header>
                        
                        <div class="blog-meta-line">
                            <span class="blog-date">${post.date}</span>
                            <span class="meta-separator"></span>
                            <span class="blog-category">${post.category}</span>
                            <span class="meta-separator"></span>
                            <span class="blog-reading-time">${post.reading_time}</span>
                        </div>
                        
                        <div class="blog-tags">
                            ${(post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                        
                        <div class="blog-content-wrapper">
                            <div class="blog-content">
                                ${content}
                            </div>
                        </div>
                        
                        <nav class="blog-navigation">
                            <a href="#blog/${post.category}" class="back-link">← Back to ${post.category === 'technical' ? 'Technical Posts' : 'Reflections'}</a>
                        </nav>
                    </article>
                </div>
            `;
            
            this.scrollToTop();
            
            // Initialize mermaid diagrams after content is loaded
            this.initMermaid();
        },
        
        // Initialize Mermaid diagrams
        initMermaid() {
            // Find all mermaid code blocks and convert them
            const codeBlocks = document.querySelectorAll('pre code.language-mermaid, code.language-mermaid');
            
            if (codeBlocks.length === 0) return;
            
            // Get theme colors based on current theme
            const currentTheme = document.body.className.split(' ')[0] || 'before-sunrise';
            const themeConfig = this.getMermaidThemeConfig(currentTheme);
            
            // Load mermaid if not already loaded
            if (typeof mermaid === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
                script.onload = () => {
                    mermaid.initialize({ 
                        startOnLoad: false,
                        theme: 'base',
                        themeVariables: themeConfig,
                        flowchart: {
                            useMaxWidth: true,
                            htmlLabels: true,
                            curve: 'basis'
                        },
                        sequence: {
                            useMaxWidth: true
                        }
                    });
                    this.renderMermaidDiagrams();
                };
                document.head.appendChild(script);
            } else {
                // Reinitialize with new theme colors
                mermaid.initialize({ 
                    startOnLoad: false,
                    theme: 'base',
                    themeVariables: themeConfig
                });
                this.renderMermaidDiagrams();
            }
        },
        
        getMermaidThemeConfig(theme) {
            const configs = {
                'before-sunrise': {
                    primaryColor: '#e0f2fe',
                    primaryTextColor: '#0369a1',
                    primaryBorderColor: '#0ea5e9',
                    lineColor: '#0ea5e9',
                    secondaryColor: '#f0f9ff',
                    tertiaryColor: '#ffffff',
                    background: '#ffffff',
                    mainBkg: '#e0f2fe',
                    nodeBorder: '#0ea5e9',
                    clusterBkg: '#f0f9ff',
                    clusterBorder: '#0ea5e9',
                    titleColor: '#0369a1',
                    edgeLabelBackground: '#ffffff',
                    fontFamily: 'Inter, system-ui, sans-serif'
                },
                'before-sunset': {
                    primaryColor: '#ffedd5',
                    primaryTextColor: '#9a3412',
                    primaryBorderColor: '#f97316',
                    lineColor: '#f97316',
                    secondaryColor: '#fff7ed',
                    tertiaryColor: '#ffffff',
                    background: '#ffffff',
                    mainBkg: '#ffedd5',
                    nodeBorder: '#f97316',
                    clusterBkg: '#fff7ed',
                    clusterBorder: '#f97316',
                    titleColor: '#9a3412',
                    edgeLabelBackground: '#ffffff',
                    fontFamily: 'Inter, system-ui, sans-serif'
                },
                'before-midnight': {
                    primaryColor: '#1e3a5f',
                    primaryTextColor: '#e0e7ff',
                    primaryBorderColor: '#4fc3f7',
                    lineColor: '#4fc3f7',
                    secondaryColor: '#1a2639',
                    tertiaryColor: '#0d1b2a',
                    background: '#1a2639',
                    mainBkg: '#1e3a5f',
                    nodeBorder: '#4fc3f7',
                    clusterBkg: '#1a2639',
                    clusterBorder: '#4fc3f7',
                    titleColor: '#ffd54f',
                    edgeLabelBackground: '#1a2639',
                    fontFamily: 'Inter, system-ui, sans-serif'
                }
            };
            return configs[theme] || configs['before-sunrise'];
        },
        
        renderMermaidDiagrams() {
            const codeBlocks = document.querySelectorAll('pre code.language-mermaid');
            
            codeBlocks.forEach((block, index) => {
                const pre = block.parentElement;
                const code = block.textContent;
                
                // Create a container for the mermaid diagram
                const container = document.createElement('div');
                container.className = 'mermaid-diagram';
                container.id = `mermaid-diagram-${index}`;
                
                // Replace the pre/code with the mermaid container
                pre.parentNode.replaceChild(container, pre);
                
                // Render the diagram
                try {
                    mermaid.render(`mermaid-svg-${index}`, code).then(result => {
                        container.innerHTML = result.svg;
                    }).catch(err => {
                        console.error('Mermaid render error:', err);
                        container.innerHTML = `<pre class="mermaid-error"><code>${code}</code></pre>`;
                    });
                } catch (err) {
                    console.error('Mermaid error:', err);
                    container.innerHTML = `<pre class="mermaid-error"><code>${code}</code></pre>`;
                }
            });
        },
        
        showAllBlog(category) {
            const mainContent = document.getElementById('main-content');
            const dynamicContainer = document.getElementById('dynamic-container');
            
            if (mainContent) mainContent.style.display = 'none';
            
            const allPosts = window.siteData?.blog_posts || [];
            const posts = category ? allPosts.filter(p => p.category === category) : allPosts;
            const title = category === 'technical' ? 'Technical Posts' : 
                         category === 'reflections' ? 'Reflections' : 'All Posts';
            
            dynamicContainer.innerHTML = `
                <div class="dynamic-content all-blog-page">
                    <div class="page-breadcrumb">
                        <a href="#">Home</a> / <a href="#blog/all">Blog</a>${category ? ` / <span>${title}</span>` : ''}
                    </div>
                    
                    <h1>${title}</h1>
                    
                    <div class="blog-filter-tabs">
                        <a href="#blog/all" class="${!category ? 'active' : ''}">All</a>
                        <a href="#blog/technical" class="${category === 'technical' ? 'active' : ''}">Technical</a>
                        <a href="#blog/reflections" class="${category === 'reflections' ? 'active' : ''}">Reflections</a>
                    </div>
                    
                    <div class="blog-posts-list">
                        ${posts.map(post => `
                            <article class="blog-post-card">
                                <div class="post-meta">${post.date} · ${post.reading_time}</div>
                                <h3><a href="#blog/${post.slug}">${post.title}</a></h3>
                                <p>${post.description}</p>
                                <div class="post-tags">
                                    ${(post.tags || []).map(tag => `<span class="tag-small">${tag}</span>`).join('')}
                                </div>
                            </article>
                        `).join('')}
                    </div>
                    
                    <div class="back-link-container">
                        <a href="#" class="back-link">← Back to Home</a>
                    </div>
                </div>
            `;
            
            this.scrollToTop();
        },
        
        showConnect() {
            const mainContent = document.getElementById('main-content');
            const dynamicContainer = document.getElementById('dynamic-container');
            
            if (mainContent) mainContent.style.display = 'none';
            
            const social = window.siteData?.social_links || {};
            
            dynamicContainer.innerHTML = `
                <div class="dynamic-content connect-page">
                    <div class="page-breadcrumb">
                        <a href="#">Home</a> / <span>Connect</span>
                    </div>
                    
                    <h1>Let's Connect</h1>
                    <p class="page-description">I'm always interested in discussing ML research, engineering challenges, or new opportunities.</p>
                    
                    <div class="connect-grid">
                        <a href="${social.github || '#'}" target="_blank" rel="noopener" class="connect-card">
                            <span class="connect-icon">💻</span>
                            <h3>GitHub</h3>
                            <p>Check out my open source work</p>
                        </a>
                        
                        <a href="${social.linkedin || '#'}" target="_blank" rel="noopener" class="connect-card">
                            <span class="connect-icon">💼</span>
                            <h3>LinkedIn</h3>
                            <p>Professional network</p>
                        </a>
                        
                        <a href="${social.twitter || '#'}" target="_blank" rel="noopener" class="connect-card">
                            <span class="connect-icon">🐦</span>
                            <h3>Twitter</h3>
                            <p>Thoughts and updates</p>
                        </a>
                        
                        <a href="mailto:${social.email || ''}" class="connect-card">
                            <span class="connect-icon">📧</span>
                            <h3>Email</h3>
                            <p>Direct contact</p>
                        </a>
                    </div>
                    
                    <div class="back-link-container">
                        <a href="#" class="back-link">← Back to Home</a>
                    </div>
                </div>
            `;
            
            this.scrollToTop();
        }
    };

    // ==================== QUOTE SYSTEM ====================
    const sunriseQuotes = [
        '"Your work is not who you are, it is what you do. But do your work with dedication as if the final outcome defines you." — Bhagavad Gita',
        '"Technology is best when it brings people together." — Matt Mullenweg',
        '"The purpose of technology is not to confuse the brain but to serve the body." — William S. Burroughs',
        '"Action alone is thy duty, not the fruit of action." — The Bhagavad Gita',
        '"Code is poetry, algorithms are literature, data is art." — Technodharma',
        '"Intelligence emerges from structured chaos, like order from randomness." — Complexity Theory'
    ];

    const sunsetQuotes = [
        '"Humankind cannot gain anything without first giving something in return. To obtain, something of equal value must be lost. That is alchemy\'s first law of equivalent exchange." — Fullmetal Alchemist',
        '"There\'s an old saying in alchemy: \'Be thou for the people.\' Alchemists have always been the servants of the people." — Fullmetal Alchemist',
        '"A lesson without pain is meaningless. For you cannot gain anything without sacrificing something else in return." — Fullmetal Alchemist',
        '"The phoenix must burn to emerge." — Janet Fitch',
        '"What matters most is how well you walk through the fire." — Charles Bukowski',
        '"Transformation is a process, and as life happens you create yourself anew." — Oprah Winfrey'
    ];

    const midnightQuotes = [
        '"For my part I know nothing with any certainty, but the sight of the stars makes me dream." — Vincent Van Gogh',
        '"I often think that the night is more alive and more richly colored than the day." — Vincent Van Gogh',
        '"Look at the sky. We are not alone. The whole universe is friendly to us and conspires only to give the best to those who dream and work." — A.P.J. Abdul Kalam',
        '"I put my heart and soul into my work, and I have lost my mind in the process." — Vincent Van Gogh',
        '"The night was clear and stars were shining. And somehow I felt as if the stars were a part of me." — Vincent Van Gogh',
        '"The more I think about it, the more I realize there is nothing more artistic than to love others." — Vincent Van Gogh'
    ];

    const commonQuotes = [
        '"The whole problem with the world is that fools and fanatics are always so certain of themselves, and wiser people so full of doubts." — Bertrand Russell',
        '"In theory, theory and practice are the same. In practice, they are not." — Albert Einstein',
        '"The question of whether a computer can think is no more interesting than the question of whether a submarine can swim." — Edsger W. Dijkstra'
    ];

    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    let themeQuotes = {
        'before-sunrise': shuffleArray([...sunriseQuotes, ...commonQuotes]),
        'before-sunset': shuffleArray([...sunsetQuotes, ...commonQuotes]),
        'before-midnight': shuffleArray([...midnightQuotes, ...commonQuotes])
    };

    let currentQuoteIndex = {
        'before-sunrise': 0,
        'before-sunset': 0,
        'before-midnight': 0
    };

    // DOM elements cache
    let elements = {};

    function cacheElements() {
        elements = {
            hamburger: document.getElementById('hamburger'),
            mainNav: document.getElementById('main-nav'),
            themeToggle: document.querySelector('.theme-toggle'),
            themeTrigger: document.getElementById('theme-trigger'),
            themePopup: document.getElementById('theme-popup'),
            themeOptions: document.querySelectorAll('.theme-option'),
            quoteElement: document.getElementById('current-quote'),
            nextQuoteBtn: document.getElementById('next-quote'),
            dataFlow: document.querySelector('.data-flow'),
            circuitNodes: document.querySelector('.circuit-nodes'),
            particlesContainer: document.querySelector('.particles-container'),
            phoenixSymbol: document.querySelector('.phoenix-symbol'),
            sunsetLogo: document.querySelector('.sunset-logo'),
            technicalTab: document.getElementById('technical-tab'),
            reflectionsTab: document.getElementById('reflections-tab'),
            technicalContent: document.getElementById('technical-content'),
            reflectionsContent: document.getElementById('reflections-content')
        };
    }

    function initHamburgerMenu() {
        if (!elements.hamburger || !elements.mainNav) return;

        elements.hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.hamburger.classList.toggle('active');
            elements.mainNav.classList.toggle('active');
        });

        // Close menu when clicking nav links
        elements.mainNav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                elements.hamburger.classList.remove('active');
                elements.mainNav.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!elements.hamburger.contains(e.target) && !elements.mainNav.contains(e.target)) {
                elements.hamburger.classList.remove('active');
                elements.mainNav.classList.remove('active');
            }
        });
    }

    function initThemeToggle() {
        if (!elements.themeToggle || !elements.themeTrigger) return;
        
        let isPopupOpen = false;

        elements.themeTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            isPopupOpen = !isPopupOpen;
            elements.themeToggle.classList.toggle('active', isPopupOpen);
        });

        document.addEventListener('click', () => {
            isPopupOpen = false;
            elements.themeToggle.classList.remove('active');
        });
        
        elements.themeOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                setTheme(this.dataset.theme);
                isPopupOpen = false;
                elements.themeToggle.classList.remove('active');
            });
        });
    }

    function setTheme(themeName) {
        document.body.className = themeName;
        localStorage.setItem('theme', themeName);
        
        // Clean and regenerate dynamic elements
        cleanDynamicElements();
        generateDynamicElements(themeName);
        updateQuoteForTheme(themeName);

        // Update active button state and trigger icon
        elements.themeOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === themeName);
        });
        
        const icons = {
            'before-sunrise': '☀️',
            'before-sunset': '🌅',
            'before-midnight': '🌃'
        };
        if (elements.themeTrigger) {
            elements.themeTrigger.textContent = icons[themeName];
        }
    }

    function initTabSwitching() {
        if (!elements.technicalTab || !elements.reflectionsTab) return;

        elements.technicalTab.addEventListener('click', () => switchTab('technical'));
        elements.reflectionsTab.addEventListener('click', () => switchTab('reflections'));
    }

    function switchTab(tabName) {
        if (!elements.technicalTab) return;
        
        elements.technicalTab.className = 'tab';
        elements.reflectionsTab.className = 'tab';
        elements.technicalContent.className = 'writing-content hidden';
        elements.reflectionsContent.className = 'writing-content hidden';
        
        document.getElementById(`${tabName}-tab`).className = 'tab-active';
        document.getElementById(`${tabName}-content`).className = 'writing-content';
    }

    // === ANIMATION FUNCTIONS ===

    function createDataPulses() {
        if (!elements.dataFlow || !elements.circuitNodes) return;

        elements.dataFlow.innerHTML = '';
        elements.circuitNodes.innerHTML = '';

        for (let i = 0; i < 15; i++) {
            const pulse = document.createElement('div');
            pulse.className = 'data-pulse';
            pulse.style.left = Math.random() * 100 + '%';
            pulse.style.top = Math.random() * 100 + '%';
            pulse.style.animationDelay = (Math.random() * 8) + 's';
            elements.dataFlow.appendChild(pulse);
        }

        for (let i = 0; i < 24; i++) {
            const node = document.createElement('div');
            node.className = 'circuit-node';
            node.style.left = Math.random() * 100 + '%';
            node.style.top = Math.random() * 100 + '%';
            node.style.animationDelay = (Math.random() * 10) + 's';
            elements.circuitNodes.appendChild(node);
        }

        document.querySelectorAll('.project-card').forEach(card => {
            card.querySelectorAll('.spark').forEach(spark => spark.remove());
            
            for (let i = 0; i < 3; i++) {
                const spark = document.createElement('div');
                spark.className = 'spark';
                spark.style.left = Math.random() * 100 + '%';
                spark.style.top = Math.random() * 100 + '%';
                spark.style.animation = `sparkFlash ${2 + Math.random() * 3}s infinite ${Math.random() * 2}s`;
                card.appendChild(spark);
            }
        });
    }

    function createBinaryFloaters() {
        document.querySelectorAll('.binary-float').forEach(el => el.remove());
        
        const binaryMessage = "01100001 01110010 01100101 00100000 01111001 01101111 01110101 00100000 01101000 01100001 01110000 01110000 01111001 00111111";
        const binaryChars = binaryMessage.split(' ');
        
        for (let i = 0; i < 25; i++) {
            const binary = document.createElement('div');
            binary.className = 'binary-float';
            binary.textContent = binaryChars[Math.floor(Math.random() * binaryChars.length)];
            binary.style.position = 'fixed';
            binary.style.left = Math.random() * 100 + 'vw';
            binary.style.top = '100vh';
            binary.style.color = `rgba(56, 189, 248, ${Math.random() * 0.3 + 0.2})`;
            binary.style.fontSize = (Math.random() * 0.8 + 0.5) + 'rem';
            binary.style.fontFamily = "'JetBrains Mono', monospace";
            binary.style.pointerEvents = 'none';
            binary.style.zIndex = '-1';
            binary.style.animation = `binaryFloat ${15 + Math.random() * 10}s linear infinite ${Math.random() * 5}s`;
            document.body.appendChild(binary);
        }
    }

    function createPhoenixParticles() {
        if (!elements.particlesContainer) return;

        elements.particlesContainer.innerHTML = '';

        for (let i = 0; i < 30; i++) {
            const ash = document.createElement('div');
            ash.className = 'ash-particle';
            ash.style.left = Math.random() * 100 + '%';
            ash.style.animationDelay = (Math.random() * 15) + 's';
            elements.particlesContainer.appendChild(ash);
        }

        for (let i = 0; i < 15; i++) {
            const ember = document.createElement('div');
            ember.className = 'ember-particle';
            ember.style.left = Math.random() * 100 + '%';
            ember.style.animationDelay = (Math.random() * 8) + 's';
            elements.particlesContainer.appendChild(ember);
        }

        if (elements.phoenixSymbol) {
            elements.phoenixSymbol.querySelectorAll('.phoenix-ember').forEach(ember => ember.remove());
            
            for (let i = 0; i < 8; i++) {
                const ember = document.createElement('div');
                ember.className = 'phoenix-ember';
                ember.style.top = 20 + (Math.random() * 50) + '%';
                ember.style.left = 30 + (Math.random() * 40) + '%';
                ember.style.animationDelay = (Math.random() * 3) + 's';
                elements.phoenixSymbol.appendChild(ember);
            }
        }

        if (elements.sunsetLogo) {
            elements.sunsetLogo.classList.add('phoenix-rise');
            setTimeout(() => {
                if (elements.sunsetLogo) {
                    elements.sunsetLogo.classList.remove('phoenix-rise');
                }
            }, 2000);
        }
    }

    function cleanDynamicElements() {
        if (elements.dataFlow) elements.dataFlow.innerHTML = '';
        if (elements.circuitNodes) elements.circuitNodes.innerHTML = '';
        if (elements.particlesContainer) elements.particlesContainer.innerHTML = '';
        
        document.querySelectorAll('.binary-float').forEach(el => el.remove());
        document.querySelectorAll('.spark').forEach(spark => spark.remove());
        
        if (elements.phoenixSymbol) {
            elements.phoenixSymbol.querySelectorAll('.phoenix-ember').forEach(ember => ember.remove());
        }
    }

    function generateDynamicElements(themeName) {
        switch (themeName) {
            case 'before-sunrise':
                createDataPulses();
                createBinaryFloaters();
                break;
            case 'before-sunset':
                createPhoenixParticles();
                break;
            case 'before-midnight':
                break;
        }
    }

    // === QUOTE SYSTEM ===

    function updateQuoteForTheme(theme) {
        if (!elements.quoteElement) return;
        
        const currentIndex = currentQuoteIndex[theme];
        const quote = themeQuotes[theme][currentIndex];
        
        elements.quoteElement.style.opacity = '0';
        setTimeout(() => {
            elements.quoteElement.textContent = quote;
            elements.quoteElement.style.opacity = '1';
        }, 300);
    }

    function initQuoteSystem() {
        if (!elements.nextQuoteBtn) return;
        
        elements.nextQuoteBtn.addEventListener('click', function() {
            const currentTheme = document.body.className.split(' ')[0] || 'before-sunrise';
            currentQuoteIndex[currentTheme] = (currentQuoteIndex[currentTheme] + 1) % themeQuotes[currentTheme].length;
            updateQuoteForTheme(currentTheme);
        });
    }

    // === INITIALIZATION ===

    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'before-sunrise';
        setTheme(savedTheme);
    }

    function init() {
        cacheElements();
        initHamburgerMenu();
        initThemeToggle();
        initTabSwitching();
        initQuoteSystem();
        initTheme();
        Router.init();
        
        console.log('Portfolio initialized with routing');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Add CSS animations
    const additionalCSS = `
        .data-pulse {
            position: absolute;
            width: 8px;
            height: 8px;
            background-color: rgba(79, 209, 197, 0.8);
            border-radius: 50%;
            opacity: 0;
            animation: dataPulse 8s linear infinite;
            box-shadow: 0 0 10px rgba(79, 209, 197, 0.5);
        }

        @keyframes dataPulse {
            0% { transform: translate(0, 0); opacity: 0; }
            20% { opacity: 0.8; }
            80% { opacity: 0.8; }
            100% { transform: translate(200px, 200px); opacity: 0; }
        }

        .circuit-node {
            position: absolute;
            width: 6px;
            height: 6px;
            background-color: rgba(14, 165, 233, 0.8);
            border-radius: 50%;
            animation: nodePulse 4s infinite alternate;
        }

        @keyframes nodePulse {
            0% { 
                transform: scale(0.8);
                opacity: 0.4;
                box-shadow: 0 0 6px rgba(14, 165, 233, 0.4);
            }
            100% { 
                transform: scale(1.2);
                opacity: 1;
                box-shadow: 0 0 12px rgba(14, 165, 233, 0.8);
            }
        }

        .spark {
            position: absolute;
            width: 4px;
            height: 4px;
            background-color: rgba(56, 189, 248, 0.9);
            border-radius: 50%;
            pointer-events: none;
            z-index: 5;
        }

        @keyframes sparkFlash {
            0%, 90% { opacity: 0; transform: scale(0.5); }
            5% { opacity: 1; transform: scale(1.5); }
            15% { opacity: 0.7; transform: scale(1); }
            25% { opacity: 0; transform: scale(0.8); }
        }

        .binary-float {
            position: fixed;
            font-family: 'JetBrains Mono', monospace;
            pointer-events: none;
            z-index: -1;
            opacity: 0;
        }

        @keyframes binaryFloat {
            0% { 
                opacity: 0; 
                transform: translateY(0) translateX(0) rotate(0deg); 
            }
            10% { 
                opacity: 0.7; 
            }
            90% { 
                opacity: 0.3; 
            }
            100% { 
                opacity: 0; 
                transform: translateY(-100vh) translateX(30px) rotate(360deg);
            }
        }

        .ash-particle {
            position: absolute;
            width: 3px;
            height: 3px;
            background-color: rgba(255, 255, 255, 0.4);
            border-radius: 50%;
            bottom: -10px;
            opacity: 0;
            animation: floatUp 15s ease-out infinite;
        }

        @keyframes floatUp {
            0% { transform: translateY(0) rotate(0deg); opacity: 0; }
            10% { opacity: 0.7; }
            70% { opacity: 0.5; transform: translateY(-80vh) rotate(360deg); }
            100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }

        .ember-particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background-color: rgba(255, 152, 0, 0.8);
            border-radius: 50%;
            bottom: -10px;
            opacity: 0;
            box-shadow: 0 0 10px 2px rgba(255, 152, 0, 0.3);
            animation: emberGlow 8s ease-out infinite;
        }

        @keyframes emberGlow {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: 0.8; }
            50% { transform: translateY(-40vh) translateX(15px); opacity: 0.6; }
            90% { opacity: 0.2; transform: translateY(-80vh) translateX(25px); }
            100% { transform: translateY(-100vh) translateX(30px); opacity: 0; }
        }

        .phoenix-ember {
            position: absolute;
            width: 3px;
            height: 3px;
            background-color: rgba(255, 193, 7, 0.9);
            border-radius: 50%;
            opacity: 0;
            box-shadow: 0 0 8px 2px rgba(255, 87, 34, 0.4);
            animation: phoenixEmber 3s infinite;
        }

        @keyframes phoenixEmber {
            0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
            20% { opacity: 0.8; transform: scale(1); }
            100% { opacity: 0; transform: translate(15px, -15px) scale(1.2); }
        }

        .phoenix-rise {
            animation: phoenixRise 2s ease-out;
        }

        @keyframes phoenixRise {
            0% { transform: translateY(10px) scale(0.9); opacity: 0.5; }
            100% { transform: translateY(0) scale(1); opacity: 1; }
        }

        /* Dynamic page styles */
        .dynamic-content {
            padding: 2rem 0;
        }
        
        .page-breadcrumb {
            font-size: 0.9rem;
            margin-bottom: 1.5rem;
            color: var(--text-color);
            opacity: 0.8;
        }
        
        .page-breadcrumb a {
            color: var(--accent-color);
            font-weight: 500;
        }
        
        .page-breadcrumb a:hover {
            text-decoration: underline;
        }
        
        .page-breadcrumb span {
            margin: 0 0.4rem;
        }
        
        .blog-post-page .page-breadcrumb {
            padding: 0 0.5rem;
            margin-bottom: 1rem;
        }
        
        .page-description {
            font-size: 1.1rem;
            color: var(--text-color);
            opacity: 0.8;
            margin-bottom: 2rem;
        }
        
        .back-link-container {
            margin-top: 3rem;
            text-align: center;
        }
        
        .back-link {
            display: inline-block;
            padding: 0.7rem 1.5rem;
            border: 2px solid var(--accent-color);
            border-radius: 0.3rem;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        
        .back-link:hover {
            background-color: var(--accent-color);
            color: white;
        }
        
        /* Project page styles */
        .project-page h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .project-subtitle {
            font-size: 1.2rem;
            color: var(--text-color);
            opacity: 0.8;
            margin-bottom: 1.5rem;
        }
        
        .project-meta-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--card-border);
        }
        
        .project-tags {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .tag {
            padding: 0.3rem 0.8rem;
            background-color: var(--nav-bg);
            border-radius: 1rem;
            font-size: 0.85rem;
            color: var(--nav-text);
        }
        
        .project-links {
            display: flex;
            gap: 1rem;
        }
        
        .project-link {
            padding: 0.5rem 1rem;
            background-color: var(--accent-color);
            color: white;
            border-radius: 0.3rem;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .project-link:hover {
            background-color: var(--accent-hover);
            color: white;
            transform: translateY(-2px);
        }
        
        .project-content-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 3rem;
            margin-top: 2rem;
        }
        
        @media (max-width: 768px) {
            .project-content-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .project-description {
            font-size: 1.1rem;
            line-height: 1.8;
        }
        
        .achievements-section {
            margin-top: 2rem;
        }
        
        .achievements-section h3 {
            margin-bottom: 1rem;
        }
        
        .achievements-list {
            list-style: none;
            padding: 0;
        }
        
        .achievements-list li {
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
        }
        
        .achievements-list li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: var(--accent-color);
            font-weight: bold;
        }
        
        .sidebar-card {
            background-color: var(--card-bg);
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 5px 15px var(--card-shadow);
        }
        
        .sidebar-card h4 {
            margin-bottom: 1rem;
            color: var(--heading-color);
        }
        
        .project-facts {
            display: grid;
            gap: 0.8rem;
        }
        
        .project-facts dt {
            font-weight: 600;
            font-size: 0.85rem;
            color: var(--accent-color);
        }
        
        .project-facts dd {
            margin: 0;
            margin-bottom: 0.5rem;
        }
        
        .project-navigation {
            margin-top: 3rem;
            text-align: center;
        }
        
        .nav-all {
            display: inline-block;
            padding: 0.7rem 1.5rem;
            border: 2px solid var(--accent-color);
            border-radius: 0.3rem;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        
        .nav-all:hover {
            background-color: var(--accent-color);
            color: white;
        }
        
        /* Blog page styles */
        .blog-filter-tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            border-bottom: 1px solid var(--card-border);
            padding-bottom: 1rem;
        }
        
        .blog-filter-tabs a {
            padding: 0.5rem 1rem;
            border-radius: 0.3rem;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .blog-filter-tabs a.active {
            background-color: var(--accent-color);
            color: white;
        }
        
        .blog-posts-list {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .blog-post-card {
            background-color: var(--card-bg);
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 3px 10px var(--card-shadow);
            transition: transform 0.2s ease;
        }
        
        .blog-post-card:hover {
            transform: translateY(-3px);
        }
        
        .blog-post-card .post-meta {
            font-size: 0.85rem;
            color: var(--accent-color);
            margin-bottom: 0.5rem;
        }
        
        .blog-post-card h3 {
            margin-bottom: 0.5rem;
        }
        
        .blog-post-card p {
            margin-bottom: 1rem;
            color: var(--text-color);
        }
        
        .post-tags, .project-tags-small {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .tag-small {
            padding: 0.2rem 0.5rem;
            background-color: var(--nav-bg);
            border-radius: 0.3rem;
            font-size: 0.75rem;
            color: var(--nav-text);
        }
        
        /* ============================================
           BLOG ARTICLE STYLES - CLEAN SEPARATION
           ============================================ */
        
        .blog-post-page {
            max-width: 900px;
            margin: 0 auto;
        }
        
        .blog-article {
            background-color: var(--card-bg);
            border-radius: 1rem;
            box-shadow: 0 10px 40px var(--card-shadow);
            overflow: hidden;
        }
        
        /* Blog Header - Title only, clean and focused */
        .blog-header {
            padding: 4rem 3rem 3rem;
            background: linear-gradient(135deg, var(--hero-bg-start), var(--hero-bg-end));
            text-align: center;
            display: block;
        }
        
        /* Title is the hero - nothing else in this section */
        .blog-header h1 {
            font-family: 'Crimson Pro', Georgia, serif;
            font-size: 3rem;
            margin: 0;
            line-height: 1.15;
            color: var(--heading-color);
            font-weight: 700;
            letter-spacing: -0.02em;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
        }
        
        /* Metadata Bar - Completely separate section below header */
        .blog-meta-line {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2rem;
            font-size: 0.9rem;
            color: var(--text-color);
            padding: 1.25rem 2rem;
            background-color: var(--quote-bg);
            border-bottom: 1px solid var(--card-border);
            font-family: 'Inter', system-ui, sans-serif;
        }
        
        .blog-date {
            font-weight: 500;
            opacity: 0.7;
        }
        
        .meta-separator {
            width: 4px;
            height: 4px;
            background-color: var(--accent-color);
            border-radius: 50%;
            opacity: 0.5;
        }
        
        .blog-category {
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.12em;
            font-weight: 700;
            color: var(--accent-color);
        }
        
        .blog-reading-time {
            opacity: 0.6;
            font-style: italic;
        }
        
        /* Tags - Separate row within the meta bar */
        .blog-tags {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            justify-content: center;
            padding: 1rem 2rem 1.25rem;
            background-color: var(--quote-bg);
            border-bottom: 1px solid var(--card-border);
        }
        
        .blog-tags .tag {
            padding: 0.35rem 0.75rem;
            background-color: var(--card-bg);
            color: var(--text-color);
            border: 1px solid var(--card-border);
            border-radius: 0.25rem;
            font-size: 0.7rem;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            opacity: 0.8;
        }
        
        /* ============================================
           BLOG CONTENT - RICH TYPOGRAPHY
           ============================================ */
        
        .blog-content-wrapper {
            padding: 3.5rem 4rem 4rem;
        }
        
        .blog-content {
            font-family: 'Crimson Pro', Georgia, serif;
            line-height: 1.85;
            font-size: 1.2rem;
            color: var(--text-color);
            max-width: 100%;
        }
        
        /* Hide duplicate title from markdown */
        .blog-content > h1:first-child {
            display: none;
        }
        
        /* === HEADING HIERARCHY - Clear visual distinction === */
        
        .blog-content h1 {
            font-family: 'Crimson Pro', Georgia, serif;
            font-size: 2.4rem;
            margin-top: 4rem;
            margin-bottom: 1.5rem;
            color: var(--heading-color);
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.2;
        }
        
        .blog-content h2 {
            font-family: 'Crimson Pro', Georgia, serif;
            font-size: 1.9rem;
            margin-top: 3.5rem;
            margin-bottom: 1.25rem;
            color: var(--heading-color);
            font-weight: 600;
            padding-bottom: 0.5rem;
            border-bottom: 3px solid var(--accent-color);
            letter-spacing: -0.01em;
            line-height: 1.3;
        }
        
        .blog-content h3 {
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 1.4rem;
            margin-top: 3rem;
            margin-bottom: 1rem;
            color: var(--heading-color);
            font-weight: 700;
            letter-spacing: -0.01em;
            line-height: 1.35;
        }
        
        .blog-content h4 {
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 1rem;
            margin-top: 2.5rem;
            margin-bottom: 0.75rem;
            color: var(--accent-color);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        
        /* === PARAGRAPHS - Comfortable reading === */
        
        .blog-content p {
            margin-bottom: 1.75rem;
            text-align: left;
        }
        
        /* First paragraph after heading - no indent, slight emphasis */
        .blog-content h2 + p,
        .blog-content h3 + p {
            font-size: 1.25rem;
        }
        
        /* === EMPHASIS STYLES === */
        
        .blog-content strong {
            color: var(--heading-color);
            font-weight: 700;
        }
        
        .blog-content em {
            font-style: italic;
            color: inherit;
        }
        
        .blog-content strong em,
        .blog-content em strong {
            font-weight: 700;
            font-style: italic;
        }
        
        /* === LISTS - Clean and readable === */
        
        .blog-content ul,
        .blog-content ol {
            margin-bottom: 2rem;
            padding-left: 1.5rem;
        }
        
        .blog-content ul {
            list-style-type: none;
        }
        
        .blog-content ul li {
            position: relative;
            padding-left: 1.25rem;
            margin-bottom: 0.75rem;
            line-height: 1.7;
        }
        
        .blog-content ul li::before {
            content: "—";
            position: absolute;
            left: 0;
            color: var(--accent-color);
            font-weight: 600;
        }
        
        .blog-content ol {
            list-style-type: decimal;
            padding-left: 1.75rem;
        }
        
        .blog-content ol li {
            margin-bottom: 0.75rem;
            line-height: 1.7;
            padding-left: 0.5rem;
        }
        
        .blog-content ol li::marker {
            color: var(--accent-color);
            font-weight: 700;
        }
        
        /* Nested lists */
        .blog-content ul ul,
        .blog-content ol ol,
        .blog-content ul ol,
        .blog-content ol ul {
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
        }
        
        /* === BLOCKQUOTES - Distinctive and elegant === */
        
        .blog-content blockquote {
            margin: 2.5rem 0;
            padding: 1.75rem 2rem 1.75rem 2.5rem;
            border-left: 4px solid var(--accent-color);
            background: linear-gradient(135deg, var(--quote-bg), transparent);
            border-radius: 0 0.75rem 0.75rem 0;
            font-style: italic;
            color: var(--text-color);
            font-size: 1.15rem;
            position: relative;
        }
        
        .blog-content blockquote::before {
            content: '"';
            position: absolute;
            left: 0.75rem;
            top: 0.5rem;
            font-size: 3rem;
            color: var(--accent-color);
            opacity: 0.3;
            font-family: Georgia, serif;
            line-height: 1;
        }
        
        .blog-content blockquote p {
            margin-bottom: 0;
        }
        
        .blog-content blockquote p:last-child {
            margin-bottom: 0;
        }
        
        /* === HORIZONTAL RULES - Section breaks === */
        
        .blog-content hr {
            margin: 4rem auto;
            border: none;
            width: 30%;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
            opacity: 0.5;
        }
        
        /* === LINKS - Clearly clickable === */
        
        .blog-content a {
            color: var(--accent-color);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: all 0.2s ease;
            font-weight: 500;
        }
        
        .blog-content a:hover {
            color: var(--accent-hover);
            border-bottom-color: var(--accent-hover);
        }
        
        /* === CODE - Technical content === */
        
        .blog-content code {
            font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
            font-size: 0.85em;
            background-color: var(--nav-bg);
            padding: 0.2em 0.5em;
            border-radius: 0.3rem;
            color: var(--accent-color);
            font-weight: 500;
        }
        
        .blog-content pre {
            margin: 2.5rem 0;
            padding: 1.75rem;
            background-color: #1e293b;
            border-radius: 0.75rem;
            overflow-x: auto;
            border: 1px solid #334155;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .blog-content pre code {
            background: none;
            padding: 0;
            color: #e2e8f0;
            font-size: 0.9rem;
            line-height: 1.7;
            font-weight: 400;
        }
        
        /* === TABLES - Data presentation === */
        
        .blog-content table {
            width: 100%;
            margin: 2.5rem 0;
            border-collapse: collapse;
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 0.95rem;
            border-radius: 0.5rem;
            overflow: hidden;
            box-shadow: 0 2px 12px var(--card-shadow);
        }
        
        .blog-content th,
        .blog-content td {
            padding: 1rem 1.25rem;
            text-align: left;
            border-bottom: 1px solid var(--card-border);
        }
        
        .blog-content th {
            background-color: var(--nav-bg);
            font-weight: 700;
            color: var(--heading-color);
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.05em;
        }
        
        .blog-content tr:last-child td {
            border-bottom: none;
        }
        
        .blog-content tr:hover td {
            background-color: var(--quote-bg);
        }
        
        /* === IMAGES - Visual content === */
        
        .blog-content img {
            max-width: 100%;
            height: auto;
            border-radius: 0.75rem;
            margin: 2.5rem 0;
            box-shadow: 0 8px 30px var(--card-shadow);
        }
        
        .blog-content figure {
            margin: 2.5rem 0;
        }
        
        .blog-content figcaption {
            text-align: center;
            font-size: 0.9rem;
            color: var(--text-color);
            opacity: 0.7;
            margin-top: 0.75rem;
            font-style: italic;
        }
        
        /* ============================================
           THEME VARIATIONS
           ============================================ */
        
        /* Before-midnight theme */
        .before-midnight .blog-content pre {
            background-color: #0f172a;
            border-color: #1e3a5f;
        }
        
        .before-midnight .blog-content pre code {
            color: #e0e7ff;
        }
        
        .before-midnight .blog-article {
            background-color: #1a2639;
        }
        
        .before-midnight .blog-header {
            background: linear-gradient(135deg, #1e3a5f, #0d1b2a);
        }
        
        .before-midnight .blog-meta-line {
            background-color: rgba(255, 255, 255, 0.05);
        }
        
        .before-midnight .blog-content h1,
        .before-midnight .blog-content h2,
        .before-midnight .blog-content h3 {
            color: #90caf9;
        }
        
        .before-midnight .blog-content h2 {
            border-bottom-color: #4fc3f7;
        }
        
        .before-midnight .blog-tags .tag {
            background-color: rgba(79, 195, 247, 0.2);
            color: #4fc3f7;
        }
        
        /* Before-sunset theme */
        .before-sunset .blog-content pre {
            background-color: #292524;
            border-color: #44403c;
        }
        
        .before-sunset .blog-tags .tag {
            background-color: rgba(249, 115, 22, 0.15);
            color: #ea580c;
        }
        
        .before-sunset .blog-content h1,
        .before-sunset .blog-content h2,
        .before-sunset .blog-content h3 {
            color: #e65100;
        }
        
        .before-sunset .blog-content h2 {
            border-bottom-color: #ff6f00;
        }
        
        /* ============================================
           MERMAID DIAGRAMS
           ============================================ */
        
        .mermaid-diagram {
            margin: 3rem 0;
            padding: 2rem;
            background-color: var(--quote-bg);
            border-radius: 0.75rem;
            border: 1px solid var(--card-border);
            overflow-x: auto;
            text-align: center;
        }
        
        .mermaid-diagram svg {
            max-width: 100%;
            height: auto;
        }
        
        .before-sunrise .mermaid-diagram {
            background: linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%);
            border-color: #e0f2fe;
        }
        
        .before-sunset .mermaid-diagram {
            background: linear-gradient(135deg, #fffbf5 0%, #fff7ed 100%);
            border-color: #fed7aa;
        }
        
        .before-midnight .mermaid-diagram {
            background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%);
            border-color: #2d4a6f;
        }
        
        .mermaid-error {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            padding: 1rem;
            border-radius: 0.5rem;
            font-size: 0.85rem;
            text-align: left;
        }
        
        .before-midnight .mermaid-error {
            background-color: #3b1c1c;
            border-color: #7f1d1d;
            color: #fca5a5;
        }
        
        /* ============================================
           BLOG NAVIGATION
           ============================================ */
        
        .blog-navigation {
            padding: 2rem 3rem;
            border-top: 1px solid var(--card-border);
            background-color: var(--quote-bg);
        }
        
        .blog-navigation .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background-color: var(--card-bg);
            border: 2px solid var(--accent-color);
            border-radius: 0.5rem;
            font-weight: 600;
            color: var(--accent-color);
            transition: all 0.2s ease;
        }
        
        .blog-navigation .back-link:hover {
            background-color: var(--accent-color);
            color: white;
            transform: translateX(-5px);
        }
        
        .content-note {
            padding: 1.25rem 1.5rem;
            background-color: var(--quote-bg);
            border-radius: 0.5rem;
            border-left: 4px solid var(--accent-color);
            margin: 1.5rem 0;
        }
        
        /* ============================================
           RESPONSIVE STYLES
           ============================================ */
        
        @media (max-width: 768px) {
            .blog-header {
                padding: 2.5rem 1.5rem 2rem;
            }
            
            .blog-header h1 {
                font-size: 2rem;
            }
            
            .blog-meta-line {
                flex-wrap: wrap;
                gap: 0.5rem;
            }
            
            .blog-content-wrapper {
                padding: 2rem 1.5rem;
            }
            
            .blog-content {
                font-size: 1.1rem;
            }
            
            .blog-content h2 {
                font-size: 1.6rem;
            }
            
            .blog-content h3 {
                font-size: 1.25rem;
            }
            
            .blog-navigation {
                padding: 1.5rem;
            }
        }
        
        /* Connect page styles */
        .connect-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        
        .connect-card {
            background-color: var(--card-bg);
            padding: 2rem;
            border-radius: 0.5rem;
            text-align: center;
            box-shadow: 0 5px 15px var(--card-shadow);
            transition: all 0.3s ease;
            display: block;
        }
        
        .connect-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px var(--card-shadow);
        }
        
        .connect-icon {
            font-size: 2.5rem;
            display: block;
            margin-bottom: 1rem;
        }
        
        .connect-card h3 {
            margin-bottom: 0.5rem;
            color: var(--heading-color);
        }
        
        .connect-card p {
            font-size: 0.9rem;
            color: var(--text-color);
            opacity: 0.7;
            margin: 0;
        }
        
        /* Error page */
        .error-page {
            text-align: center;
            padding: 4rem 0;
        }
        
        .error-page h2 {
            margin-bottom: 1rem;
        }
        
        .error-page p {
            margin-bottom: 2rem;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = additionalCSS;
    document.head.appendChild(styleElement);

})();
