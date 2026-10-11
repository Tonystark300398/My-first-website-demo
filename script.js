// Stark Video AI - Main Script (Optimized & Debugged Version)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Stark Video AI initialized');
    
    // ==================== GLOBAL STATE ====================
    const state = {
        isGenerating: false,
        generationTimer: null,
        currentJobId: null,
        currentVideoUrl: null,
        demoMode: false
    };
    
    // ==================== API CONFIG ====================
    const API_CONFIG = {
        BASE_URL: 'https://api.thankyouai.com/open/v1/kling-compat/v1/videos/text2video',
        STATUS_URL: 'https://api.thankyouai.com/open/v1/kling-compat/v1/videos/text2video',
        API_KEY: '', // Users should set their API key here
        TIMEOUT: 30000,
        POLL_INTERVAL: 3000, // Check status every 3 seconds
        MAX_POLL_ATTEMPTS: 60 // Maximum 3 minutes (60 * 3s)
    };
    
    // ==================== DOM ELEMENTS ====================
    const elements = {
        // Inputs
        promptInput: document.getElementById('video-prompt'),
        styleSelect: document.getElementById('video-style'),
        lengthSelect: document.getElementById('video-length'),
        aspectSelect: document.getElementById('aspect-ratio'),

        // Buttons
        generateBtn: document.getElementById('generate-btn'),
        downloadBtn: document.getElementById('download-btn'),
        shareBtn: document.getElementById('share-btn'),
        settingsBtn: document.getElementById('settings-btn'),
        mobileSettingsBtn: document.getElementById('mobile-settings-btn'),
        saveSettingsBtn: document.getElementById('save-settings-btn'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        mobileMenu: document.getElementById('mobile-menu'),

        // Settings Modal
        settingsModal: document.getElementById('settings-modal'),
        closeSettingsModal: document.getElementById('close-settings-modal'),
        apiKeyInput: document.getElementById('api-key'),
        modelSelect: document.getElementById('model-select'),
        demoModeCheckbox: document.getElementById('demo-mode'),

        // Demo Mode Indicator
        demoModeIndicator: document.getElementById('demo-mode-indicator'),

        // Setup Guide
        setupGuide: document.getElementById('setup-guide'),
        openSettingsBtn: document.getElementById('open-settings-btn'),

        // API Notice
        apiNotice: document.getElementById('api-notice'),
        configureApiLink: document.getElementById('configure-api-link'),

        // UI Components
        progressContainer: document.getElementById('progress-container'),
        progressFill = document.getElementById('progress-fill'),
        progressPercent = document.getElementById('progress-percent'),
        videoResult = document.getElementById('video-result'),
        generatedVideo = document.getElementById('generated-video'),
        outputPlaceholder = document.querySelector('.output-placeholder')
    };
    
    // ==================== INITIALIZATION ====================
    function init() {
        console.log('🔧 Initializing application...');

        // Validate critical elements
        if (!elements.generateBtn) {
            console.error('❌ Generate button not found!');
            return;
        }

        // Load saved API key
        loadSettings();

        // Setup event listeners
        setupEventListeners();

        // Initialize character counter
        if (elements.promptInput) {
            elements.promptInput.addEventListener('input', updateCharCounter);
        }

        // Check API key status
        checkApiKeyStatus();

        console.log('✅ Application initialized successfully');
    }
    
    // ==================== EVENT LISTENERS ====================
    function setupEventListeners() {
        // Generate button - SINGLE event listener
        elements.generateBtn.addEventListener('click', handleGenerateClick);

        // Other buttons (if they exist)
        if (elements.downloadBtn) {
            elements.downloadBtn.addEventListener('click', downloadVideo);
        }

        if (elements.shareBtn) {
            elements.shareBtn.addEventListener('click', shareVideo);
        }

        // Settings modal
        if (elements.settingsBtn) {
            elements.settingsBtn.addEventListener('click', openSettingsModal);
        }

        if (elements.closeSettingsModal) {
            elements.closeSettingsModal.addEventListener('click', closeSettingsModal);
        }

        if (elements.saveSettingsBtn) {
            elements.saveSettingsBtn.addEventListener('click', saveSettings);
        }

        if (elements.configureApiLink) {
            elements.configureApiLink.addEventListener('click', (e) => {
                e.preventDefault();
                openSettingsModal();
            });
        }

        if (elements.openSettingsBtn) {
            elements.openSettingsBtn.addEventListener('click', () => {
                openSettingsModal();
            });
        }

        // Close modal on outside click
        if (elements.settingsModal) {
            elements.settingsModal.addEventListener('click', (e) => {
                if (e.target === elements.settingsModal) {
                    closeSettingsModal();
                }
            });
        }

        // Keyboard shortcut: Ctrl/Cmd + Enter
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (elements.promptInput === document.activeElement) {
                    e.preventDefault();
                    handleGenerateClick();
                }
            }
        });

        console.log('🎯 Event listeners setup complete');
    }
    
    // ==================== MAIN GENERATION HANDLER ====================
    async function handleGenerateClick() {
        console.log('🖱️ Button clicked - START');
        console.log('🎭 Demo mode status:', state.demoMode);

        // Prevent multiple clicks
        if (state.isGenerating) {
            console.log('⏸️ Already generating, skipping');
            showNotification('Please wait for current generation to complete', 'warning');
            return;
        }

        // Validate inputs
        if (!validateInputs()) {
            return;
        }

        // Get form data
        const formData = getFormData();

        // Update UI state
        setGeneratingState(true);

        try {
            // Show progress UI
            showProgressUI();

            // Check if demo mode is enabled
            if (state.demoMode) {
                console.log('🎭 Demo mode enabled - using placeholder video');
                showNotification('🎭 Demo mode: Generating placeholder video...', 'info');

                // Simulate progress
                await simulateProgress();

                // Show success with placeholder
                const demoResult = {
                    success: true,
                    video_url: getPlaceholderVideo(formData.style)
                };
                showSuccessUI(formData, demoResult);
                showNotification('✅ Demo video generated successfully!', 'success');
            } else {
                console.log('🎬 Real API mode - calling ThankYou AI');
                // Real API generation
                const initResult = await sendGenerationRequest(formData);

                if (initResult.success) {
                    // Update state with task ID
                    state.currentJobId = initResult.task_id;

                    showNotification(`🎬 Video generation started! Task ID: ${initResult.task_id}`, 'info');

                    // Poll for completion
                    const finalResult = await pollGenerationStatus(initResult.task_id);

                    if (finalResult.success) {
                        // Show success UI with actual video
                        showSuccessUI(formData, finalResult);
                        showNotification('✅ Video generated successfully!', 'success');
                    }
                } else {
                    throw new Error(initResult.error || 'Generation failed');
                }
            }

        } catch (error) {
            console.error('❌ Generation error:', error);
            showErrorUI(error.message);
            showNotification(`❌ Error: ${error.message}`, 'error');

        } finally {
            // ALWAYS reset state
            setGeneratingState(false);
            console.log('🔄 Button state reset');
        }

        console.log('🏁 Button clicked - END');
    }
    
    // ==================== VALIDATION ====================
    function validateInputs() {
        if (!elements.promptInput) {
            showNotification('Prompt input not found', 'error');
            return false;
        }
        
        const prompt = elements.promptInput.value.trim();
        
        if (!prompt) {
            showNotification('Please enter a video description', 'error');
            elements.promptInput.focus();
            return false;
        }
        
        if (prompt.length < 3) {
            showNotification('Description must be at least 3 characters', 'error');
            return false;
        }
        
        return true;
    }
    
    // ==================== FORM DATA ====================
    function getFormData() {
        return {
            prompt: elements.promptInput.value.trim(),
            style: elements.styleSelect ? elements.styleSelect.value : 'realistic',
            length: elements.lengthSelect ? parseInt(elements.lengthSelect.value) : 5,
            aspect_ratio: elements.aspectSelect ? elements.aspectSelect.value : '16:9',
            model: elements.modelSelect ? elements.modelSelect.value : 'kling-v3'
        };
    }
    
    // ==================== API REQUEST ====================
    async function sendGenerationRequest(formData) {
        console.log('📤 Sending API request:', formData);

        // Check if API key is configured
        if (!API_CONFIG.API_KEY) {
            throw new Error('API key not configured. Please set your ThankYou AI API key in the code or add it via the settings.');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

        try {
            // Prepare request body for ThankYou AI Kling API
            const requestBody = {
                model_name: formData.model || 'kling-v3',
                prompt: formData.prompt,
                mode: 'std', // Standard mode (can be 'pro' for higher quality)
                aspect_ratio: formData.aspect_ratio,
                duration: formData.length.toString(),
                sound: 'on', // Enable audio generation
                watermark_info: {
                    enabled: false
                }
            };

            console.log('📋 Request body:', requestBody);

            const response = await fetch(API_CONFIG.BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${API_CONFIG.API_KEY}`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error:', errorText);

                // Handle specific error codes
                if (response.status === 402) {
                    throw new Error('Insufficient credits. Please add credits to your ThankYou AI account at thankyouai.com/dashboard');
                } else if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your settings.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                }

                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ API response:', data);

            // Return task_id for polling
            return {
                success: true,
                task_id: data.data?.task_id || data.task_id,
                data: data
            };

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // ==================== STATUS POLLING ====================
    async function pollGenerationStatus(taskId) {
        console.log('🔄 Polling status for task:', taskId);

        let attempts = 0;

        while (attempts < API_CONFIG.MAX_POLL_ATTEMPTS) {
            attempts++;

            try {
                const response = await fetch(`${API_CONFIG.STATUS_URL}/${taskId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Status check failed: HTTP ${response.status}`);
                }

                const data = await response.json();
                console.log(`📊 Poll attempt ${attempts}:`, data);

                const taskStatus = data.data?.task_status || data.task_status;

                // Update progress based on status
                updateProgressFromStatus(taskStatus, attempts);

                if (taskStatus === 'succeed') {
                    console.log('✅ Generation completed successfully');
                    return {
                        success: true,
                        video_url: data.data?.task_result?.video_url || data.task_result?.video_url,
                        data: data
                    };
                } else if (taskStatus === 'failed') {
                    throw new Error('Video generation failed on the server');
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, API_CONFIG.POLL_INTERVAL));

            } catch (error) {
                console.error('❌ Polling error:', error);
                if (attempts >= API_CONFIG.MAX_POLL_ATTEMPTS) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, API_CONFIG.POLL_INTERVAL));
            }
        }

        throw new Error('Generation timed out after maximum attempts');
    }

    // ==================== DEMO MODE SIMULATION ====================
    async function simulateProgress() {
        return new Promise((resolve) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 2;
                if (progress > 95) {
                    progress = 95;
                }

                // Update progress bar
                if (elements.progressFill) {
                    elements.progressFill.style.width = `${progress}%`;
                }
                if (elements.progressPercent) {
                    elements.progressPercent.textContent = `${Math.round(progress)}%`;
                }

                // Update steps
                const steps = document.querySelectorAll('.step');
                const activeStep = Math.floor(progress / 25);
                steps.forEach((step, index) => {
                    if (index === activeStep) {
                        step.classList.add('active');
                    } else {
                        step.classList.remove('active');
                    }
                });

                if (progress >= 95) {
                    clearInterval(interval);
                    setTimeout(resolve, 500);
                }
            }, 100);
        });
    }

    // ==================== PROGRESS UPDATE ====================
    function updateProgressFromStatus(status, attempt) {
        let progress = 0;
        let activeStep = 0;

        if (status === 'submitted') {
            progress = 10;
            activeStep = 0;
        } else if (status === 'processing') {
            // Gradually increase progress during processing
            progress = Math.min(10 + (attempt * 1.5), 90);
            activeStep = Math.min(Math.floor(attempt / 15), 3);
        }

        // Update progress bar
        if (elements.progressFill) {
            elements.progressFill.style.width = `${progress}%`;
        }
        if (elements.progressPercent) {
            elements.progressPercent.textContent = `${Math.round(progress)}%`;
        }

        // Update active step
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            if (index === activeStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }
    
    // ==================== UI STATE MANAGEMENT ====================
    function setGeneratingState(isGenerating) {
        state.isGenerating = isGenerating;
        
        if (elements.generateBtn) {
            elements.generateBtn.disabled = isGenerating;
            elements.generateBtn.innerHTML = isGenerating 
                ? '<i class="fas fa-spinner fa-spin"></i> Processing...' 
                : '<i class="fas fa-bolt"></i> Generate Video';
        }
        
        // Clear any existing timer
        if (state.generationTimer) {
            clearInterval(state.generationTimer);
            state.generationTimer = null;
        }
    }
    
    function showProgressUI() {
        // Hide previous results
        if (elements.videoResult) {
            elements.videoResult.style.display = 'none';
        }
        
        if (elements.outputPlaceholder) {
            elements.outputPlaceholder.style.display = 'none';
        }
        
        // Show progress
        if (elements.progressContainer) {
            elements.progressContainer.style.display = 'block';
            
            // Reset progress bar
            if (elements.progressFill) {
                elements.progressFill.style.width = '0%';
            }
            if (elements.progressPercent) {
                elements.progressPercent.textContent = '0%';
            }
        }
        
        // Start progress animation
        startProgressAnimation();
    }
    
    function startProgressAnimation() {
        let progress = 0;
        
        state.generationTimer = setInterval(() => {
            progress += 0.5;
            
            // Cap at 95% until API response
            if (progress > 95) {
                progress = 95;
            }
            
            // Update progress bar
            if (elements.progressFill) {
                elements.progressFill.style.width = `${progress}%`;
            }
            if (elements.progressPercent) {
                elements.progressPercent.textContent = `${Math.round(progress)}%`;
            }
            
        }, 100);
    }
    
    function showSuccessUI(formData, apiResult) {
        // Complete progress animation
        if (state.generationTimer) {
            clearInterval(state.generationTimer);
            state.generationTimer = null;
        }

        // Set progress to 100%
        if (elements.progressFill) {
            elements.progressFill.style.width = '100%';
        }
        if (elements.progressPercent) {
            elements.progressPercent.textContent = '100%';
        }

        // Hide progress after delay
        setTimeout(() => {
            if (elements.progressContainer) {
                elements.progressContainer.style.display = 'none';
            }

            // Show video result
            if (elements.videoResult) {
                elements.videoResult.style.display = 'block';

                // Set video source from API result or fallback to placeholder
                if (elements.generatedVideo) {
                    const videoUrl = apiResult.video_url || getPlaceholderVideo(formData.style);
                    elements.generatedVideo.src = videoUrl;
                    state.currentVideoUrl = videoUrl;

                    // Update video info
                    const durationEl = document.getElementById('video-duration');
                    const styleEl = document.getElementById('video-style-result');
                    const ratioEl = document.getElementById('video-ratio');

                    if (durationEl) durationEl.textContent = `${formData.length}s`;
                    if (styleEl) styleEl.textContent = formData.style.charAt(0).toUpperCase() + formData.style.slice(1);
                    if (ratioEl) ratioEl.textContent = formData.aspect_ratio;

                    // Try to autoplay
                    setTimeout(() => {
                        elements.generatedVideo.play().catch(e => {
                            console.log('Autoplay prevented:', e.message);
                        });
                    }, 500);
                }

                // Enable download/share buttons
                if (elements.downloadBtn) elements.downloadBtn.disabled = false;
                if (elements.shareBtn) elements.shareBtn.disabled = false;
            }
        }, 1000);
    }
    
    function showErrorUI(errorMessage) {
        // Stop progress animation
        if (state.generationTimer) {
            clearInterval(state.generationTimer);
            state.generationTimer = null;
        }

        // Hide progress
        if (elements.progressContainer) {
            elements.progressContainer.style.display = 'none';
        }

        // Show error message
        if (elements.outputPlaceholder) {
            elements.outputPlaceholder.style.display = 'block';

            // Check if it's a credits error
            const isCreditsError = errorMessage.toLowerCase().includes('credits') || errorMessage.toLowerCase().includes('billing');

            let actionButtons = '';
            if (isCreditsError) {
                actionButtons = `
                    <a href="https://thankyouai.com/dashboard" target="_blank" style="
                        display: inline-block;
                        background: #ff6b00;
                        color: white;
                        text-decoration: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 4px;
                        margin-right: 0.5rem;
                        cursor: pointer;
                    ">
                        <i class="fas fa-credit-card"></i> Add Credits
                    </a>
                    <button id="enable-demo-btn" style="
                        background: #4a6fa5;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-right: 0.5rem;
                    ">
                        <i class="fas fa-play-circle"></i> Try Demo Mode
                    </button>
                `;
            }

            elements.outputPlaceholder.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 1rem;"></i>
                    <h4 style="margin-bottom: 0.5rem;">Generation Failed</h4>
                    <p style="color: #666; margin-bottom: 1.5rem;">${errorMessage}</p>
                    <div style="display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap;">
                        ${actionButtons}
                        <button id="retry-btn" style="
                            background: #4a6fa5;
                            color: white;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 4px;
                            cursor: pointer;
                        ">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </div>
                </div>
            `;

            // Add retry button listener
            const retryBtn = document.getElementById('retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    elements.outputPlaceholder.innerHTML = `
                        <div class="placeholder-icon">
                            <i class="fas fa-film"></i>
                        </div>
                        <h4>Your Video Will Appear Here</h4>
                        <p>Enter description and click "Generate Video" to start</p>
                    `;
                });
            }

            // Add demo mode button listener
            const enableDemoBtn = document.getElementById('enable-demo-btn');
            if (enableDemoBtn) {
                enableDemoBtn.addEventListener('click', () => {
                    state.demoMode = true;
                    localStorage.setItem('stark_demo_mode', 'true');
                    if (elements.demoModeCheckbox) {
                        elements.demoModeCheckbox.checked = true;
                    }
                    updateDemoModeIndicator();
                    checkApiKeyStatus();
                    showNotification('Demo mode enabled! Using placeholder videos.', 'info');
                    elements.outputPlaceholder.innerHTML = `
                        <div class="placeholder-icon">
                            <i class="fas fa-film"></i>
                        </div>
                        <h4>Your Video Will Appear Here</h4>
                        <p>Enter description and click "Generate Video" to start</p>
                    `;
                });
            }
        }
    }
    
    // ==================== SETTINGS MANAGEMENT ====================
    function checkApiKeyStatus() {
        if (elements.apiNotice) {
            if (!API_CONFIG.API_KEY && !state.demoMode) {
                elements.apiNotice.style.display = 'flex';
            } else {
                elements.apiNotice.style.display = 'none';
            }
        }

        // Show/hide setup guide
        if (elements.setupGuide) {
            if (!API_CONFIG.API_KEY && !state.demoMode) {
                elements.setupGuide.classList.add('active');
            } else {
                elements.setupGuide.classList.remove('active');
            }
        }
    }

    function updateDemoModeIndicator() {
        if (elements.demoModeIndicator) {
            elements.demoModeIndicator.style.display = state.demoMode ? 'flex' : 'none';
        }
    }

    function loadSettings() {
        const savedApiKey = localStorage.getItem('stark_api_key');
        const savedModel = localStorage.getItem('stark_model');
        const savedDemoMode = localStorage.getItem('stark_demo_mode');

        if (savedApiKey) {
            API_CONFIG.API_KEY = savedApiKey;
            if (elements.apiKeyInput) {
                elements.apiKeyInput.value = savedApiKey;
            }
        }

        if (savedModel && elements.modelSelect) {
            elements.modelSelect.value = savedModel;
        }

        if (savedDemoMode !== null && elements.demoModeCheckbox) {
            state.demoMode = savedDemoMode === 'true';
            elements.demoModeCheckbox.checked = state.demoMode;
        }

        updateDemoModeIndicator();
        console.log('📝 Settings loaded');
    }

    function saveSettings() {
        const apiKey = elements.apiKeyInput.value.trim();
        const model = elements.modelSelect.value;
        const demoMode = elements.demoModeCheckbox ? elements.demoModeCheckbox.checked : false;

        // Save to localStorage
        if (apiKey) {
            localStorage.setItem('stark_api_key', apiKey);
            API_CONFIG.API_KEY = apiKey;
        }
        localStorage.setItem('stark_model', model);
        localStorage.setItem('stark_demo_mode', demoMode.toString());

        // Update state
        state.demoMode = demoMode;

        // Update UI
        updateDemoModeIndicator();
        checkApiKeyStatus();

        showNotification('Settings saved successfully!', 'success');
        closeSettingsModal();
    }

    function openSettingsModal() {
        if (elements.settingsModal) {
            elements.settingsModal.style.display = 'flex';
        }
    }

    function closeSettingsModal() {
        if (elements.settingsModal) {
            elements.settingsModal.style.display = 'none';
        }
    }

    // ==================== HELPER FUNCTIONS ====================
    function updateCharCounter() {
        const charCount = document.getElementById('char-count');
        if (charCount && elements.promptInput) {
            const length = elements.promptInput.value.length;
            charCount.textContent = `${length}/500`;
            
            // Color coding
            if (length < 50) {
                charCount.style.color = '#ff6b6b';
            } else if (length < 150) {
                charCount.style.color = '#ffa726';
            } else {
                charCount.style.color = '#4CAF50';
            }
        }
    }
    
    function getPlaceholderVideo(style) {
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
    
    function downloadVideo() {
        if (!state.currentVideoUrl) {
            showNotification('No video to download', 'error');
            return;
        }
        
        const link = document.createElement('a');
        link.href = state.currentVideoUrl;
        link.download = `stark-video-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Download started', 'info');
    }
    
    function shareVideo() {
        if (!state.currentJobId) {
            showNotification('No video to share', 'error');
            return;
        }
        
        const shareUrl = `${window.location.origin}/video/${state.currentJobId}`;
        
        if (navigator.share) {
            // Use Web Share API if available
            navigator.share({
                title: 'Stark AI Generated Video',
                text: 'Check out this AI-generated video!',
                url: shareUrl
            });
        } else {
            // Fallback to copy link
            navigator.clipboard.writeText(shareUrl)
                .then(() => showNotification('Link copied to clipboard!', 'success'))
                .catch(() => showNotification('Failed to copy link', 'error'));
        }
    }
    
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.stark-notification');
        if (existing) existing.remove();
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `stark-notification stark-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        notification.querySelector('.notification-content').style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        
        notification.querySelector('.notification-close').style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            margin-left: 1rem;
            padding: 0 0.5rem;
        `;
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
    }
    
    // ==================== START APPLICATION ====================
    init();
});