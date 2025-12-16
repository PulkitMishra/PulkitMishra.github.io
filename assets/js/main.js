// Main JavaScript - Complete with all animations and theme system
(function() {
    'use strict';

    // Quote system data
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

    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

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

        // Clear existing elements
        elements.dataFlow.innerHTML = '';
        elements.circuitNodes.innerHTML = '';

        // Create data flow pulses
        for (let i = 0; i < 15; i++) {
            const pulse = document.createElement('div');
            pulse.className = 'data-pulse';
            pulse.style.left = Math.random() * 100 + '%';
            pulse.style.top = Math.random() * 100 + '%';
            pulse.style.animationDelay = (Math.random() * 8) + 's';
            elements.dataFlow.appendChild(pulse);
        }

        // Create circuit nodes
        for (let i = 0; i < 24; i++) {
            const node = document.createElement('div');
            node.className = 'circuit-node';
            node.style.left = Math.random() * 100 + '%';
            node.style.top = Math.random() * 100 + '%';
            node.style.animationDelay = (Math.random() * 10) + 's';
            elements.circuitNodes.appendChild(node);
        }

        // Add sparks to project cards
        document.querySelectorAll('.project-card').forEach(card => {
            // Remove existing sparks
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
        // Clean existing binary floaters
        document.querySelectorAll('.binary-float').forEach(el => el.remove());
        
        const binaryMessage = "01100001 01110010 01100101 00100000 01111001 01101111 01110101 00100000 01101000 01100001 01110000 01110000 01111001 00111111"; // "are you happy?"
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

        // Clear existing particles
        elements.particlesContainer.innerHTML = '';

        // Create ash particles
        for (let i = 0; i < 30; i++) {
            const ash = document.createElement('div');
            ash.className = 'ash-particle';
            ash.style.left = Math.random() * 100 + '%';
            ash.style.animationDelay = (Math.random() * 15) + 's';
            elements.particlesContainer.appendChild(ash);
        }

        // Create ember particles
        for (let i = 0; i < 15; i++) {
            const ember = document.createElement('div');
            ember.className = 'ember-particle';
            ember.style.left = Math.random() * 100 + '%';
            ember.style.animationDelay = (Math.random() * 8) + 's';
            elements.particlesContainer.appendChild(ember);
        }

        // Add phoenix embers to phoenix symbol
        if (elements.phoenixSymbol) {
            // Remove existing embers
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

        // Trigger phoenix rise animation
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
        
        // Remove binary floaters
        document.querySelectorAll('.binary-float').forEach(el => el.remove());
        
        // Remove sparks from project cards
        document.querySelectorAll('.spark').forEach(spark => spark.remove());
        
        // Remove phoenix embers
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
                // Midnight theme uses pure CSS animations
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
        
        console.log('Portfolio initialized with all animations');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Add CSS animations that were missing
    const additionalCSS = `
        /* Data pulse animation */
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

        /* Circuit node animation */
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

        /* Spark animation for project cards */
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

        /* Binary float animation */
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

        /* Ash particles */
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

        /* Ember particles */
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

        /* Phoenix ember animation */
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

        /* Phoenix rise animation */
        .phoenix-rise {
            animation: phoenixRise 2s ease-out;
        }

        @keyframes phoenixRise {
            0% { transform: translateY(10px) scale(0.9); opacity: 0.5; }
            100% { transform: translateY(0) scale(1); opacity: 1; }
        }
    `;

    // Inject additional CSS
    const styleElement = document.createElement('style');
    styleElement.textContent = additionalCSS;
    document.head.appendChild(styleElement);

})();
