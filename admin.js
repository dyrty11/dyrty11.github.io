(function() {
    const REPO_OWNER = 'dyrty11';
    const REPO_NAME = 'dyrty_11.github.io';
    const FILE_PATH = 'projects.json';
    const SITE_URL = `https://${REPO_OWNER}.github.io/${REPO_NAME}/projects.html`;

    const LIMITS = {
        MAX_COUNT: 200, title: 120, description: 2000, link: 500, buttonText: 40, tag: 40, tagsCount: 20, importFileSize: 5 * 1024 * 1024, maxIconSize: 300 * 1024
    };
    const SAFE_ICON_REGEX = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/;

    const ICON_SVGS = {
        'layout': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"><path d="M3 4h18v13l-3 3H3z"/><path d="M3 9h18"/><path d="M9 9v11" stroke="var(--ic2, currentColor)"/></svg>',
        'file': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"><path d="M5 2.5h9l5 5v14H5z"/><path d="M14 2.5v5h5"/><path d="M12 18.5v-6M9.5 15l2.5-2.5 2.5 2.5" stroke="var(--ic2, currentColor)"/></svg>',
        'shopping-bag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"><path d="M5 8h14l1 13.5H4z"/><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8"/><circle cx="12" cy="14" r="1.5" fill="var(--ic2, currentColor)" stroke="none"/></svg>',
        'archive': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"><path d="M12 2.5l8.5 5v9l-8.5 5-8.5-5v-9z"/><path d="M3.5 7.5l8.5 5 8.5-5"/><path d="M12 12.5v9" stroke="var(--ic2, currentColor)"/></svg>',
        'react': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.8" fill="var(--ic2, currentColor)" stroke="none"/></svg>',
        'javascript': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M8 6.5L2.5 12 8 17.5M16 6.5l5.5 5.5-5.5 5.5"/><path d="M14 4.5l-4 15" stroke="var(--ic2, currentColor)"/></svg>',
        'python': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M3 4.5h18v15H3z"/><path d="M7 9.5l3 2.5-3 2.5" stroke="var(--ic2, currentColor)"/><path d="M12.5 15.5H17"/></svg>',
        'windows': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M3 5l8-1.2v7.7H3zM13 3.5L21 2v9.5h-8zM3 13h8v7.7L3 19.5zM13 13h8v9l-8-1.5z"/></svg>',
        'exe': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M6 6h12v12H6z"/><path d="M10 10h4v4h-4z" fill="var(--ic2, currentColor)" stroke="none"/><path d="M9.5 2.5V6M14.5 2.5V6M9.5 18v3.5M14.5 18v3.5"/></svg>',
        'security': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M12 2.5l8 3v6c0 5.2-3.4 9-8 10.5-4.6-1.5-8-5.3-8-10.5v-6z"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="var(--ic2, currentColor)"/></svg>',
        'tools': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M12 2.5l8.5 5v9l-8.5 5-8.5-5v-9z"/><path d="M12 8l3.5 2v4L12 16l-3.5-2v-4z" fill="var(--ic2, currentColor)" stroke="none"/></svg>'
    };
    const PRESET_COLORS = ['#ccff00', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const PRESET_TAGS = ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Tailwind CSS', 'SASS', 'Webpack', 'Vite', 'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'Laravel', 'ASP.NET', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Firebase', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Linux', 'Windows', 'macOS', 'CI/CD', 'Nginx', 'Git', 'GitHub', 'VS Code', 'Figma', 'Postman', 'Jira', 'Notion', 'Web', 'Mobile', 'Desktop', 'API', 'CLI', 'Bot', 'Parser', 'Automation', 'GameDev', 'AI', 'ML', 'Security', 'Tools', 'Testing', 'Design', 'UI/UX', 'Performance', 'Open Source', 'Productivity'];

    let projects = [];
    let fileSha = null;
    let hasUnsavedChanges = false;
    let searchFilter = '';
    let draggedIndex = null;
    let saving = false;
    let loading = false;

    let lastValidatedToken = null;
    let lastValidationResult = null;
    let tokenCheckTimeout = null;
    let tokenCheckAbort = null;
    let failedAttempts = 0;

    const listEl = document.getElementById('projectsList');
    const tokenInput = document.getElementById('tokenInput');
    const tokenStatus = document.getElementById('tokenStatus');
    const logEl = document.getElementById('log');
    const statsEl = document.getElementById('stats');
    const unsavedBadge = document.getElementById('unsavedBadge');

    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = (function(){ try { return localStorage.getItem('admin_theme') || 'dark'; } catch(e) { return 'dark'; } })();
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme');
            const next = cur === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem('admin_theme', next); } catch (e) {}
        });
    }

    function updateTokenStatus(state, extra) {
        if (!tokenStatus) return;
        tokenStatus.className = 'status-badge';
        switch (state) {
            case 'connected': tokenStatus.textContent = '✓ Подключено' + (extra ? ' (' + extra + ')' : ''); tokenStatus.classList.add('connected'); break;
            case 'checking': tokenStatus.textContent = 'Проверка...'; tokenStatus.classList.add('checking'); break;
            case 'warning': tokenStatus.textContent = '⚠ ' + (extra || 'Ограниченные права'); tokenStatus.classList.add('warning'); break;
            case 'error': tokenStatus.textContent = '✗ ' + (extra || 'Не подключено'); tokenStatus.classList.add('error'); break;
            default: tokenStatus.textContent = 'Не подключено';
        }
    }

    async function checkToken(token) {
        if (tokenCheckAbort) { try { tokenCheckAbort.abort(); } catch (e) {} }
        tokenCheckAbort = new AbortController();
        const signal = tokenCheckAbort.signal;

        const safeReason = function(e) {
            if (!e) return 'неизвестная ошибка';
            if (e.name === 'AbortError') return 'отменено';
            return 'сетевая ошибка';
        };

        updateTokenStatus('checking');
        try {
            const userRes = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
                signal
            });
            if (userRes.status === 401) {
                failedAttempts++;
                const delay = Math.min(failedAttempts * 1000, 5000);
                lastValidatedToken = token;
                lastValidationResult = { ok: false, reason: 'Недействителен' };
                updateTokenStatus('error', 'Недействителен (ожидание ' + (delay/1000) + 'с)');
                log('Токен недействителен (401). Ожидание ' + (delay/1000) + 'с...', 'error');
                await new Promise(r => setTimeout(r, delay));
                failedAttempts = 0;
                return;
            }
            if (!userRes.ok) {
                lastValidatedToken = token;
                lastValidationResult = { ok: false, reason: `Ошибка ${userRes.status}` };
                updateTokenStatus('error', 'Ошибка ' + userRes.status);
                return;
            }
            const user = await userRes.json();
            const login = user && user.login ? String(user.login) : '';
            failedAttempts = 0;

            const repoRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
                signal
            });
            if (repoRes.status === 404) {
                lastValidatedToken = token; lastValidationResult = { ok: false, reason: 'Нет доступа к репо' };
                updateTokenStatus('error', 'Нет доступа к репо'); log(`Токен действителен, но нет доступа к ${REPO_OWNER}/${REPO_NAME}.`, 'error');
                return;
            }
            if (!repoRes.ok) {
                lastValidatedToken = token; lastValidationResult = { ok: false, reason: `Ошибка ${repoRes.status}` };
                updateTokenStatus('error', 'Ошибка ' + repoRes.status);
                return;
            }
            const repo = await repoRes.json();
            const perms = (repo && repo.permissions) || {};
            if (!perms.push) {
                lastValidatedToken = token; lastValidationResult = { ok: true, user: login, warning: 'read-only' };
                updateTokenStatus('warning', 'Read only'); log('Токен действителен, но права на запись не подтверждены.', 'error');
                return;
            }
            lastValidatedToken = token; lastValidationResult = { ok: true, user: login };
            updateTokenStatus('connected', login); log('Токен действителен. Доступ подтверждён.', 'success');
        } catch (e) {
            if (e && e.name === 'AbortError') return;
            lastValidatedToken = token; lastValidationResult = { ok: false, reason: safeReason(e) };
            updateTokenStatus('error', 'Сеть'); log('Не удалось проверить токен: ' + safeReason(e), 'error');
        } finally {
            tokenCheckAbort = null;
        }
    }

    function scheduleTokenCheck() {
        if (tokenCheckTimeout) clearTimeout(tokenCheckTimeout);
        const token = tokenInput.value.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
        if (!token) {
            if (tokenCheckAbort) { try { tokenCheckAbort.abort(); } catch (e) {} }
            lastValidatedToken = null; lastValidationResult = null; updateTokenStatus('empty'); return;
        }
        if (token === lastValidatedToken && lastValidationResult) {
            if (lastValidationResult.ok && !lastValidationResult.warning) updateTokenStatus('connected', lastValidationResult.user);
            else if (lastValidationResult.ok && lastValidationResult.warning) updateTokenStatus('warning', 'Read only');
            else updateTokenStatus('error', lastValidationResult.reason || 'Недействителен');
            return;
        }
        updateTokenStatus('checking');
        tokenCheckTimeout = setTimeout(() => checkToken(token), 700);
    }

    async function ensureTokenValid(token) {
        if (tokenCheckTimeout) { clearTimeout(tokenCheckTimeout); tokenCheckTimeout = null; }
        if (lastValidatedToken === token && lastValidationResult) return lastValidationResult;
        await checkToken(token);
        return lastValidationResult || { ok: false, reason: 'неизвестно' };
    }

    tokenInput.addEventListener('input', () => { scheduleTokenCheck(); });
    const forgetBtn = document.getElementById('forgetTokenBtn');
    if (forgetBtn) {
        forgetBtn.addEventListener('click', () => {
            if (!confirm('Забыть токен? Придётся вводить заново.')) return;
            tokenInput.value = ''; lastValidatedToken = null; lastValidationResult = null;
            if (tokenCheckAbort) { try { tokenCheckAbort.abort(); } catch (e) {} }
            updateTokenStatus('empty'); toast('Токен удалён');
        });
    }

    function log(msg, type = '') { logEl.textContent = msg; logEl.className = 'log ' + type; }
    function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }

    function markUnsaved() { if (!hasUnsavedChanges) { hasUnsavedChanges = true; unsavedBadge.classList.remove('hidden'); } }
    function markSaved() { hasUnsavedChanges = false; unsavedBadge.classList.add('hidden'); }
    window.addEventListener('beforeunload', (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } });

    function updateStats() {
        const total = projects.length;
        const websites = projects.filter(p => p.category === 'website').length;
        const files = projects.filter(p => p.category === 'file').length;
        statsEl.innerHTML = `<span>Всего: <strong>${total}</strong></span><span>Сайтов: <strong>${websites}</strong></span><span>Файлов: <strong>${files}</strong></span>`;
    }

    function b64encode(str) { const bytes = new TextEncoder().encode(str); let binary = ''; for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]); return btoa(binary); }
    function b64decode(b64) { const binary = atob(b64.replace(/\s/g, '')); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return new TextDecoder().decode(bytes); }

    async function fetchFile() {
        if (loading) return;
        if (hasUnsavedChanges && !confirm('Есть несохранённые изменения. Загрузить с GitHub и потерять их?')) return;
        const token = tokenInput.value.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
        if (!token) { toast('Введите токен'); return; }
        loading = true;
        const loadBtnEl = document.getElementById('loadBtn');
        if (loadBtnEl) loadBtnEl.disabled = true;
        const validation = await ensureTokenValid(token);
        if (!validation || !validation.ok) {
            log('Токен не прошёл проверку: ' + (validation && validation.reason ? validation.reason : 'неизвестно'), 'error');
            toast('Токен недействителен'); loading = false; if (loadBtnEl) loadBtnEl.disabled = false; return;
        }
        log('Загрузка projects.json...');
        try {
            const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
            });
            if (!res.ok) {
                let serverMsg = ''; try { const j = await res.json(); serverMsg = j.message || ''; } catch (e) {}
                if (res.status === 401) throw new Error(`HTTP 401: токен недействителен. Создайте новый.`);
                if (res.status === 403) throw new Error(`HTTP 403: доступ запрещён. ${serverMsg}`);
                if (res.status === 404) throw new Error(`HTTP 404: файл ${FILE_PATH} не найден. ${serverMsg}`);
                throw new Error(`HTTP ${res.status}${serverMsg ? ': ' + serverMsg : ''}`);
            }
            const data = await res.json();
            fileSha = data.sha;
            const parsed = JSON.parse(b64decode(data.content || ''));
            if (!Array.isArray(parsed)) throw new Error('projects.json должен быть массивом');
            
            const oldProjects = projects; projects = parsed;
            const errors = validate();
            if (errors.length > 0) { projects = oldProjects; throw new Error('Ошибки в файле: ' + errors.join('; ')); }
            markSaved(); render(); log('Файл загружен. Проектов: ' + projects.length, 'success'); toast('Файл загружен!');
        } catch (e) {
            log('Ошибка загрузки: ' + e.message, 'error');
        } finally {
            loading = false; if (loadBtnEl) loadBtnEl.disabled = false;
        }
    }

    async function saveFile() {
        if (saving) return; saving = true;
        const saveBtn = document.getElementById('saveBtn'); if (saveBtn) saveBtn.disabled = true;
        try {
            const token = tokenInput.value.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
            if (!token) { toast('Введите токен'); return; }
            if (!fileSha) { toast('Сначала загрузите файл с GitHub'); return; }
            const validation = await ensureTokenValid(token);
            if (!validation || !validation.ok) { log('Токен не прошёл проверку.', 'error'); toast('Токен недействителен'); return; }
            const errors = validate();
            if (errors.length > 0) { toast('Исправьте ошибки: ' + errors[0]); log('Валидация не пройдена: ' + errors.join('; '), 'error'); return; }

            log('Сохранение на GitHub...');
            const content = b64encode(JSON.stringify(projects, null, 2));
            const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
                body: JSON.stringify({ message: 'Update projects.json via admin v2', content, sha: fileSha })
            });
            if (!res.ok) {
                let serverMsg = ''; try { const j = await res.json(); serverMsg = j.message || ''; } catch (e) {}
                if (res.status === 401) throw new Error(`HTTP 401: токен недействителен.`);
                if (res.status === 403) throw new Error(`HTTP 403: не хватает прав. ${serverMsg}`);
                if (res.status === 409) throw new Error(`HTTP 409: конфликт версий. ${serverMsg}`);
                if (res.status === 422) throw new Error(`HTTP 422: неверные данные. ${serverMsg}`);
                throw new Error(`HTTP ${res.status}${serverMsg ? ': ' + serverMsg : ''}`);
            }
            const data = await res.json();
            fileSha = data.content.sha;
            markSaved(); log('Сохранено!', 'success'); toast('Сохранено на GitHub!');
        } catch (e) { log('Ошибка сохранения: ' + e.message, 'error'); } finally { saving = false; if (saveBtn) saveBtn.disabled = false; }
    }

    function validate() {
        const errors = [];
        if (projects.length > LIMITS.MAX_COUNT) errors.push(`слишком много проектов`);
        projects.forEach((p, i) => {
            const n = i + 1;
            const title = p.title == null ? '' : String(p.title);
            const link = p.link == null ? '' : String(p.link);
            const desc = p.description == null ? '' : String(p.description);
            const btnText = p.buttonText == null ? '' : String(p.buttonText);

            if (!title.trim()) errors.push(`#${n}: пустое название`); else if (title.length > LIMITS.title) errors.push(`#${n}: название > ${LIMITS.title}`);
            if (!link.trim()) { errors.push(`#${n}: пустая ссылка`); } else if (link.length > LIMITS.link) { errors.push(`#${n}: ссылка > ${LIMITS.link}`); } else {
                try { const u = new URL(link, window.location.href); if (!['http:', 'https:'].includes(u.protocol)) errors.push(`#${n}: недопустимая схема URL`); } catch (e) { errors.push(`#${n}: некорректный URL`); }
            }
            if (desc.length > LIMITS.description) errors.push(`#${n}: описание > ${LIMITS.description}`);
            if (btnText.length > LIMITS.buttonText) errors.push(`#${n}: текст кнопки > ${LIMITS.buttonText}`);
            if (p.category && !['website', 'file'].includes(p.category)) errors.push(`#${n}: неверная категория`);
            if (p.type && !['link', 'download'].includes(p.type)) errors.push(`#${n}: неверный тип ссылки`);
            if (p.color && !/^#[0-9a-fA-F]{6}$/.test(String(p.color))) errors.push(`#${n}: цвет должен быть #RRGGBB`);
            if (p.icon && !Object.prototype.hasOwnProperty.call(ICON_SVGS, p.icon)) errors.push(`#${n}: неверная иконка`);
            if (p.customIcon) {
                const iconStr = String(p.customIcon);
                if (iconStr.length > LIMITS.maxIconSize) errors.push(`#${n}: иконка слишком большая`);
                else if (!SAFE_ICON_REGEX.test(iconStr)) errors.push(`#${n}: неверный формат кастомной иконки`);
            }
            if (Array.isArray(p.tags)) {
                if (p.tags.length > LIMITS.tagsCount) errors.push(`#${n}: тегов > ${LIMITS.tagsCount}`);
                p.tags.forEach(t => { if (String(t).length > LIMITS.tag) errors.push(`#${n}: тег слишком длинный`); });
            }
        });
        return errors;
    }

    function getAllTags() {
        const set = new Set(PRESET_TAGS);
        projects.forEach(p => { if (Array.isArray(p.tags)) p.tags.forEach(t => { const s = String(t || '').trim(); if (s) set.add(s); }); });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
    }
    function getIcon(key) { return Object.prototype.hasOwnProperty.call(ICON_SVGS, key) ? ICON_SVGS[key] : ICON_SVGS['layout']; }

    function render() {
        listEl.innerHTML = '';
        let visibleCount = 0;
        const allTags = getAllTags();

        projects.forEach((proj, index) => {
            if (searchFilter) { const haystack = `${proj.title || ''} ${proj.description || ''} ${(proj.tags || []).join(' ')}`.toLowerCase(); if (!haystack.includes(searchFilter)) return; }
            visibleCount++;
            const item = document.createElement('div');
            item.className = 'project-item animated-dashed'; item.draggable = true; item.dataset.index = index;
            const iconSVG = getIcon(proj.icon);
            const currentTags = Array.isArray(proj.tags) ? proj.tags : [];
            let displayIcon = iconSVG;
            if (proj.customIcon && SAFE_ICON_REGEX.test(proj.customIcon)) displayIcon = `<img src="${escapeHtml(proj.customIcon)}" alt="">`;

            const tagSuggestions = allTags.map(t => { const used = currentTags.includes(t); return `<button type="button" class="tag-suggestion${used ? ' used' : ''}" data-tag="${escapeHtml(t)}" data-index="${index}">${escapeHtml(t)}</button>`; }).join('');
            
            const colorSwatches = PRESET_COLORS.map(c => `<div class="color-swatch ${c === proj.color ? 'active' : ''}" data-color="${c}" data-index="${index}" title="${c}"></div>`).join('');

            item.innerHTML = `
                <div class="project-header">
                    <div class="flex-row"><span class="drag-handle">☰</span><span class="project-number">#${index + 1}</span></div>
                    <div class="project-actions"><button class="icon-btn" data-action="duplicate" data-index="${index}" title="Дублировать">⧉</button><button class="icon-btn danger" data-action="delete" data-index="${index}" title="Удалить">✕</button></div>
                </div>
                <div class="form-group"><label>Название</label><input type="text" class="field-title" maxlength="${LIMITS.title}" value="${escapeHtml(proj.title || '')}" data-index="${index}"></div>
                <div class="grid-2">
                    <div class="form-group"><label>Категория</label><select class="field-category" data-index="${index}"><option value="website" ${proj.category === 'website' ? 'selected' : ''}>Веб-сайт</option><option value="file" ${proj.category === 'file' ? 'selected' : ''}>Файл</option></select></div>
                    <div class="form-group"><label>Тип ссылки</label><select class="field-type" data-index="${index}"><option value="link" ${proj.type === 'link' ? 'selected' : ''}>Ссылка (открыть)</option><option value="download" ${proj.type === 'download' ? 'selected' : ''}>Скачать</option></select></div>
                </div>
                <div class="form-group"><label>Описание</label><textarea class="field-desc" rows="2" maxlength="${LIMITS.description}" data-index="${index}">${escapeHtml(proj.description || '')}</textarea></div>
                <div class="grid-2">
                    <div class="form-group"><label>Ссылка (URL или путь)</label><input type="text" class="field-link" maxlength="${LIMITS.link}" value="${escapeHtml(proj.link || '')}" data-index="${index}"></div>
                    <div class="form-group"><label>Текст кнопки</label><input type="text" class="field-btnText" maxlength="${LIMITS.buttonText}" value="${escapeHtml(proj.buttonText || 'Открыть')}" data-index="${index}"></div>
                </div>
                <div class="grid-3">
                    <div class="form-group"><label>Теги</label><input type="text" class="field-tags" value="${escapeHtml(currentTags.join(', '))}" data-index="${index}"><div class="tag-suggestions">${tagSuggestions}</div></div>
                    <div class="form-group">
                        <label>Иконка</label>
                        <div class="icon-row"><div class="icon-preview" data-preview="${index}">${displayIcon}</div>
                        <select class="field-icon" data-index="${index}"><option value="layout" ${proj.icon === 'layout' ? 'selected' : ''}>Макет</option><option value="file" ${proj.icon === 'file' ? 'selected' : ''}>Файл</option><option value="shopping-bag" ${proj.icon === 'shopping-bag' ? 'selected' : ''}>Магазин</option><option value="archive" ${proj.icon === 'archive' ? 'selected' : ''}>Архив</option><option value="react" ${proj.icon === 'react' ? 'selected' : ''}>React</option><option value="javascript" ${proj.icon === 'javascript' ? 'selected' : ''}>JavaScript</option><option value="python" ${proj.icon === 'python' ? 'selected' : ''}>Python</option><option value="windows" ${proj.icon === 'windows' ? 'selected' : ''}>Windows</option><option value="exe" ${proj.icon === 'exe' ? 'selected' : ''}>EXE</option><option value="security" ${proj.icon === 'security' ? 'selected' : ''}>Безопасность</option><option value="tools" ${proj.icon === 'tools' ? 'selected' : ''}>Инструменты</option></select></div>
                        <div class="custom-icon-upload"><input type="file" class="field-customIconFile hidden" accept="image/*" data-index="${index}" id="customIconFile_${index}"><label for="customIconFile_${index}">📁 Загрузить иконку</label>${proj.customIcon ? `<button class="icon-btn danger" data-action="removeCustomIcon" data-index="${index}" title="Сбросить">✕</button>` : ''}</div>
                    </div>
                    <div class="form-group"><label>Цвет</label><div class="color-row">${colorSwatches}<input type="text" class="field-color color-input" value="${escapeHtml(proj.color || '#ccff00')}" data-index="${index}" maxlength="7" pattern="^#[0-9a-fA-F]{6}$"></div></div>
                </div>
            `;
            listEl.appendChild(item);
        });

        if (visibleCount === 0 && projects.length > 0) listEl.innerHTML = '<p class="empty-msg">Ничего не найдено</p>';
        else if (projects.length === 0) listEl.innerHTML = '<p class="empty-msg">Список пуст.</p>';
        updateStats(); bindEvents();
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"'`/]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','/':'&#47;'}[c]));
    }

    function bindEvents() {
        const fields = [{ cls: 'field-title', key: 'title' },{ cls: 'field-category', key: 'category' },{ cls: 'field-type', key: 'type' },{ cls: 'field-desc', key: 'description' },{ cls: 'field-link', key: 'link' },{ cls: 'field-btnText', key: 'buttonText' },{ cls: 'field-icon', key: 'icon' },{ cls: 'field-color', key: 'color' }];
        fields.forEach(f => {
            listEl.querySelectorAll('.' + f.cls).forEach(el => {
                el.addEventListener('input', (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    if (!isNaN(idx) && projects[idx]) {
                        projects[idx][f.key] = e.target.value; markUnsaved();
                        if (f.key === 'icon') { delete projects[idx].customIcon; render(); }
                    }
                });
            });
        });

        listEl.querySelectorAll('.field-customIconFile').forEach(input => {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0]; if (!file) return;
                if (file.size > LIMITS.maxIconSize) { alert(`Файл слишком большой (макс. ${Math.round(LIMITS.maxIconSize / 1024)} КБ)`); e.target.value = ''; return; }
                const reader = new FileReader();
                reader.onload = (ev) => { const idx = parseInt(e.target.dataset.index); if (!isNaN(idx) && projects[idx]) { projects[idx].customIcon = ev.target.result; markUnsaved(); render(); } };
                reader.readAsDataURL(file);
            });
        });

        listEl.querySelectorAll('.field-tags').forEach(el => {
            el.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                if (!isNaN(idx) && projects[idx]) {
                    projects[idx].tags = e.target.value.split(',').map(s => s.trim()).filter(s => s).slice(0, LIMITS.tagsCount); markUnsaved();
                    const currentTags = projects[idx].tags;
                    listEl.querySelectorAll(`.tag-suggestion[data-index="${idx}"]`).forEach(s => { if (currentTags.includes(s.dataset.tag)) s.classList.add('used'); else s.classList.remove('used'); });
                }
            });
        });

        listEl.querySelectorAll('.tag-suggestion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); const tag = btn.dataset.tag; const idx = parseInt(btn.dataset.index);
                if (!isNaN(idx) && projects[idx]) {
                    if (!Array.isArray(projects[idx].tags)) projects[idx].tags = [];
                    if (!projects[idx].tags.includes(tag)) {
                        if (projects[idx].tags.length >= LIMITS.tagsCount) { toast(`Максимум ${LIMITS.tagsCount} тегов`); return; }
                        projects[idx].tags.push(tag);
                        const input = listEl.querySelector(`.field-tags[data-index="${idx}"]`); if (input) input.value = projects[idx].tags.join(', ');
                        btn.classList.add('used'); markUnsaved();
                    }
                }
            });
        });

        listEl.querySelectorAll('.color-swatch').forEach(sw => {
            sw.addEventListener('click', (e) => {
                const color = e.target.dataset.color; const idx = parseInt(e.target.dataset.index);
                if (!isNaN(idx) && projects[idx]) { projects[idx].color = color; markUnsaved(); render(); }
            });
        });

        listEl.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index); const action = e.currentTarget.dataset.action;
                if (action === 'removeCustomIcon') { delete projects[idx].customIcon; markUnsaved(); render(); return; }
                if (action === 'delete') { if (confirm(`Удалить проект "${projects[idx]?.title || ''}"?`)) { projects.splice(idx, 1); markUnsaved(); render(); } }
                else if (action === 'duplicate') {
                    if (projects.length >= LIMITS.MAX_COUNT) { toast(`Максимум ${LIMITS.MAX_COUNT} проектов`); return; }
                    const copy = JSON.parse(JSON.stringify(projects[idx])); copy.title = (copy.title || 'Проект') + ' (копия)';
                    projects.splice(idx + 1, 0, copy); markUnsaved(); render(); toast('Проект скопирован');
                }
            });
        });

        listEl.querySelectorAll('.project-item').forEach(item => {
            item.addEventListener('dragstart', (e) => { draggedIndex = parseInt(item.dataset.index); item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
            item.addEventListener('dragend', () => { item.classList.remove('dragging'); listEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); draggedIndex = null; });
            item.addEventListener('dragover', (e) => { e.preventDefault(); if (draggedIndex !== null && parseInt(item.dataset.index) !== draggedIndex) item.classList.add('drag-over'); });
            item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
            item.addEventListener('drop', (e) => {
                e.preventDefault(); item.classList.remove('drag-over'); const targetIdx = parseInt(item.dataset.index);
                if (draggedIndex !== null && draggedIndex !== targetIdx) {
                    const [moved] = projects.splice(draggedIndex, 1); projects.splice(targetIdx, 0, moved); markUnsaved(); render();
                }
            });
        });
    }

    document.getElementById('addBtn').addEventListener('click', () => {
        if (projects.length >= LIMITS.MAX_COUNT) { toast(`Максимум ${LIMITS.MAX_COUNT}`); return; }
        projects.push({ title: 'Новый проект', category: 'website', description: 'Описание', tags: ['JavaScript'], type: 'link', link: 'https://example.com', buttonText: 'Открыть', icon: 'layout', color: '#ccff00' });
        markUnsaved(); render();
    });

    document.getElementById('loadBtn').addEventListener('click', fetchFile);
    document.getElementById('saveBtn').addEventListener('click', saveFile);

    document.getElementById('exportBtn').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = 'projects-backup-' + new Date().toISOString().slice(0,10) + '.json'; a.click(); URL.revokeObjectURL(url); toast('Backup сохранён');
    });

    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());

    document.getElementById('importFile').addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (file.size > LIMITS.importFileSize) { alert(`Файл больше ${Math.round(LIMITS.importFileSize / 1024 / 1024)} МБ`); e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) throw new Error('Это не массив JSON');
                if (data.length > LIMITS.MAX_COUNT) throw new Error(`Слишком много проектов`);
                const oldProjects = projects; projects = data;
                const errors = validate();
                if (errors.length > 0) { projects = oldProjects; throw new Error('Ошибки валидации: ' + errors[0]); }
                if (confirm(`Импортировать ${data.length} проектов?`)) { markUnsaved(); render(); toast('Импорт завершён'); } else { projects = oldProjects; }
            } catch (err) { alert('Ошибка импорта: ' + err.message); }
        };
        reader.readAsText(file); e.target.value = '';
    });

    document.getElementById('viewSiteBtn').addEventListener('click', () => window.open(SITE_URL, '_blank', 'noopener'));
    document.getElementById('searchAdmin').addEventListener('input', (e) => { searchFilter = e.target.value.toLowerCase().trim(); render(); });
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); } });
})();