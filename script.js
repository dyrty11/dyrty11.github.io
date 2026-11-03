// Безопасный доступ к localStorage (бывает заблокирован настройками браузера)
function lsGet(k) { try { return localStorage.getItem(k); } catch (err) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (err) { /* ignore */ } }

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Переключение темы ---
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    if (themeToggle) {
        themeToggle.addEventListener('click', (event) => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            const persistTheme = () => { try { localStorage.setItem('theme', newTheme); } catch (e) {} };
            if (!document.startViewTransition) { htmlElement.setAttribute('data-theme', newTheme); persistTheme(); return; }
            const x = event.clientX; const y = event.clientY;
            const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
            const transition = document.startViewTransition(() => { htmlElement.setAttribute('data-theme', newTheme); });
            transition.ready.then(() => {
                document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] }, { duration: 600, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' });
            });
            transition.finished.then(persistTheme);
        });
    }

    // --- 2. Плавный переход между страницами ---
    document.querySelectorAll('a[href$=".html"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href.startsWith('#') || this.target === '_blank' || href === 'voidforge.html' || href === 'json-formatter.html') return;
            e.preventDefault(); document.body.classList.add('page-exit'); setTimeout(() => { window.location.href = href; }, 200);
        });
    });

    // --- 3. Глобальная анимация появления карточек ---
    let projectCardObserver = null;
    if (window.IntersectionObserver) {
        projectCardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); projectCardObserver.unobserve(entry.target); } });
        }, { threshold: 0.1 });
    }

    function observeProjectCards() {
        document.querySelectorAll('.project-card:not(.visible)').forEach((card, i) => {
            card.classList.add('reveal-init'); card.style.transitionDelay = `${(i % 6) * 0.08}s`;
            if (projectCardObserver) projectCardObserver.observe(card); else card.classList.add('visible');
        });
        setTimeout(() => { document.querySelectorAll('.project-card.reveal-init:not(.visible)').forEach(card => card.classList.add('visible')); }, 1500);
    }
    setTimeout(observeProjectCards, 100);

    // --- 4. Логика динамических проектов ---
    const projectsGrid = document.getElementById('projectsGrid');
    if (projectsGrid) {
        const icons = {
            'layout': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"><path d="M3 4h18v13l-3 3H3z"/><path d="M3 9h18"/><path d="M9 9v11" stroke="var(--ic2, currentColor)"/></svg>',
            'file': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"><path d="M5 2.5h9l5 5v14H5z"/><path d="M14 2.5v5h5"/><path d="M12 18.5v-6M9.5 15l2.5-2.5 2.5 2.5" stroke="var(--ic2, currentColor)"/></svg>',
            'shopping-bag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"><path d="M5 8h14l1 13.5H4z"/><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8"/><circle cx="12" cy="14" r="1.5" fill="var(--ic2, currentColor)" stroke="none"/></svg>',
            'archive': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"><path d="M12 2.5l8.5 5v9l-8.5 5-8.5-5v-9z"/><path d="M3.5 7.5l8.5 5 8.5-5"/><path d="M12 12.5v9" stroke="var(--ic2, currentColor)"/></svg>'
        };
        const tagIcons = {
            'react': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.8" fill="var(--ic2, currentColor)" stroke="none"/></svg>',
            'javascript': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M8 6.5L2.5 12 8 17.5M16 6.5l5.5 5.5-5.5 5.5"/><path d="M14 4.5l-4 15" stroke="var(--ic2, currentColor)"/></svg>',
            'js': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M8 6.5L2.5 12 8 17.5M16 6.5l5.5 5.5-5.5 5.5"/><path d="M14 4.5l-4 15" stroke="var(--ic2, currentColor)"/></svg>',
            'html': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M3 4h18v16H3z"/><path d="M3 9h18" stroke="var(--ic2, currentColor)"/><path d="M9.5 12.5l-2 2.5 2 2.5M14.5 12.5l2 2.5-2 2.5"/></svg>',
            'css': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M9 3H7.5L5 5.5V10l-2.5 2L5 14v4.5L7.5 21H9M15 3h1.5L19 5.5V10l2.5 2-2.5 2v4.5L16.5 21H15"/><circle cx="12" cy="12" r="1.7" fill="var(--ic2, currentColor)" stroke="none"/></svg>',
            'python': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M3 4.5h18v15H3z"/><path d="M7 9.5l3 2.5-3 2.5" stroke="var(--ic2, currentColor)"/><path d="M12.5 15.5H17"/></svg>',
            'windows': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M3 5l8-1.2v7.7H3zM13 3.5L21 2v9.5h-8zM3 13h8v7.7L3 19.5zM13 13h8v9l-8-1.5z"/></svg>',
            'exe': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M6 6h12v12H6z"/><path d="M10 10h4v4h-4z" fill="var(--ic2, currentColor)" stroke="none"/><path d="M9.5 2.5V6M14.5 2.5V6M9.5 18v3.5M14.5 18v3.5"/></svg>',
            'security': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M12 2.5l8 3v6c0 5.2-3.4 9-8 10.5-4.6-1.5-8-5.3-8-10.5v-6z"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="var(--ic2, currentColor)"/></svg>',
            'tools': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M12 2.5l8.5 5v9l-8.5 5-8.5-5v-9z"/><path d="M12 8l3.5 2v4L12 16l-3.5-2v-4z" fill="var(--ic2, currentColor)" stroke="none"/></svg>',
            'developer tools': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M12 2.5l8.5 5v9l-8.5 5-8.5-5v-9z"/><path d="M12 8l3.5 2v4L12 16l-3.5-2v-4z" fill="var(--ic2, currentColor)" stroke="none"/></svg>'
        };
        function getTagIcon(tagName) { const key = String(tagName).toLowerCase(); return Object.prototype.hasOwnProperty.call(tagIcons, key) ? tagIcons[key] : ''; }
        
        let allProjects = [];
        let currentFilters = { category: 'all', tag: 'all', search: '' };
        const fallbackProjects = [{ "title": "VoidForge", "category": "website", "description": "Генератор аудио-сайтов.", "tags": ["HTML", "JavaScript"], "type": "link", "link": "voidforge.html", "buttonText": "Открыть", "icon": "layout", "color": "#ccff00" }];
        
        function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/g, '-').replace(/^-+|-+$/g, ''); }
        function sanitizeURL(url) {
            try {
                if (url.startsWith('//')) return '#';
                const u = new URL(url, window.location.href);
                if (['http:', 'https:'].includes(u.protocol)) return u.href;
            } catch (e) {}
            return '#';
        }
        
        fetch('projects.json')
            .then(response => { if (!response.ok) throw new Error('Network error'); return response.json(); })
            .then(data => { allProjects = Array.isArray(data) ? data : []; buildTagFilters(); applyFilters(); })
            .catch(() => { allProjects = fallbackProjects; buildTagFilters(); applyFilters(); });
        
        function buildTagFilters() {
            const tagFiltersContainer = document.getElementById('tagFilters'); if (!tagFiltersContainer) return;
            tagFiltersContainer.innerHTML = '';
            const allTags = new Set(); allProjects.forEach(p => { if (Array.isArray(p.tags)) p.tags.forEach(t => allTags.add(String(t))); });
            const makeFilterBtn = (label, tagValue, isActive) => {
                const btn = document.createElement('button'); btn.className = 'tag-filter-btn' + (isActive ? ' active' : ''); btn.setAttribute('data-tag', tagValue);
                const iconSvg = tagValue !== 'all' ? getTagIcon(tagValue) : '';
                if (iconSvg) { btn.innerHTML = iconSvg; btn.appendChild(document.createTextNode(' ' + label)); } else { btn.textContent = label; }
                return btn;
            };
            tagFiltersContainer.appendChild(makeFilterBtn('Все теги', 'all', true));
            allTags.forEach(tag => tagFiltersContainer.appendChild(makeFilterBtn(tag, tag, false)));
            tagFiltersContainer.querySelectorAll('.tag-filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    tagFiltersContainer.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active'); currentFilters.tag = e.currentTarget.getAttribute('data-tag'); applyFilters();
                });
            });
        }
        
        function applyFilters() {
            const filtered = allProjects.filter(project => {
                const title = String(project.title || ''); const desc = String(project.description || '');
                const tags = Array.isArray(project.tags) ? project.tags.map(String) : [];
                const matchCategory = currentFilters.category === 'all' || project.category === currentFilters.category;
                const matchTag = currentFilters.tag === 'all' || tags.includes(currentFilters.tag);
                const searchLower = currentFilters.search.toLowerCase();
                const matchSearch = title.toLowerCase().includes(searchLower) || desc.toLowerCase().includes(searchLower);
                return matchCategory && matchTag && matchSearch;
            });
            renderProjects(filtered);
        }
        
        function renderProjects(projects) {
            projectsGrid.innerHTML = '';
            if (projects.length === 0) {
                const empty = document.createElement('p'); empty.style.cssText = 'grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;';
                empty.textContent = 'Ничего не найдено.'; projectsGrid.appendChild(empty); return;
            }
            projects.forEach(project => {
                const card = document.createElement('div'); card.className = 'project-card animated-dashed';
                const iconDiv = document.createElement('div'); iconDiv.className = 'project-icon';
                if (project.customIcon && /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(project.customIcon)) {
                    const img = document.createElement('img'); img.src = project.customIcon; img.className = 'custom-project-icon'; img.alt = ''; iconDiv.appendChild(img);
                } else {
                    const iconKey = Object.prototype.hasOwnProperty.call(icons, project.icon) ? project.icon : 'file';
                    iconDiv.innerHTML = icons[iconKey];
                }
                const titleEl = document.createElement('h3'); titleEl.textContent = String(project.title || '');
                const descEl = document.createElement('p'); descEl.textContent = String(project.description || '');
                const tagsDiv = document.createElement('div'); tagsDiv.className = 'project-tags';
                if (Array.isArray(project.tags)) {
                    project.tags.forEach(tagRaw => {
                        const tag = String(tagRaw); const tagSpan = document.createElement('span'); tagSpan.className = 'tag';
                        const iconSvg = getTagIcon(tag);
                        if (iconSvg) { tagSpan.innerHTML = iconSvg; tagSpan.appendChild(document.createTextNode(' ' + tag)); } else { tagSpan.textContent = tag; }
                        tagsDiv.appendChild(tagSpan);
                    });
                }
                const isDownload = project.type === 'download';
                const linkEl = document.createElement('a'); linkEl.className = 'action-btn'; linkEl.href = sanitizeURL(project.link);
                if (isDownload) { linkEl.setAttribute('download', ''); linkEl.setAttribute('rel', 'noopener noreferrer'); } else { linkEl.setAttribute('target', '_blank'); linkEl.setAttribute('rel', 'noopener noreferrer'); }
                linkEl.appendChild(document.createTextNode(String(project.buttonText || 'Открыть')));
                const btnIcon = isDownload ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M12 3v12"/><path d="M6.5 10.5L12 16l5.5-5.5"/><path d="M3.5 20.5h17"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M10.5 4.5h-6v15h15v-6"/><path d="M13 11l7-7"/><path d="M14.5 4H20v5.5"/></svg>';
                linkEl.insertAdjacentHTML('beforeend', btnIcon);
                const moreEl = document.createElement('a'); moreEl.className = 'details-link'; moreEl.href = 'project.html?p=' + encodeURIComponent(slugify(project.title)); moreEl.textContent = 'Подробнее →';
                card.appendChild(iconDiv); card.appendChild(titleEl); card.appendChild(descEl); card.appendChild(tagsDiv); card.appendChild(moreEl); card.appendChild(linkEl); projectsGrid.appendChild(card);
            });
            setTimeout(observeProjectCards, 50);
        }
        
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); button.classList.add('active');
                currentFilters.category = button.getAttribute('data-filter'); applyFilters();
            });
        });
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.addEventListener('input', (e) => { currentFilters.search = e.target.value; applyFilters(); });
    }

    // --- Статус отправки формы (вместо alert) ---
    function notify(msg, ok) {
        const el = document.getElementById('formStatus');
        if (!el) { alert(msg); return; }
        el.textContent = msg;
        el.className = 'form-status ' + (ok ? 'ok' : 'err');
    }
    // --- 5. Обработка формы контактов (Formcarry AJAX) ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const lastSubmit = lsGet('lastFormSubmit');
            if (lastSubmit && Date.now() - lastSubmit < 60000) {
                notify('Пожалуйста, подождите минуту перед повторной отправкой сообщения.', false);
                return;
            }
            const submitBtn = this.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true; submitBtn.textContent = 'Отправка...';
            const formData = new FormData(this);
            try {
                const response = await fetch(this.action, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } });
                const data = await response.json();
                if (data.status === 'success') {
                    notify('Сообщение отправлено. Я свяжусь с вами.', true);
                    this.reset(); lsSet('lastFormSubmit', Date.now());
                } else if (data.code === 422) { notify('Ошибка валидации. Проверьте поля.', false); }
                else { notify('Ошибка: ' + (data.message || 'Неизвестная ошибка сервиса'), false); }
            } catch (error) { notify('Ошибка сети. Проверьте подключение к интернету.', false); }
            finally { submitBtn.disabled = false; submitBtn.textContent = originalText; }
        });
    }

    // --- 6. Мобильное меню ---
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');
    const menuBackdrop = document.createElement('div'); menuBackdrop.className = 'menu-backdrop'; document.body.appendChild(menuBackdrop);
    if (mobileMenuBtn && mobileNav) {
        const toggleMenu = () => { const isActive = mobileNav.classList.toggle('active'); menuBackdrop.classList.toggle('active', isActive); document.body.classList.toggle('menu-open', isActive); };
        mobileMenuBtn.addEventListener('click', toggleMenu); menuBackdrop.addEventListener('click', toggleMenu);
        mobileNav.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => { mobileNav.classList.remove('active'); menuBackdrop.classList.remove('active'); document.body.classList.remove('menu-open'); }); });
    }

    // --- 7. Магнитный эффект (ТОЛЬКО ДЛЯ КНОПОК) ---
    if (window.matchMedia("(pointer: fine)").matches) {
        // Убрали .project-card из селектора, чтобы карточки не притягивались
        document.querySelectorAll('.btn').forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect(); 
                const x = e.clientX - rect.left - rect.width / 2; 
                const y = e.clientY - rect.top - rect.height / 2;
                el.style.transform = `translate(${x * 0.05}px, ${y * 0.05}px)`;
            });
            el.addEventListener('mouseleave', () => { el.style.transform = ''; });
        });
        
        // Кастомный курсор
        const cursor = document.createElement('div'); cursor.className = 'custom-cursor'; document.body.appendChild(cursor);
        const dot = document.createElement('div'); dot.className = 'custom-cursor-dot'; document.body.appendChild(dot);
        let mouseX = 0, mouseY = 0, curX = 0, curY = 0;
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX; mouseY = e.clientY; dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
            const px = (e.clientX / window.innerWidth - 0.5) * 10; const py = (e.clientY / window.innerHeight - 0.5) * 10;
            document.body.style.setProperty('--mouse-x', `${px}px`); document.body.style.setProperty('--mouse-y', `${py}px`);
        });
        (function animate() { curX += (mouseX - curX) * 0.15; curY += (mouseY - curY) * 0.15; cursor.style.transform = `translate(${curX}px, ${curY}px)`; requestAnimationFrame(animate); })();
        const hoverTargets = 'a, button, .project-card, .btn, .tag-filter-btn';
        document.body.addEventListener('mouseover', (e) => { if (e.target.closest(hoverTargets)) cursor.classList.add('hover'); });
        document.body.addEventListener('mouseout', (e) => { if (e.target.closest(hoverTargets)) cursor.classList.remove('hover'); });
    }
});
    // --- 9. Cookie Banner ---
    if (!lsGet('cookieConsent')) {
        const banner = document.createElement('div');
        banner.className = 'cookie-banner';
        banner.innerHTML = `
            <span>Этот сайт использует cookie для сохранения темы и закладок. <a href="privacy.html">Узнать больше</a></span>
            <button id="cookieAccept">ОК</button>
        `;
        document.body.appendChild(banner);
        
        document.getElementById('cookieAccept').addEventListener('click', () => {
            lsSet('cookieConsent', 'true');
            banner.remove();
        });
    }