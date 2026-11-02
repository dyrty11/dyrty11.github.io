/* Избранные проекты. Хранятся только в браузере (localStorage), на сервер ничего не отправляется.
 * Кнопка-сердечко добавляется ко всем карточкам .project-card (в том числе созданным позже),
 * на страницу проекта, в шапку (счётчик) и на странице «Проекты» появляется фильтр «Избранное». */
(function () {
    'use strict';

    var KEY = 'favProjects', MAX = 100;
    var HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true"><path d="M12 21.5L3.6 13A5.2 5.2 0 0 1 12 6.2 5.2 5.2 0 0 1 20.4 13z"/></svg>';

    function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/g, '-').replace(/^-+|-+$/g, ''); }

    function load() {
        try {
            var a = JSON.parse(localStorage.getItem(KEY) || '[]');
            if (!Array.isArray(a)) return [];
            return a.filter(function (x) { return typeof x === 'string' && x.length < 120; }).slice(0, MAX);
        } catch (e) { return []; }
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(favs)); } catch (e) { /* хранилище недоступно: работаем в памяти */ } }

    var favs = load();
    var onlyFav = /(?:^|[?&])fav=1(?:&|$)/.test(location.search);
    var grid = document.getElementById('projectsGrid');
    var headLink = null, filterBtn = null, emptyMsg = null;

    function has(s) { return favs.indexOf(s) !== -1; }

    function toggle(s, btn) {
        var i = favs.indexOf(s);
        if (i === -1) { if (favs.length < MAX) favs.push(s); } else { favs.splice(i, 1); }
        save();
        refresh();
        if (btn) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
    }

    function makeBtn(s, title, large) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'fav-btn' + (large ? ' fav-btn-lg' : '');
        b.setAttribute('data-slug', s);
        b.setAttribute('data-title', title);
        b.innerHTML = HEART;
        if (large) { var t = document.createElement('span'); t.className = 'fav-text'; b.appendChild(t); }
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggle(s, b); });
        return b;
    }

    function decorate() {
        Array.prototype.forEach.call(document.querySelectorAll('.project-card:not([data-fav])'), function (card) {
            var h = card.querySelector('h3'); var title = h ? h.textContent.trim() : '';
            var s = slug(title); if (!s) return;
            card.setAttribute('data-fav', s);
            card.appendChild(makeBtn(s, title, false));
        });
        var head = document.querySelector('#projectDetail .page-header:not([data-fav])');
        if (head) {
            var h1 = head.querySelector('h1'); var t = h1 ? h1.textContent.trim() : '';
            var s2 = slug(t);
            if (s2) { head.setAttribute('data-fav', s2); head.appendChild(makeBtn(s2, t, true)); }
        }
        refresh();
    }

    function refresh() {
        Array.prototype.forEach.call(document.querySelectorAll('.fav-btn'), function (b) {
            var s = b.getAttribute('data-slug'), on = has(s), title = b.getAttribute('data-title') || '';
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.setAttribute('aria-label', (on ? 'Убрать из избранного: ' : 'Добавить в избранное: ') + title);
            var t = b.querySelector('.fav-text'); if (t) t.textContent = on ? 'В избранном' : 'В избранное';
        });
        if (headLink) {
            var c = headLink.querySelector('.fav-count'); if (c) c.textContent = String(favs.length);
            headLink.classList.toggle('has', favs.length > 0);
            headLink.setAttribute('aria-label', 'Избранное: ' + favs.length);
        }
        if (filterBtn) {
            filterBtn.classList.toggle('active', onlyFav);
            filterBtn.setAttribute('aria-pressed', onlyFav ? 'true' : 'false');
            filterBtn.textContent = 'Избранное (' + favs.length + ')';
        }
        applyFilter();
    }

    function applyFilter() {
        if (!grid) return;
        var shown = 0, total = 0;
        Array.prototype.forEach.call(grid.querySelectorAll('.project-card'), function (card) {
            total++;
            var hide = onlyFav && !has(card.getAttribute('data-fav') || '');
            card.classList.toggle('fav-hidden', hide);
            if (!hide) shown++;
        });
        if (emptyMsg) {
            emptyMsg.hidden = !(onlyFav && shown === 0 && total > 0);
            emptyMsg.textContent = favs.length === 0
                ? 'Пока пусто. Нажмите на сердечко на карточке проекта, и он появится здесь.'
                : 'Среди текущих фильтров нет избранных проектов.';
        }
    }

    function buildHeaderLink() {
        var box = document.querySelector('.header-controls');
        if (!box) return;
        headLink = document.createElement('a');
        headLink.className = 'fav-link';
        headLink.href = 'projects.html?fav=1';
        headLink.innerHTML = HEART + '<span class="fav-count">0</span>';
        box.insertBefore(headLink, box.firstChild);
    }

    function buildFilter() {
        if (!grid) return;
        var tabs = document.querySelector('.tabs');
        if (tabs) {
            filterBtn = document.createElement('button');
            filterBtn.type = 'button';
            filterBtn.className = 'fav-filter';
            filterBtn.addEventListener('click', function () {
                onlyFav = !onlyFav;
                try {
                    var u = new URL(location.href);
                    if (onlyFav) u.searchParams.set('fav', '1'); else u.searchParams.delete('fav');
                    history.replaceState(null, '', u.pathname + u.search + u.hash);
                } catch (e) { /* ignore */ }
                refresh();
            });
            tabs.appendChild(filterBtn);
        }
        emptyMsg = document.createElement('p');
        emptyMsg.className = 'fav-empty';
        emptyMsg.hidden = true;
        grid.parentNode.insertBefore(emptyMsg, grid.nextSibling);
        new MutationObserver(decorate).observe(grid, { childList: true });
    }

    buildHeaderLink();
    buildFilter();
    var detail = document.getElementById('projectDetail');
    if (detail) new MutationObserver(decorate).observe(detail, { childList: true });
    decorate();

    window.addEventListener('storage', function (e) {
        if (e.key === KEY) { favs = load(); refresh(); }
    });
})();
