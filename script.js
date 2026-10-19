// Stark Video AI
// Engines:
//   - "free": LTX-Video on Hugging Face Spaces (Lightricks/ltx-video-distilled) via @gradio/client
//   - Google Veo 3.1 through the Gemini API (paid key): https://ai.google.dev/gemini-api/docs/veo
(function () {
    'use strict';

    // ==================== CONFIG ====================
    var CONFIG = {
        GEMINI_BASE: 'https://generativelanguage.googleapis.com/v1beta',
        HF_SPACE: 'Lightricks/ltx-video-distilled',
        GRADIO_CLIENT_URL: 'https://cdn.jsdelivr.net/npm/@gradio/client@2.5.0/dist/index.min.js',
        VEO_POLL_MS: 10000,
        MAX_WAIT_MS: 12 * 60 * 1000
    };

    var ENGINES = {
        free: { label: 'Free engine', name: 'LTX-Video' },
        'veo-3.1-lite-generate-preview': { label: 'Veo 3.1 Lite', name: 'Veo 3.1 Lite' },
        'veo-3.1-fast-generate-preview': { label: 'Veo 3.1 Fast', name: 'Veo 3.1 Fast' },
        'veo-3.1-generate-preview': { label: 'Veo 3.1', name: 'Veo 3.1' }
    };

    var DURATIONS = { free: ['2', '3', '4', '5'], veo: ['4', '6', '8'] };
    var FREE_SIZES = { '16:9': [704, 480], '9:16': [480, 704] };

    var STYLE_HINTS = {
        realistic: 'Photorealistic, natural lighting, realistic detail.',
        cinematic: 'Cinematic film look, dramatic lighting, shallow depth of field, smooth camera movement.',
        anime: 'Japanese anime style, cel-shaded, vibrant colors.',
        '3d-animation': '3D animated film style, soft global illumination, stylized characters.',
        artistic: 'Painterly artistic style, expressive brush textures, rich colors.',
        cartoon: '2D cartoon style, bold outlines, bright playful colors.'
    };

    var DEMO_VIDEOS = [
        'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
    ];

    // ==================== STATE ====================
    var settings = { engine: 'free', hfToken: '', apiKey: '', demo: false };
    var state = {
        busy: false,
        abort: null,
        startTime: 0,
        clockTimer: null,
        progressTimer: null,
        startImage: null,     // { mimeType, data, dataUrl }
        history: [],          // [{ url, blob, prompt, meta }]
        current: -1,
        lastFocus: null
    };

    // ==================== DOM ====================
    function $(id) { return document.getElementById(id); }
    var el = {};

    function cacheDom() {
        [
            'maker', 'prompt', 'char-count', 'style', 'length-group', 'resolution-field', 'resolution-group',
            'start-image', 'attach-text', 'attach-preview', 'attach-img', 'attach-remove',
            'generate-btn', 'generate-label', 'generate-hint',
            'viewfinder', 'rec-label', 'rec-time', 'vf-meta', 'status-text', 'status-detail',
            'progress', 'progress-fill', 'cancel-btn', 'error-text', 'retry-btn', 'token-btn', 'video',
            'output-bar', 'output-caption', 'download-btn', 'share-btn', 'history-wrap', 'history',
            'settings-btn', 'engine-badge', 'settings', 'hf-token', 'api-key', 'demo-mode', 'demo-mode-footer',
            'hf-fields', 'veo-fields', 'save-settings-btn', 'toasts', 'year'
        ].forEach(function (id) {
            el[id.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })] = $(id);
        });
    }

    // ==================== INIT ====================
    function init() {
        cacheDom();
        loadSettings();
        renderLengths();
        applyEngineUI();
        bindEvents();
        updateCharCount();
        updateMeta();
        if (el.year) el.year.textContent = String(new Date().getFullYear());
    }

    function bindEvents() {
        el.maker.addEventListener('submit', function (e) { e.preventDefault(); generate(); });
        el.prompt.addEventListener('input', updateCharCount);
        el.prompt.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); generate(); }
        });

        document.querySelectorAll('[data-prompt]').forEach(function (b) {
            b.addEventListener('click', function () {
                el.prompt.value = b.getAttribute('data-prompt');
                updateCharCount();
                if (b.classList.contains('use-prompt')) {
                    document.querySelector('.studio').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                el.prompt.focus({ preventScroll: true });
            });
        });

        el.maker.addEventListener('change', function (e) {
            if (e.target.name === 'aspect') {
                el.viewfinder.setAttribute('data-aspect', e.target.value);
            }
            if (e.target.name === 'resolution') enforceVeoRules();
            updateMeta();
        });

        el.startImage.addEventListener('change', onImageSelected);
        el.attachRemove.addEventListener('click', clearImage);

        el.cancelBtn.addEventListener('click', function () { if (state.abort) state.abort.abort(); });
        el.retryBtn.addEventListener('click', generate);
        el.tokenBtn.addEventListener('click', function () {
            openSettings();
            setTimeout(function () { el.hfToken.focus(); }, 30);
        });
        el.downloadBtn.addEventListener('click', download);
        el.shareBtn.addEventListener('click', share);

        // Settings dialog
        el.settingsBtn.addEventListener('click', openSettings);
        el.settings.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closeSettings); });
        el.saveSettingsBtn.addEventListener('click', saveSettings);
        el.settings.querySelectorAll('input[name="engine"]').forEach(function (r) {
            r.addEventListener('change', updateSettingsFields);
        });
        document.addEventListener('keydown', function (e) {
            if (el.settings.hidden) return;
            if (e.key === 'Escape') closeSettings();
            if (e.key === 'Tab') trapFocus(e);
        });

        el.demoModeFooter.addEventListener('change', function () {
            settings.demo = el.demoModeFooter.checked;
            persist();
            applyEngineUI();
            toast(settings.demo ? 'Demo mode on: sample clips, no engine calls.' : 'Demo mode off.', 'info');
        });
    }

    // ==================== FORM ====================
    function isVeo() { return settings.engine !== 'free'; }

    function radioValue(name) {
        var r = el.maker.querySelector('input[name="' + name + '"]:checked');
        return r ? r.value : null;
    }

    function renderLengths() {
        var list = isVeo() ? DURATIONS.veo : DURATIONS.free;
        var prev = radioValue('length');
        var pick = list.indexOf(prev) >= 0 ? prev : (isVeo() ? '8' : '3');
        el.lengthGroup.innerHTML = list.map(function (v) {
            return '<label><input type="radio" name="length" value="' + v + '"' + (v === pick ? ' checked' : '') + '><span>' + v + 's</span></label>';
        }).join('');
    }

    function enforceVeoRules() {
        if (!isVeo()) return;
        var lite = settings.engine.indexOf('lite') >= 0;
        var fourK = el.resolutionGroup.querySelector('input[value="4k"]');
        fourK.disabled = lite;
        if (lite && fourK.checked) el.resolutionGroup.querySelector('input[value="1080p"]').checked = true;
        var needs8 = radioValue('resolution') !== '720p';
        el.lengthGroup.querySelectorAll('input').forEach(function (i) {
            i.disabled = needs8 && i.value !== '8';
            if (needs8 && i.value === '8') i.checked = true;
        });
    }

    function applyEngineUI() {
        renderLengths();
        el.resolutionField.hidden = !isVeo();
        enforceVeoRules();
        var info = ENGINES[settings.engine] || ENGINES.free;
        el.engineBadge.textContent = settings.demo ? 'Demo mode' : info.label;
        el.settingsBtn.classList.toggle('is-paid', isVeo() && !settings.demo);
        el.settingsBtn.classList.toggle('is-demo', settings.demo);
        el.generateHint.textContent = settings.demo
            ? 'Demo mode is on: you will see a sample clip. Turn it off in Settings.'
            : isVeo()
                ? 'Google Veo: 1–6 minutes, billed to your Gemini API key. Ctrl + Enter also works.'
                : 'Free engine: LTX-Video on Hugging Face, usually under a minute. Ctrl + Enter also works.';
        el.demoModeFooter.checked = settings.demo;
        updateMeta();
    }

    function updateMeta() {
        var parts = [radioValue('aspect') || '16:9', (radioValue('length') || '3') + 's'];
        if (isVeo()) parts.push(radioValue('resolution') || '720p');
        el.vfMeta.textContent = parts.join('  ');
    }

    function updateCharCount() {
        var n = el.prompt.value.length;
        el.charCount.textContent = n + ' / 500';
        el.charCount.classList.toggle('is-good', n >= 60);
    }

    function getForm() {
        var style = el.style.value;
        var userPrompt = el.prompt.value.trim();
        return {
            userPrompt: userPrompt,
            prompt: userPrompt + '\n\nStyle: ' + (STYLE_HINTS[style] || ''),
            styleLabel: el.style.options[el.style.selectedIndex].text,
            duration: radioValue('length') || '3',
            aspect: radioValue('aspect') || '16:9',
            resolution: radioValue('resolution') || '720p',
            engine: settings.engine,
            image: state.startImage
        };
    }

    // ==================== GENERATE ====================
    function generate() {
        if (state.busy) return;
        var prompt = el.prompt.value.trim();
        if (prompt.length < 3) {
            toast('Describe your video first: what happens, where, and how the camera moves.', 'error');
            el.prompt.focus();
            return;
        }
        if (!settings.demo && isVeo() && !settings.apiKey) {
            toast('Google Veo needs a Gemini API key. Add it in Settings, or switch to the free engine.', 'error');
            openSettings();
            return;
        }

        var form = getForm();
        state.abort = new AbortController();
        setBusy(true);
        startWorking();
        // On small screens the viewfinder sits below the form, so bring it into view
        if (window.matchMedia && window.matchMedia('(max-width: 960px)').matches) {
            el.viewfinder.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        var job = settings.demo ? runDemo(form, state.abort.signal)
            : isVeo() ? generateWithVeo(form, state.abort.signal)
                : generateWithHF(form, state.abort.signal);

        job.then(function (result) {
            showResult(form, result);
            if (document.hidden) document.title = 'Video ready - Stark';
        }).catch(function (err) {
            if (err && err.name === 'AbortError') {
                setView('empty');
                toast('Cancelled.', 'info');
            } else {
                console.error(err);
                showError((err && err.message) || 'Something went wrong. Try again.', !!(err && err.quota) && !settings.hfToken);
            }
        }).then(function () {
            setBusy(false);
            stopTimers();
        });
    }

    function setBusy(on) {
        state.busy = on;
        el.generateBtn.disabled = on;
        el.generateLabel.textContent = on ? 'Making your video…' : 'Make video';
    }

    // ---------- Free engine: LTX-Video on Hugging Face ----------
    function generateWithHF(form, signal) {
        setStatus('Connecting to the free server…', 'Hugging Face may need a moment to wake up.', 3);
        var useImage = !!form.image;

        return import(CONFIG.GRADIO_CLIENT_URL).then(function (mod) {
            return mod.Client.connect(CONFIG.HF_SPACE, settings.hfToken
                ? { token: settings.hfToken, events: ['data', 'status'] }
                : { events: ['data', 'status'] })   // 'status' is needed to see queue position and errors
                .catch(function (e) {
                    throw new Error('Couldn\'t reach the free video server (' + ((e && e.message) || e) + '). It may be busy; try again in a minute.');
                })
                .then(function (client) {
                    if (signal.aborted) throw abortError();
                    var size = FREE_SIZES[form.aspect] || FREE_SIZES['16:9'];
                    var payload = [
                        form.prompt,
                        'worst quality, inconsistent motion, blurry, jittery, distorted',
                        useImage ? mod.handle_file(dataUrlToBlob(form.image.dataUrl)) : null,
                        null,
                        size[1],                                  // height
                        size[0],                                  // width
                        useImage ? 'image-to-video' : 'text-to-video',
                        Number(form.duration),
                        9, 42, true, 1, true                      // frames, seed, randomize, guidance, improve texture
                    ];
                    return runGradioJob(client.submit(useImage ? '/image_to_video' : '/text_to_video', payload), signal);
                });
        }).then(function (data) {
            var url = extractVideoUrl(data && data[0]);
            if (!url) throw quotaError('The free server stopped without sending a video. This usually means the free GPU time has run out.');
            stopProgress();
            setStatus('Downloading your video…', '', 94);
            return fetch(url, { signal: signal })
                .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
                .then(function (blob) { return { blob: blob, url: URL.createObjectURL(blob) }; })
                .catch(function (e) {
                    if (e && e.name === 'AbortError') throw e;
                    return { blob: null, url: url };     // stream directly from Hugging Face
                });
        });
    }

    function runGradioJob(job, signal) {
        var iterator = job[Symbol.asyncIterator]();
        var onAbort = function () { try { job.cancel(); } catch (e) { /* ignore */ } };
        signal.addEventListener('abort', onAbort, { once: true });

        function step() {
            if (signal.aborted) return Promise.reject(abortError());
            return iterator.next().then(function (res) {
                if (res.done) return null;
                var msg = res.value;
                if (msg.type === 'data') return msg.data;
                if (msg.type === 'status') {
                    if (msg.stage === 'error') { var fe = friendlyHFError(msg.message); throw fe instanceof Error ? fe : new Error(fe); }
                    if (msg.stage === 'pending' && msg.queue && msg.position != null) {
                        setStatus('Waiting in line: you\'re number ' + (msg.position + 1),
                            msg.eta ? 'About ' + Math.ceil(msg.eta) + ' seconds to go.' : 'The free server is shared by everyone.', 8);
                    } else if (msg.stage === 'generating' || (msg.stage === 'pending' && !msg.queue)) {
                        if (!state.progressTimer) {
                            setStatus('Filming your scene…', 'This usually takes 20–90 seconds.', 15);
                            creepProgress(15, 88, 60000);
                        }
                    }
                }
                return step();
            });
        }
        return step().then(function (data) {
            signal.removeEventListener('abort', onAbort);
            if (signal.aborted) throw abortError();
            return data;
        }, function (err) {
            signal.removeEventListener('abort', onAbort);
            throw err;
        });
    }

    function extractVideoUrl(v) {
        if (!v) return null;
        if (typeof v === 'string') return v;
        if (v.video) return extractVideoUrl(v.video);
        if (v.url) return v.url;
        if (v.path) return 'https://' + CONFIG.HF_SPACE.replace('/', '-').replace(/\./g, '-').toLowerCase() + '.hf.space/gradio_api/file=' + v.path;
        return null;
    }

    function quotaError(text) {
        var err = new Error(text);
        err.quota = true;
        return err;
    }

    function friendlyHFError(message) {
        var m = String(message || '');
        if (/quota|exceeded|ZeroGPU|GPU.*limit/i.test(m)) {
            var wait = m.match(/Try again in ([0-9:]+)/);
            var when = wait && wait[1] !== '0:00:00' ? ' Try again in ' + wait[1] + '.' : '';
            return quotaError('Free GPU time has run out for your network.' + when + ' A free Hugging Face token gives you more.');
        }
        return m ? 'The free server reported: ' + m : 'The free server returned an error. Try again.';
    }

    // ---------- Google Veo ----------
    function veoFetch(url, options) {
        options = options || {};
        var headers = { 'x-goog-api-key': settings.apiKey };
        if (options.body) headers['Content-Type'] = 'application/json';
        return fetch(url, { method: options.method || 'GET', body: options.body, headers: headers, signal: options.signal })
            .then(function (res) {
                return res.json().catch(function () { return null; }).then(function (data) {
                    if (!res.ok) throw new Error(friendlyVeoError(res.status, data));
                    return data;
                });
            });
    }

    function friendlyVeoError(status, data) {
        var msg = (data && data.error && data.error.message) || ('HTTP ' + status);
        if (status === 400 && /API key not valid/i.test(msg)) return 'That Gemini API key isn\'t valid. Check it in Settings.';
        if (status === 403) return 'Permission denied: ' + msg;
        if (status === 404) return 'Google didn\'t find that Veo model. Pick another engine in Settings.';
        if (status === 429) return 'Your Gemini key has no Veo quota. Turn on billing for its Google Cloud project, or switch to the free engine.';
        return msg;
    }

    function generateWithVeo(form, signal) {
        setStatus('Sending your prompt to Google Veo…', '', 5);
        var instance = { prompt: form.prompt };
        if (form.image) instance.image = { inlineData: { mimeType: form.image.mimeType, data: form.image.data } };
        var body = {
            instances: [instance],
            parameters: { aspectRatio: form.aspect, resolution: form.resolution, durationSeconds: Number(form.duration) }
        };

        return veoFetch(CONFIG.GEMINI_BASE + '/models/' + form.engine + ':predictLongRunning', {
            method: 'POST', body: JSON.stringify(body), signal: signal
        }).then(function (op) {
            if (!op || !op.name) throw new Error('Google sent an unexpected response.');
            setStatus('Veo is filming your scene…', 'This usually takes 1–6 minutes.', 10);
            creepProgress(10, 85, 150000);

            function poll() {
                if (Date.now() - state.startTime > CONFIG.MAX_WAIT_MS) throw new Error('Veo is taking unusually long. Try again later.');
                return sleep(CONFIG.VEO_POLL_MS, signal)
                    .then(function () { return veoFetch(CONFIG.GEMINI_BASE + '/' + op.name, { signal: signal }); })
                    .then(function (o) { return o.done ? o : poll(); });
            }
            return poll();
        }).then(function (operation) {
            if (operation.error) throw new Error('Veo couldn\'t make the video: ' + (operation.error.message || 'unknown error'));
            var resp = operation.response && operation.response.generateVideoResponse;
            var sample = resp && resp.generatedSamples && resp.generatedSamples[0];
            var uri = sample && sample.video && sample.video.uri;
            if (!uri) {
                var reasons = resp && resp.raiMediaFilteredReasons;
                if (reasons && reasons.length) throw new Error('Google\'s safety filter blocked this video: ' + reasons.join(' ') + ' Try rewording the prompt.');
                throw new Error('Veo finished but sent no video. Try rewording the prompt.');
            }
            stopProgress();
            setStatus('Downloading your video…', '', 92);
            var keyed = uri + (uri.indexOf('?') >= 0 ? '&' : '?') + 'key=' + encodeURIComponent(settings.apiKey);
            return fetch(keyed, { signal: signal }).then(function (r) {
                if (!r.ok) throw new Error('Couldn\'t download the video (HTTP ' + r.status + ').');
                return r.blob();
            }).then(function (blob) { return { blob: blob, url: URL.createObjectURL(blob) }; });
        });
    }

    // ---------- Demo ----------
    function runDemo(form, signal) {
        setStatus('Filming a sample scene…', 'Demo mode: no engine is called.', 10);
        creepProgress(10, 95, 3000);
        return sleep(3200, signal).then(function () {
            return { blob: null, url: DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)] };
        });
    }

    // ==================== VIEWFINDER ====================
    function setView(name) {
        el.viewfinder.setAttribute('data-state', name);
        el.recLabel.textContent = name === 'working' ? 'REC' : 'STBY';
        if (name !== 'done') {
            try { el.video.pause(); } catch (e) { /* ignore */ }
        }
    }

    function startWorking() {
        setView('working');
        el.outputBar.hidden = true;
        setProgress(0);
        state.startTime = Date.now();
        var tick = function () {
            var s = Math.floor((Date.now() - state.startTime) / 1000);
            el.recTime.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60);
        };
        tick();
        state.clockTimer = setInterval(tick, 1000);
    }

    function setStatus(title, detail, percent) {
        el.statusText.textContent = title;
        el.statusDetail.textContent = detail || '';
        if (percent != null) setProgress(percent);
    }

    function setProgress(p) {
        var v = Math.max(0, Math.min(100, p));
        el.progressFill.style.width = v + '%';
        el.progress.setAttribute('aria-valuenow', String(Math.round(v)));
    }

    function creepProgress(from, to, ms) {
        stopProgress();
        var t0 = Date.now();
        state.progressTimer = setInterval(function () {
            var t = Math.min(1, (Date.now() - t0) / ms);
            setProgress(from + (to - from) * (1 - Math.pow(1 - t, 2)));
        }, 250);
    }

    function stopProgress() { clearInterval(state.progressTimer); state.progressTimer = null; }
    function stopTimers() { stopProgress(); clearInterval(state.clockTimer); state.clockTimer = null; }

    function showError(message, offerToken) {
        el.errorText.textContent = message;
        el.tokenBtn.hidden = !offerToken;
        setView('error');
        el.retryBtn.focus({ preventScroll: true });
    }

    function showResult(form, result) {
        setProgress(100);
        var engineName = settings.demo ? 'Demo' : (ENGINES[form.engine] || ENGINES.free).name;
        var meta = form.aspect + ', ' + form.duration + 's, ' + form.styleLabel.toLowerCase() + ', ' + engineName;
        state.history.unshift({ url: result.url, blob: result.blob, prompt: form.userPrompt, meta: meta, aspect: form.aspect });
        if (state.history.length > 12) {
            var old = state.history.pop();
            if (old.url.indexOf('blob:') === 0) URL.revokeObjectURL(old.url);
        }
        showHistoryItem(0, true);
        renderHistory();
    }

    function showHistoryItem(index, autoplay) {
        var item = state.history[index];
        if (!item) return;
        state.current = index;
        el.viewfinder.setAttribute('data-aspect', item.aspect);
        el.video.src = item.url;
        setView('done');
        el.outputCaption.innerHTML = '';
        var strong = document.createElement('strong');
        strong.textContent = truncate(item.prompt, 90);
        el.outputCaption.appendChild(strong);
        el.outputCaption.appendChild(document.createTextNode(' ' + item.meta));
        el.outputBar.hidden = false;
        if (autoplay) {
            var p = el.video.play();
            if (p && p.catch) p.catch(function () { /* autoplay blocked */ });
        }
        renderHistory();
    }

    function renderHistory() {
        el.historyWrap.hidden = state.history.length < 2;
        el.history.innerHTML = '';
        state.history.forEach(function (item, i) {
            var li = document.createElement('li');
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'history-item' + (i === state.current ? ' is-current' : '');
            b.setAttribute('aria-label', 'Show video: ' + item.prompt);
            var v = document.createElement('video');
            v.src = item.url + (item.url.indexOf('blob:') === 0 ? '' : '#t=0.5');
            v.muted = true;
            v.preload = 'metadata';
            v.setAttribute('playsinline', '');
            var cap = document.createElement('span');
            cap.textContent = item.prompt;
            b.appendChild(v);
            b.appendChild(cap);
            b.addEventListener('click', function () { showHistoryItem(i, true); });
            li.appendChild(b);
            el.history.appendChild(li);
        });
    }

    // ==================== PHOTO ====================
    function onImageSelected(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast('Choose a PNG, JPEG or WebP photo.', 'error'); return; }
        if (file.size > 15 * 1024 * 1024) { toast('That photo is over 15 MB. Choose a smaller one.', 'error'); return; }
        var reader = new FileReader();
        reader.onload = function () {
            var dataUrl = String(reader.result);
            state.startImage = { mimeType: file.type, data: dataUrl.split(',')[1], dataUrl: dataUrl };
            el.attachImg.src = dataUrl;
            el.attachPreview.hidden = false;
            el.attachText.textContent = file.name;
        };
        reader.readAsDataURL(file);
    }

    function clearImage() {
        state.startImage = null;
        el.startImage.value = '';
        el.attachPreview.hidden = true;
        el.attachText.textContent = 'Start from a photo (optional)';
    }

    // ==================== DOWNLOAD / SHARE ====================
    function download() {
        var item = state.history[state.current];
        if (!item) return;
        var a = document.createElement('a');
        a.href = item.url;
        a.download = 'stark-video-' + Date.now() + '.mp4';
        if (!item.blob) { a.target = '_blank'; a.rel = 'noopener'; }
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function share() {
        var item = state.history[state.current];
        if (!item) return;
        if (item.blob && navigator.canShare) {
            var file = new File([item.blob], 'stark-video.mp4', { type: 'video/mp4' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'AI video made with Stark' }).catch(function () { /* dismissed */ });
                return;
            }
        }
        if (/^https?:/.test(item.url) && navigator.clipboard) {
            navigator.clipboard.writeText(item.url).then(function () { toast('Link copied.', 'success'); });
            return;
        }
        toast('This browser can\'t share video files. Download it, then share the file.', 'info');
    }

    // ==================== SETTINGS ====================
    function store(fn) { try { return fn(); } catch (e) { return null; } }

    function loadSettings() {
        store(function () {
            var engine = localStorage.getItem('stark_engine');
            if (engine && ENGINES[engine]) settings.engine = engine;
            settings.hfToken = localStorage.getItem('stark_hf_token') || '';
            settings.apiKey = localStorage.getItem('stark_gemini_api_key') || '';
            settings.demo = localStorage.getItem('stark_demo_mode') === 'true';
        });
    }

    function persist() {
        store(function () {
            localStorage.setItem('stark_engine', settings.engine);
            localStorage.setItem('stark_demo_mode', String(settings.demo));
            settings.hfToken ? localStorage.setItem('stark_hf_token', settings.hfToken) : localStorage.removeItem('stark_hf_token');
            settings.apiKey ? localStorage.setItem('stark_gemini_api_key', settings.apiKey) : localStorage.removeItem('stark_gemini_api_key');
        });
    }

    function openSettings() {
        state.lastFocus = document.activeElement;
        var radio = el.settings.querySelector('input[name="engine"][value="' + settings.engine + '"]');
        if (radio) radio.checked = true;
        el.hfToken.value = settings.hfToken;
        el.apiKey.value = settings.apiKey;
        el.demoMode.checked = settings.demo;
        updateSettingsFields();
        el.settings.hidden = false;
        document.body.classList.add('modal-open');
        var checked = el.settings.querySelector('input[name="engine"]:checked');
        if (checked) checked.focus();
    }

    function closeSettings() {
        el.settings.hidden = true;
        document.body.classList.remove('modal-open');
        if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
    }

    function updateSettingsFields() {
        var r = el.settings.querySelector('input[name="engine"]:checked');
        var veo = r && r.value !== 'free';
        el.veoFields.hidden = !veo;
        el.hfFields.hidden = !!veo;
    }

    function saveSettings() {
        var r = el.settings.querySelector('input[name="engine"]:checked');
        settings.engine = r ? r.value : 'free';
        settings.hfToken = el.hfToken.value.trim();
        settings.apiKey = el.apiKey.value.trim();
        settings.demo = el.demoMode.checked;
        persist();
        applyEngineUI();
        closeSettings();
        if (isVeo() && !settings.apiKey && !settings.demo) {
            toast('Saved. Google Veo still needs a Gemini API key before it can make videos.', 'info');
        } else {
            toast('Settings saved.', 'success');
        }
    }

    function trapFocus(e) {
        var nodes = Array.prototype.filter.call(
            el.settings.querySelectorAll('button, input, a[href], select, textarea'),
            function (n) { return !n.disabled && n.offsetParent !== null; }
        );
        if (!nodes.length) return;
        var first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    // ==================== HELPERS ====================
    function toast(message, type) {
        var t = document.createElement('div');
        t.className = 'toast ' + (type || 'info');
        t.setAttribute('role', type === 'error' ? 'alert' : 'status');
        var p = document.createElement('p');
        p.textContent = message;
        var x = document.createElement('button');
        x.type = 'button';
        x.setAttribute('aria-label', 'Dismiss');
        x.innerHTML = '&times;';
        x.addEventListener('click', function () { t.remove(); });
        t.appendChild(p);
        t.appendChild(x);
        while (el.toasts.children.length >= 2) el.toasts.firstChild.remove();
        el.toasts.appendChild(t);
        setTimeout(function () { t.remove(); }, type === 'error' ? 8000 : 4500);
    }

    function sleep(ms, signal) {
        return new Promise(function (resolve, reject) {
            if (signal && signal.aborted) return reject(abortError());
            var t = setTimeout(resolve, ms);
            if (signal) signal.addEventListener('abort', function () { clearTimeout(t); reject(abortError()); }, { once: true });
        });
    }

    function abortError() {
        try { return new DOMException('Aborted', 'AbortError'); }
        catch (e) { var err = new Error('Aborted'); err.name = 'AbortError'; return err; }
    }

    function dataUrlToBlob(dataUrl) {
        var parts = dataUrl.split(',');
        var mime = parts[0].match(/:(.*?);/)[1];
        var bin = atob(parts[1]);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime });
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) document.title = 'Stark Video AI - Free text-to-video';
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
