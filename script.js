// Stark Video AI - Google Gemini API (Veo) video generation
// Docs: https://ai.google.dev/gemini-api/docs/veo
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ==================== CONFIG ====================
    const API_CONFIG = {
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
        API_KEY: '',                               // Set via Settings (saved in localStorage)
        MODEL: 'veo-3.1-generate-preview',
        POLL_INTERVAL: 10000,                      // Google recommends polling every ~10s
        MAX_WAIT_MS: 12 * 60 * 1000                // Give up after 12 minutes
    };

    const MODEL_NAMES = {
        'veo-3.1-generate-preview': 'Veo 3.1',
        'veo-3.1-fast-generate-preview': 'Veo 3.1 Fast',
        'veo-3.1-lite-generate-preview': 'Veo 3.1 Lite'
    };

    const STYLE_HINTS = {
        realistic: 'Photorealistic, natural lighting, realistic detail.',
        cinematic: 'Cinematic film look, dramatic lighting, shallow depth of field, smooth camera movement.',
        anime: 'Japanese anime style, cel-shaded, vibrant colors.',
        '3d-animation': '3D animated film style, soft global illumination, stylized characters.',
        artistic: 'Painterly artistic style, expressive brush textures, rich colors.',
        cartoon: '2D cartoon style, bold outlines, bright playful colors.'
    };

    const DEMO_VIDEOS = [
        'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
    ];

    // ==================== STATE ====================
    const state = {
        isGenerating: false,
        demoMode: false,
        abort: null,              // AbortController for the current job
        progressTimer: null,
        elapsedTimer: null,
        startTime: 0,
        currentVideoUrl: null,    // blob: URL (or remote URL in demo mode)
        currentVideoBlob: null,
        startImage: null          // { mimeType, data (base64), dataUrl }
    };

    // ==================== DOM ====================
    const $ = (id) => document.getElementById(id);
    const el = {
        prompt: $('video-prompt'),
        style: $('video-style'),
        length: $('video-length'),
        aspect: $('aspect-ratio'),
        resolution: $('video-resolution'),
        startImageInput: $('start-image'),
        imageUploadText: $('image-upload-text'),
        imagePreview: $('image-preview'),
        imagePreviewImg: $('image-preview-img'),
        imageRemove: $('image-remove'),
        generateBtn: $('generate-btn'),
        downloadBtn: $('download-btn'),
        shareBtn: $('share-btn'),
        settingsBtn: $('settings-btn'),
        mobileSettingsBtn: $('mobile-settings-btn'),
        saveSettingsBtn: $('save-settings-btn'),
        mobileMenuBtn: $('mobile-menu-btn'),
        mobileMenu: $('mobile-menu'),
        tryFreeBtn: $('try-free-btn'),
        signupBtn: $('signup-btn'),
        settingsModal: $('settings-modal'),
        closeSettingsModal: $('close-settings-modal'),
        apiKeyInput: $('api-key'),
        modelSelect: $('model-select'),
        demoModeCheckbox: $('demo-mode'),
        demoModeIndicator: $('demo-mode-indicator'),
        setupGuide: $('setup-guide'),
        openSettingsBtn: $('open-settings-btn'),
        apiNotice: $('api-notice'),
        configureApiLink: $('configure-api-link'),
        progressContainer: $('progress-container'),
        progressFill: $('progress-fill'),
        progressPercent: $('progress-percent'),
        progressElapsed: $('progress-elapsed'),
        progressNote: $('progress-note'),
        videoResult: $('video-result'),
        generatedVideo: $('generated-video'),
        outputPlaceholder: document.querySelector('.output-placeholder'),
        charCount: $('char-count'),
        currentTime: $('current-time'),
        year: $('year')
    };

    const PLACEHOLDER_HTML = el.outputPlaceholder ? el.outputPlaceholder.innerHTML : '';

    // ==================== INIT ====================
    function init() {
        loadSettings();
        bindEvents();
        updateCharCounter();
        enforceResolutionRules();
        checkApiKeyStatus();
        startClock();
        if (el.year) el.year.textContent = new Date().getFullYear();
    }

    function bindEvents() {
        el.generateBtn?.addEventListener('click', handleGenerate);
        el.downloadBtn?.addEventListener('click', downloadVideo);
        el.shareBtn?.addEventListener('click', shareVideo);
        el.prompt?.addEventListener('input', updateCharCounter);
        el.prompt?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
        });
        el.resolution?.addEventListener('change', enforceResolutionRules);

        // Image-to-video
        el.startImageInput?.addEventListener('change', handleImageSelected);
        el.imageRemove?.addEventListener('click', clearStartImage);

        // Settings
        [el.settingsBtn, el.mobileSettingsBtn, el.openSettingsBtn].forEach(b => b?.addEventListener('click', openSettingsModal));
        el.configureApiLink?.addEventListener('click', (e) => { e.preventDefault(); openSettingsModal(); });
        el.closeSettingsModal?.addEventListener('click', closeSettingsModal);
        el.saveSettingsBtn?.addEventListener('click', saveSettings);
        el.settingsModal?.addEventListener('click', (e) => { if (e.target === el.settingsModal) closeSettingsModal(); });
        el.modelSelect?.addEventListener('change', enforceResolutionRules);

        // Navigation / CTAs
        el.mobileMenuBtn?.addEventListener('click', () => el.mobileMenu?.classList.toggle('active'));
        el.mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => el.mobileMenu.classList.remove('active')));
        [el.tryFreeBtn, el.signupBtn].forEach(b => b?.addEventListener('click', () => {
            document.querySelector('.generator-section')?.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => el.prompt?.focus(), 500);
        }));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSettingsModal();
                el.mobileMenu?.classList.remove('active');
            }
        });
    }

    // ==================== GENERATION ====================
    async function handleGenerate() {
        if (state.isGenerating) {
            // Second click while running = cancel
            state.abort?.abort();
            return;
        }

        const prompt = el.prompt.value.trim();
        if (prompt.length < 3) {
            notify('Please enter a video description (at least 3 characters).', 'error');
            el.prompt.focus();
            return;
        }

        if (!state.demoMode && !API_CONFIG.API_KEY) {
            notify('Add your Gemini API key in Settings, or turn on Demo Mode.', 'error');
            openSettingsModal();
            return;
        }

        const form = getFormData();
        state.abort = new AbortController();
        setGenerating(true);
        showProgressUI();

        try {
            let result;
            if (state.demoMode) {
                result = await runDemo(form, state.abort.signal);
            } else {
                result = await generateWithVeo(form, state.abort.signal);
            }
            showSuccessUI(form, result);
            notify('Video generated successfully!', 'success');
        } catch (err) {
            if (err.name === 'AbortError') {
                showErrorUI('Generation cancelled. (If Veo already started, it may still be billed.)', false);
                notify('Generation cancelled.', 'info');
            } else {
                console.error('Generation error:', err);
                showErrorUI(err.message, true);
                notify(err.message, 'error');
            }
        } finally {
            setGenerating(false);
            stopTimers();
        }
    }

    function getFormData() {
        const style = el.style?.value || 'realistic';
        const userPrompt = el.prompt.value.trim();
        return {
            userPrompt,
            prompt: `${userPrompt}\n\nStyle: ${STYLE_HINTS[style] || ''}`.trim(),
            style,
            duration: el.length?.value || '8',
            aspectRatio: el.aspect?.value || '16:9',
            resolution: el.resolution?.value || '720p',
            model: el.modelSelect?.value || API_CONFIG.MODEL,
            image: state.startImage
        };
    }

    // Veo rules: 1080p and 4K require 8s; Lite has no 4K.
    function enforceResolutionRules() {
        if (!el.resolution || !el.length) return;
        const isLite = (el.modelSelect?.value || '').includes('lite');
        const fourK = el.resolution.querySelector('option[value="4k"]');
        if (fourK) {
            fourK.disabled = isLite;
            if (isLite && el.resolution.value === '4k') el.resolution.value = '1080p';
        }
        const needs8 = el.resolution.value !== '720p';
        [...el.length.options].forEach(o => { o.disabled = needs8 && o.value !== '8'; });
        if (needs8) el.length.value = '8';
    }

    async function veoFetch(url, options = {}) {
        const res = await fetch(url, {
            ...options,
            headers: {
                'x-goog-api-key': API_CONFIG.API_KEY,
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...(options.headers || {})
            }
        });
        let data = null;
        try { data = await res.json(); } catch { /* non-JSON */ }
        if (!res.ok) throw new Error(friendlyApiError(res.status, data));
        return data;
    }

    function friendlyApiError(status, data) {
        const msg = data?.error?.message || `HTTP ${status}`;
        if (status === 400 && /API key not valid/i.test(msg)) return 'Invalid Gemini API key. Check it in Settings.';
        if (status === 403) return `Permission denied: ${msg}. Make sure the Generative Language API is enabled for your key.`;
        if (status === 404) return `Model not found: ${msg}. Try a different Veo model in Settings.`;
        if (status === 429) return `Quota or rate limit reached: ${msg}. Veo needs billing enabled on your Gemini API project.`;
        return msg;
    }

    async function generateWithVeo(form, signal) {
        // 1) Start the long-running operation
        setStep(0, 5);
        const instance = { prompt: form.prompt };
        if (form.image) {
            instance.image = { inlineData: { mimeType: form.image.mimeType, data: form.image.data } };
        }
        const body = {
            instances: [instance],
            parameters: {
                aspectRatio: form.aspectRatio,
                resolution: form.resolution,
                durationSeconds: Number(form.duration)
            }
        };

        const op = await veoFetch(`${API_CONFIG.BASE_URL}/models/${form.model}:predictLongRunning`, {
            method: 'POST',
            body: JSON.stringify(body),
            signal
        });
        if (!op?.name) throw new Error('Unexpected response from Gemini API (no operation name).');
        console.log('Veo operation started:', op.name);

        // 2) Poll until done
        setStep(1, 10);
        startFakeProgress(10, 85, 150000); // creep toward 85% over ~2.5 min
        let operation = op;
        while (!operation.done) {
            if (Date.now() - state.startTime > API_CONFIG.MAX_WAIT_MS) {
                throw new Error('Veo is taking unusually long. Please try again later.');
            }
            await sleep(API_CONFIG.POLL_INTERVAL, signal);
            operation = await veoFetch(`${API_CONFIG.BASE_URL}/${op.name}`, { signal });
        }

        if (operation.error) {
            throw new Error(`Veo error: ${operation.error.message || 'generation failed'}`);
        }

        const resp = operation.response?.generateVideoResponse;
        const sample = resp?.generatedSamples?.[0];
        const uri = sample?.video?.uri;
        if (!uri) {
            const reasons = resp?.raiMediaFilteredReasons;
            if (reasons?.length) throw new Error(`Blocked by Google's safety filters: ${reasons.join(' ')} Try rewording your prompt.`);
            throw new Error('Veo finished but returned no video. Try rewording your prompt.');
        }

        // 3) Download the MP4 (needs the API key)
        stopFakeProgress();
        setStep(2, 90);
        const blob = await downloadVeoVideo(uri, signal);
        setStep(3, 100);
        return { blob, url: URL.createObjectURL(blob), remoteUri: uri };
    }

    async function downloadVeoVideo(uri, signal) {
        // Pass the key as a query param so the request stays "simple" (no CORS preflight)
        const keyed = uri + (uri.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(API_CONFIG.API_KEY);
        const res = await fetch(keyed, { signal });
        if (!res.ok) throw new Error(`Could not download the video (HTTP ${res.status}).`);
        return res.blob();
    }

    async function runDemo(form, signal) {
        setStep(0, 5);
        await sleep(800, signal);
        setStep(1, 10);
        startFakeProgress(10, 90, 4000);
        await sleep(4500, signal);
        setStep(3, 100);
        const url = DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)];
        return { blob: null, url, remoteUri: url };
    }

    // ==================== PROGRESS UI ====================
    function setStep(index, percent) {
        document.querySelectorAll('.progress-steps .step').forEach((s, i) => {
            s.classList.toggle('active', i === index);
            s.classList.toggle('done', i < index);
        });
        if (percent != null) setProgress(percent);
    }

    function setProgress(p) {
        const v = Math.max(0, Math.min(100, p));
        if (el.progressFill) el.progressFill.style.width = `${v}%`;
        if (el.progressPercent) el.progressPercent.textContent = `${Math.round(v)}%`;
    }

    function startFakeProgress(from, to, durationMs) {
        stopFakeProgress();
        const t0 = Date.now();
        state.progressTimer = setInterval(() => {
            const t = Math.min(1, (Date.now() - t0) / durationMs);
            // ease-out so it slows down but never stalls completely
            setProgress(from + (to - from) * (1 - Math.pow(1 - t, 2)));
        }, 250);
    }

    function stopFakeProgress() {
        clearInterval(state.progressTimer);
        state.progressTimer = null;
    }

    function stopTimers() {
        stopFakeProgress();
        clearInterval(state.elapsedTimer);
        state.elapsedTimer = null;
    }

    function showProgressUI() {
        if (el.videoResult) el.videoResult.style.display = 'none';
        if (el.outputPlaceholder) el.outputPlaceholder.style.display = 'none';
        if (el.progressContainer) el.progressContainer.style.display = 'block';
        if (el.progressNote) {
            el.progressNote.textContent = state.demoMode
                ? 'Demo Mode: showing a sample video, no API call is made.'
                : 'Veo usually takes 1–6 minutes. Keep this tab open. Click the button again to cancel.';
        }
        setStep(0, 0);

        state.startTime = Date.now();
        const tick = () => {
            const s = Math.floor((Date.now() - state.startTime) / 1000);
            if (el.progressElapsed) el.progressElapsed.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        };
        tick();
        state.elapsedTimer = setInterval(tick, 1000);
    }

    function setGenerating(on) {
        state.isGenerating = on;
        if (!el.generateBtn) return;
        el.generateBtn.classList.toggle('is-cancel', on);
        el.generateBtn.innerHTML = on
            ? '<i class="fas fa-spinner fa-spin"></i> Generating… (click to cancel)'
            : '<i class="fas fa-bolt"></i> Generate Video with Veo';
    }

    function showSuccessUI(form, result) {
        if (state.currentVideoUrl?.startsWith('blob:')) URL.revokeObjectURL(state.currentVideoUrl);
        state.currentVideoUrl = result.url;
        state.currentVideoBlob = result.blob;

        if (el.progressContainer) el.progressContainer.style.display = 'none';
        if (el.videoResult) el.videoResult.style.display = 'block';

        const v = el.generatedVideo;
        if (v) {
            v.src = result.url;
            v.load();
            v.play().catch(() => { /* autoplay may be blocked */ });
        }

        setText('video-title', form.userPrompt.length > 70 ? form.userPrompt.slice(0, 70) + '…' : form.userPrompt);
        setText('video-duration', `${form.duration}s`);
        setText('video-style-result', el.style?.selectedOptions[0]?.textContent || form.style);
        setText('video-ratio', `${form.aspectRatio} · ${form.resolution}`);
        setText('video-model', state.demoMode ? 'Demo' : (MODEL_NAMES[form.model] || form.model));

        if (el.downloadBtn) el.downloadBtn.disabled = false;
        if (el.shareBtn) el.shareBtn.disabled = false;
    }

    function showErrorUI(message, showRetry) {
        if (el.progressContainer) el.progressContainer.style.display = 'none';
        if (!el.outputPlaceholder) return;
        el.outputPlaceholder.style.display = 'block';
        el.outputPlaceholder.innerHTML = `
            <div class="output-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>${showRetry ? 'Generation Failed' : 'Stopped'}</h4>
                <p>${escapeHtml(message)}</p>
                <div class="output-error-actions">
                    ${showRetry ? '<button class="btn btn-primary btn-sm" id="retry-btn"><i class="fas fa-redo"></i> Try Again</button>' : ''}
                    <button class="btn btn-outline btn-sm" id="reset-btn"><i class="fas fa-times"></i> Dismiss</button>
                </div>
            </div>`;
        $('retry-btn')?.addEventListener('click', () => { resetPlaceholder(); handleGenerate(); });
        $('reset-btn')?.addEventListener('click', resetPlaceholder);
    }

    function resetPlaceholder() {
        if (el.outputPlaceholder) el.outputPlaceholder.innerHTML = PLACEHOLDER_HTML;
    }

    // ==================== IMAGE-TO-VIDEO ====================
    function handleImageSelected(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
            notify('Please choose a PNG, JPEG or WebP image.', 'error');
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            notify('Image is too large (max 15 MB).', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            state.startImage = { mimeType: file.type, data: dataUrl.split(',')[1], dataUrl };
            if (el.imagePreviewImg) el.imagePreviewImg.src = dataUrl;
            if (el.imagePreview) el.imagePreview.hidden = false;
            if (el.imageUploadText) el.imageUploadText.textContent = `Starting image: ${file.name}`;
        };
        reader.readAsDataURL(file);
    }

    function clearStartImage() {
        state.startImage = null;
        if (el.startImageInput) el.startImageInput.value = '';
        if (el.imagePreview) el.imagePreview.hidden = true;
        if (el.imageUploadText) el.imageUploadText.textContent = 'Optional: add a starting image (image-to-video)';
    }

    // ==================== DOWNLOAD / SHARE ====================
    function downloadVideo() {
        if (!state.currentVideoUrl) return notify('No video to download yet.', 'error');
        const a = document.createElement('a');
        a.href = state.currentVideoUrl;
        a.download = `stark-veo-${Date.now()}.mp4`;
        if (!state.currentVideoBlob) a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
        notify('Download started.', 'info');
    }

    async function shareVideo() {
        if (!state.currentVideoUrl) return notify('No video to share yet.', 'error');
        try {
            if (state.currentVideoBlob && navigator.canShare) {
                const file = new File([state.currentVideoBlob], 'stark-veo-video.mp4', { type: 'video/mp4' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'AI video made with Stark + Google Veo' });
                    return;
                }
            }
            notify('Your browser can\'t share video files directly. Download it and share the file instead.', 'info');
        } catch (err) {
            if (err.name !== 'AbortError') notify('Sharing failed.', 'error');
        }
    }

    // ==================== SETTINGS ====================
    function loadSettings() {
        try {
            API_CONFIG.API_KEY = localStorage.getItem('stark_gemini_api_key') || API_CONFIG.API_KEY;
            const model = localStorage.getItem('stark_veo_model');
            state.demoMode = localStorage.getItem('stark_demo_mode') === 'true';
            if (model && el.modelSelect && MODEL_NAMES[model]) el.modelSelect.value = model;
        } catch { /* storage unavailable */ }
        if (el.apiKeyInput) el.apiKeyInput.value = API_CONFIG.API_KEY;
        if (el.demoModeCheckbox) el.demoModeCheckbox.checked = state.demoMode;
        updateDemoModeIndicator();
    }

    function saveSettings() {
        const key = el.apiKeyInput?.value.trim() || '';
        API_CONFIG.API_KEY = key;
        state.demoMode = !!el.demoModeCheckbox?.checked;
        try {
            if (key) localStorage.setItem('stark_gemini_api_key', key);
            else localStorage.removeItem('stark_gemini_api_key');
            localStorage.setItem('stark_veo_model', el.modelSelect?.value || API_CONFIG.MODEL);
            localStorage.setItem('stark_demo_mode', String(state.demoMode));
        } catch { /* storage unavailable */ }
        updateDemoModeIndicator();
        checkApiKeyStatus();
        enforceResolutionRules();
        closeSettingsModal();
        notify('Settings saved.', 'success');
    }

    function checkApiKeyStatus() {
        const missing = !API_CONFIG.API_KEY && !state.demoMode;
        if (el.apiNotice) el.apiNotice.style.display = 'none';
        el.setupGuide?.classList.toggle('active', missing);
    }

    function updateDemoModeIndicator() {
        if (el.demoModeIndicator) el.demoModeIndicator.style.display = state.demoMode ? 'flex' : 'none';
    }

    function openSettingsModal() {
        if (el.settingsModal) el.settingsModal.style.display = 'flex';
        setTimeout(() => el.apiKeyInput?.focus(), 50);
    }

    function closeSettingsModal() {
        if (el.settingsModal) el.settingsModal.style.display = 'none';
    }

    // ==================== HELPERS ====================
    function updateCharCounter() {
        if (!el.charCount || !el.prompt) return;
        const n = el.prompt.value.length;
        el.charCount.textContent = `${n}/500`;
        el.charCount.style.color = n < 50 ? '#ff6b6b' : n < 150 ? '#ffa726' : '#4CAF50';
    }

    function startClock() {
        if (!el.currentTime) return;
        const tick = () => {
            el.currentTime.innerHTML = `<i class="fas fa-clock"></i> ${new Date().toLocaleTimeString()}`;
        };
        tick();
        setInterval(tick, 1000);
    }

    function setText(id, text) {
        const node = $(id);
        if (node) node.textContent = text;
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function sleep(ms, signal) {
        return new Promise((resolve, reject) => {
            if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
            const t = setTimeout(resolve, ms);
            signal?.addEventListener('abort', () => {
                clearTimeout(t);
                reject(new DOMException('Aborted', 'AbortError'));
            }, { once: true });
        });
    }

    function notify(message, type = 'info') {
        document.querySelector('.stark-notification')?.remove();
        const n = document.createElement('div');
        n.className = `stark-notification stark-notification-${type}`;
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
        n.innerHTML = `<i class="fas fa-${icon}"></i><span></span><button class="notification-close" aria-label="Close">&times;</button>`;
        n.querySelector('span').textContent = message;
        n.querySelector('.notification-close').addEventListener('click', () => n.remove());
        document.body.appendChild(n);
        setTimeout(() => n.remove(), type === 'error' ? 8000 : 5000);
    }

    init();
});
