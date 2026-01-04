// Stark Video AI - Main Script (Optimized & Debugged Version)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Stark Video AI initialized');
    
    // ==================== GLOBAL STATE ====================
    const state = {
        isGenerating: false,
        generationTimer: null,
        currentJobId: null,
        currentVideoUrl: null
    };
    
    // ==================== API CONFIG ====================
    const API_CONFIG = {
        BASE_URL: 'https://58fhjfjqof.execute-api.ap-southeast-2.amazonaws.com/default/stark-video-generator',
        TIMEOUT: 30000
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
        
        // UI Components
        progressContainer: document.getElementById('progress-container'),
        progressFill: document.getElementById('progress-fill'),
        progressPercent: document.getElementById('progress-percent'),
        videoResult: document.getElementById('video-result'),
        generatedVideo: document.getElementById('generated-video'),
        outputPlaceholder: document.querySelector('.output-placeholder')
    };
    
    // ==================== INITIALIZATION ====================
    function init() {
        console.log('🔧 Initializing application...');
        
        // Validate critical elements
        if (!elements.generateBtn) {
            console.error('❌ Generate button not found!');
            return;
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize character counter
        if (elements.promptInput) {
            elements.promptInput.addEventListener('input', updateCharCounter);
        }
        
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
            
            // Send API request
            const result = await sendGenerationRequest(formData);
            
            if (result.success) {
                // Update state with job info
                state.currentJobId = result.job_id;
                
                // Show success UI
                showSuccessUI(formData, result);
                
                // Show notification
                showNotification(`✅ Video job queued! Job ID: ${result.job_id}`, 'success');
                
            } else {
                throw new Error(result.error || 'Generation failed');
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
            aspect_ratio: elements.aspectSelect ? elements.aspectSelect.value : '16:9'
        };
    }
    
    // ==================== API REQUEST ====================
    async function sendGenerationRequest(formData) {
        console.log('📤 Sending API request:', formData);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
        
        try {
            const response = await fetch(API_CONFIG.BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Request-Source': 'stark_video_web',
                    'X-Client-Version': '1.0.0'
                },
                body: JSON.stringify(formData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('📥 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('✅ API response:', data);
            
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
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
                
                // Set video source (placeholder for now)
                if (elements.generatedVideo) {
                    const placeholderUrl = getPlaceholderVideo(formData.style);
                    elements.generatedVideo.src = placeholderUrl;
                    state.currentVideoUrl = placeholderUrl;
                    
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
            elements.outputPlaceholder.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 1rem;"></i>
                    <h4 style="margin-bottom: 0.5rem;">Generation Failed</h4>
                    <p style="color: #666; margin-bottom: 1.5rem;">${errorMessage}</p>
                    <button onclick="window.location.reload()" style="
                        background: #4a6fa5;
                        color: white;
                        border: none;
                        padding: 0.5rem 1.5rem;
                        border-radius: 4px;
                        cursor: pointer;
                    ">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
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