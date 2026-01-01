// Stark Video AI - Main Script
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Stark Video AI is ready!');
    
    // ==================== INITIALIZE VARIABLES ====================
    let currentVideoUrl = null;
    let isGenerating = false;
    let generationTimer = null;
    
    // ==================== INITIAL SETUP ====================
    initApp();
    
    function initApp() {
        // 1. Initialize real-time
        updateRealTime();
        setInterval(updateRealTime, 1000);
        
        // 2. Initialize visit counter
        initializeVisitCounter();
        
        // 3. Initialize character counter
        initializeCharCounter();
        
        // 4. Setup event listeners
        setupEventListeners();
        
        // 5. Load saved preferences
        loadUserPreferences();
        
        // 6. Check for mobile menu
        checkMobileView();
    }
    
    // ==================== TIME & DATE FUNCTIONS ====================
    function updateRealTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh'
        };
        
        const timeString = now.toLocaleTimeString('en-US');
        const dateString = now.toLocaleDateString('en-US', options);
        
        // Update footer time
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            timeElement.innerHTML = `<i class="fas fa-clock"></i> ${dateString}`;
        }
    }
    
    // ==================== VISIT COUNTER ====================
    function initializeVisitCounter() {
        try {
            let visits = localStorage.getItem('starkVisits');
            if (!visits) {
                visits = Math.floor(Math.random() * 10000) + 12000;
                localStorage.setItem('starkVisits', visits);
            } else {
                visits = parseInt(visits);
                visits += 1;
                localStorage.setItem('starkVisits', visits);
            }
            
            // Format number with commas
            const formattedVisits = visits.toLocaleString('en-US');
            document.getElementById('visit-count').innerHTML = 
                `<i class="fas fa-users"></i> ${formattedVisits} active users`;
                
        } catch (error) {
            console.error('Error initializing visit counter:', error);
            document.getElementById('visit-count').innerHTML = 
                `<i class="fas fa-users"></i> 12,458 active users`;
        }
    }
    
    // ==================== CHARACTER COUNTER ====================
    function initializeCharCounter() {
        const promptInput = document.getElementById('video-prompt');
        const charCount = document.getElementById('char-count');
        
        if (promptInput && charCount) {
            promptInput.addEventListener('input', function() {
                const length = this.value.length;
                charCount.textContent = `${length}/500`;
                
                // Change color based on length
                if (length < 50) {
                    charCount.style.color = '#ff6b6b';
                } else if (length < 150) {
                    charCount.style.color = '#ffa726';
                } else {
                    charCount.style.color = '#4CAF50';
                }
            });
            
            // Auto-resize textarea
            promptInput.addEventListener('focus', function() {
                this.style.height = '150px';
            });
        }
    }
    
    // ==================== VIDEO GENERATION ====================
    function setupEventListeners() {
        // Generate Button
        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateVideo);
        }
        
        // Try Free Button
        const tryFreeBtn = document.getElementById('try-free-btn');
        if (tryFreeBtn) {
            tryFreeBtn.addEventListener('click', () => {
                showNotification('Starting free trial!', 'success');
                document.getElementById('video-prompt').focus();
            });
        }
        
        // Sign Up Button
        const signupBtn = document.getElementById('signup-btn');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                showModal('Sign Up', 'Sign up feature is under development. Please check back later!', 'info');
            });
        }
        
        // Login Button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                showModal('Sign In', 'Sign in feature is under development. Please check back later!', 'info');
            });
        }
        
        // Download Button
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadVideo);
        }
        
        // Share Button
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', shareVideo);
        }
        
        // Mobile Menu
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        }
        
        // Close Modal
        const closeModalBtn = document.getElementById('close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeVideoModal);
        }
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Close mobile menu if open
                    document.querySelector('.nav-links').classList.remove('active');
                }
            });
        });
        
        // Example prompts
        setupExamplePrompts();
    }
    
    function setupExamplePrompts() {
        const promptInput = document.getElementById('video-prompt');
        const examplePrompts = [
            "A panda eating bamboo on a mountain in the early morning with sunlight shining through mist",
            "Future city with skyscrapers, flying cars and robots moving on the streets",
            "Sunset beach scene with gentle waves, golden sand and seagulls flying",
            "Tropical rainforest with large waterfall, wildlife and lush vegetation",
            "New Year's Eve fireworks display in Tokyo with large crowds"
        ];
        
        // Add clickable examples
        const examplesSection = document.querySelector('.examples-section');
        if (examplesSection) {
            examplePrompts.forEach((prompt, index) => {
                const exampleBtn = document.createElement('button');
                exampleBtn.className = 'example-prompt-btn';
                exampleBtn.innerHTML = `<i class="fas fa-lightbulb"></i> ${prompt.substring(0, 50)}...`;
                exampleBtn.title = prompt;
                exampleBtn.addEventListener('click', () => {
                    promptInput.value = prompt;
                    promptInput.dispatchEvent(new Event('input'));
                    showNotification(`Applied example ${index + 1}`, 'info');
                });
                examplesSection.appendChild(exampleBtn);
            });
        }
    }
    
    async function generateVideo() {
        if (isGenerating) {
            showNotification('Generating video, please wait...', 'warning');
            return;
        }
        
        const promptInput = document.getElementById('video-prompt');
        const prompt = promptInput.value.trim();
        
        if (!prompt) {
            showNotification('Please enter video description!', 'error');
            promptInput.focus();
            return;
        }
        
        if (prompt.length < 10) {
            showNotification('Description too short. Please enter at least 10 characters!', 'error');
            return;
        }
        
        // Get selected options
        const videoStyle = document.getElementById('video-style').value;
        const videoLength = document.getElementById('video-length').value;
        const aspectRatio = document.getElementById('aspect-ratio').value;
        
        // Show progress
        showProgress();
        
        // Simulate video generation
        simulateVideoGeneration(prompt, videoStyle, videoLength, aspectRatio);
        
        // Save to history
        saveToHistory(prompt, videoStyle, videoLength);
    }
    
    function simulateVideoGeneration(prompt, style, length, ratio) {
        isGenerating = true;
        
        // Disable generate button
        const generateBtn = document.getElementById('generate-btn');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        // Show progress container
        const progressContainer = document.getElementById('progress-container');
        progressContainer.style.display = 'block';
        
        // Hide placeholder and result
        document.querySelector('.output-placeholder').style.display = 'none';
        document.getElementById('video-result').style.display = 'none';
        
        let progress = 0;
        const steps = [
            {name: 'Text Analysis', duration: 1000},
            {name: 'AI Generating Images', duration: 2000},
            {name: 'Creating Video Motion', duration: 3000},
            {name: 'Adding Sound & Finalizing', duration: 2000}
        ];
        
        // Update steps visually
        const stepElements = document.querySelectorAll('.progress-steps .step');
        stepElements.forEach(step => step.classList.remove('active'));
        
        // Start progress simulation
        generationTimer = setInterval(() => {
            progress += 1;
            
            // Update progress bar
            const progressFill = document.getElementById('progress-fill');
            const progressPercent = document.getElementById('progress-percent');
            
            progressFill.style.width = `${progress}%`;
            progressPercent.textContent = `${progress}%`;
            
            // Update active step
            if (progress <= 25) {
                stepElements[0].classList.add('active');
            } else if (progress <= 50) {
                stepElements[1].classList.add('active');
            } else if (progress <= 75) {
                stepElements[2].classList.add('active');
            } else {
                stepElements[3].classList.add('active');
            }
            
            // Complete
            if (progress >= 100) {
                clearInterval(generationTimer);
                completeVideoGeneration(prompt, style, length, ratio);
            }
        }, 80); // Total ~8 seconds
    }
    
    function completeVideoGeneration(prompt, style, length, ratio) {
        isGenerating = false;
        
        // Hide progress
        document.getElementById('progress-container').style.display = 'none';
        
        // Show result
        const videoResult = document.getElementById('video-result');
        videoResult.style.display = 'block';
        
        // Update video details
        document.getElementById('video-title').textContent = prompt.substring(0, 50) + '...';
        document.getElementById('video-duration').textContent = `${length}s`;
        document.getElementById('video-style-result').textContent = getStyleName(style);
        document.getElementById('video-ratio').textContent = ratio;
        
        // Set video source (using placeholder video)
        const videoElement = document.getElementById('generated-video');
        const videoSource = getVideoPlaceholder(style);
        currentVideoUrl = videoSource;
        
        videoElement.src = videoSource;
        videoElement.load();
        
        // Enable buttons
        document.getElementById('download-btn').disabled = false;
        document.getElementById('share-btn').disabled = false;
        
        // Reset generate button
        const generateBtn = document.getElementById('generate-btn');
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate Video with Stark AI';
        
        // Show success notification
        showNotification('🎉 Video generated successfully!', 'success');
        
        // Play video automatically
        setTimeout(() => {
            videoElement.play().catch(e => console.log('Autoplay prevented:', e));
        }, 500);
    }
    
    function getVideoPlaceholder(style) {
        // Placeholder video URLs based on style
        const placeholders = {
            realistic: 'https://assets.mixkit.co/videos/preview/mixkit-sunset-over-a-lake-1867-large.mp4',
            anime: 'https://assets.mixkit.co/videos/preview/mixkit-anime-style-magic-sparkles-1412-large.mp4',
            cinematic: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-road-going-through-a-forest-4152-large.mp4',
            '3d-animation': 'https://assets.mixkit.co/videos/preview/mixkit-geometric-abstract-animation-1612-large.mp4',
            artistic: 'https://assets.mixkit.co/videos/preview/mixkit-ink-colors-in-water-artistic-1231-large.mp4',
            cartoon: 'https://assets.mixkit.co/videos/preview/mixkit-cartoon-character-running-in-a-forest-4150-large.mp4'
        };
        
        return placeholders[style] || placeholders.realistic;
    }
    
    function getStyleName(styleValue) {
        const styles = {
            realistic: 'Realistic',
            anime: 'Anime',
            cinematic: 'Cinematic',
            '3d-animation': '3D Animation',
            artistic: 'Artistic',
            cartoon: 'Cartoon'
        };
        
        return styles[styleValue] || styleValue;
    }
    
    function showProgress() {
        // Reset progress
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-percent').textContent = '0%';
        
        // Reset steps
        const stepElements = document.querySelectorAll('.progress-steps .step');
        stepElements.forEach((step, index) => {
            step.classList.toggle('active', index === 0);
        });
    }
    
    // ==================== VIDEO ACTIONS ====================
    function downloadVideo() {
        if (!currentVideoUrl) {
            showNotification('No video to download!', 'error');
            return;
        }
        
        showNotification('Downloading video...', 'info');
        
        // Simulate download
        setTimeout(() => {
            showNotification('✅ Video downloaded successfully!', 'success');
            
            // Track download in analytics
            trackEvent('video_download');
        }, 1500);
    }
    
    function shareVideo() {
        if (!currentVideoUrl) {
            showNotification('No video to share!', 'error');
            return;
        }
        
        // Create share modal
        showModal(
            'Share Video',
            `
            <div class="share-options">
                <button class="share-option" onclick="shareToFacebook()">
                    <i class="fab fa-facebook"></i> Facebook
                </button>
                <button class="share-option" onclick="shareToTwitter()">
                    <i class="fab fa-twitter"></i> Twitter
                </button>
                <button class="share-option" onclick="shareToLinkedIn()">
                    <i class="fab fa-linkedin"></i> LinkedIn
                </button>
                <div class="share-link">
                    <input type="text" readonly value="${window.location.origin}/video/123" id="share-url">
                    <button onclick="copyShareLink()">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
            </div>
            `,
            'share'
        );
        
        // Track share event
        trackEvent('video_share');
    }
    
    // ==================== UI HELPERS ====================
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    function getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        return icons[type] || 'info-circle';
    }
    
    function showModal(title, content, type = 'default') {
        // Create modal if not exists
        let modal = document.getElementById('custom-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-container modal-${type}">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">${content}</div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary modal-close-btn">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('.modal-header h3').textContent = title;
            modal.querySelector('.modal-body').innerHTML = content;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Add close functionality
        const closeButtons = modal.querySelectorAll('.modal-close, .modal-close-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    function closeVideoModal() {
        const modal = document.getElementById('video-modal');
        if (modal) {
            modal.style.display = 'none';
            
            // Pause video
            const video = document.getElementById('modal-video');
            if (video) video.pause();
        }
    }
    
    function toggleMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        navLinks.classList.toggle('active');
        
        const menuBtn = document.getElementById('mobile-menu-btn');
        menuBtn.innerHTML = navLinks.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    }
    
    function checkMobileView() {
        if (window.innerWidth <= 768) {
            document.body.classList.add('mobile-view');
        } else {
            document.body.classList.remove('mobile-view');
        }
    }
    
    // ==================== DATA MANAGEMENT ====================
    function saveToHistory(prompt, style, length) {
        try {
            const history = JSON.parse(localStorage.getItem('starkVideoHistory')) || [];
            
            const historyItem = {
                id: Date.now(),
                prompt: prompt,
                style: style,
                length: length,
                timestamp: new Date().toISOString(),
                viewed: false
            };
            
            history.unshift(historyItem); // Add to beginning
            
            // Keep only last 50 items
            if (history.length > 50) {
                history.pop();
            }
            
            localStorage.setItem('starkVideoHistory', JSON.stringify(history));
            
            // Update history badge if exists
            const historyBadge = document.querySelector('.history-badge');
            if (historyBadge) {
                historyBadge.textContent = history.length;
                historyBadge.style.display = 'flex';
            }
            
        } catch (error) {
            console.error('Error saving history:', error);
        }
    }
    
    function loadUserPreferences() {
        try {
            const preferences = JSON.parse(localStorage.getItem('starkPreferences')) || {};
            
            // Load video style
            if (preferences.videoStyle) {
                document.getElementById('video-style').value = preferences.videoStyle;
            }
            
            // Load video length
            if (preferences.videoLength) {
                document.getElementById('video-length').value = preferences.videoLength;
            }
            
            // Load aspect ratio
            if (preferences.aspectRatio) {
                document.getElementById('aspect-ratio').value = preferences.aspectRatio;
            }
            
            // Load theme
            if (preferences.theme === 'dark') {
                document.body.classList.add('dark-mode');
            }
            
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }
    
    function saveUserPreferences() {
        const preferences = {
            videoStyle: document.getElementById('video-style').value,
            videoLength: document.getElementById('video-length').value,
            aspectRatio: document.getElementById('aspect-ratio').value,
            theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light'
        };
        
        localStorage.setItem('starkPreferences', JSON.stringify(preferences));
    }
    
    // ==================== ANALYTICS ====================
    function trackEvent(eventName, data = {}) {
        // Simulate analytics tracking
        const analytics = {
            event: eventName,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ...data
        };
        
        console.log('📊 Analytics Event:', analytics);
    }
    
    // ==================== WINDOW EVENTS ====================
    window.addEventListener('resize', checkMobileView);
    
    // Save preferences on change
    document.getElementById('video-style')?.addEventListener('change', saveUserPreferences);
    document.getElementById('video-length')?.addEventListener('change', saveUserPreferences);
    document.getElementById('aspect-ratio')?.addEventListener('change', saveUserPreferences);
    
    // ==================== GLOBAL FUNCTIONS (for modal) ====================
    window.shareToFacebook = function() {
        showNotification('Sharing to Facebook (demo)', 'info');
    };
    
    window.shareToTwitter = function() {
        showNotification('Sharing to Twitter (demo)', 'info');
    };
    
    window.shareToLinkedIn = function() {
        showNotification('Sharing to LinkedIn (demo)', 'info');
    };
    
    window.copyShareLink = function() {
        const shareUrl = document.getElementById('share-url');
        shareUrl.select();
        shareUrl.setSelectionRange(0, 99999);
        
        navigator.clipboard.writeText(shareUrl.value)
            .then(() => {
                showNotification('Link copied to clipboard!', 'success');
            })
            .catch(err => {
                showNotification('Error copying: ' + err, 'error');
            });
    };
    
    // ==================== KEYBOARD SHORTCUTS ====================
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to generate video
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (document.getElementById('video-prompt') === document.activeElement) {
                e.preventDefault();
                generateVideo();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            closeVideoModal();
            const customModal = document.getElementById('custom-modal');
            if (customModal) customModal.style.display = 'none';
        }
    });
    
    // ==================== PERFORMANCE OPTIMIZATION ====================
    // Lazy load images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    }
});

// Service Worker Registration (for PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}