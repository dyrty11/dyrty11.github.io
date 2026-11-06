/* Страница проекта: project.html?p=<slug>. Данные из projects.json.
 * Весь текст выводится через textContent, ссылки и картинки проходят проверку. */
(function () {
    'use strict';
    var root = document.getElementById('projectDetail');
    if (!root) return;

    function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/g, '-').replace(/^-+|-+$/g, ''); }
    function safeUrl(u) {
        try {
            if (String(u).indexOf('//') === 0) return null;
            var x = new URL(String(u), location.href);
            if (x.protocol === 'https:' || x.protocol === 'http:') return x.href;
        } catch (e) { /* ignore */ }
        return null;
    }
    function safeImg(p) { return /^img\/[A-Za-z0-9._-]+\.(webp|png|jpe?g)$/.test(String(p || '')) ? p : null; }
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }
    function message(text) { root.textContent = ''; root.appendChild(el('p', 'detail-msg', text)); }

    /* Метаданные для поисковиков и соцсетей: канонический адрес, Open Graph, Twitter, JSON-LD. */
    function setMeta(attr, name, content) {
        var m = document.head.querySelector('meta[' + attr + '="' + name + '"]');
        if (!m) { m = document.createElement('meta'); m.setAttribute(attr, name); document.head.appendChild(m); }
        m.setAttribute('content', content);
    }
    function absUrl(path) { try { return new URL(path, location.href).href; } catch (e) { return ''; } }
    function applySeo(p, title) {
        var fullTitle = title + ' — Portfolio';
        var desc = String(p.description || 'Проект из портфолио разработчика.').slice(0, 200);
        var site = absUrl('./');
        var url = absUrl('project.html') + '?p=' + encodeURIComponent(slug(p.title));
        var img = absUrl(safeImg(p.image) || 'og-image.png');
        var link = document.head.querySelector('link[rel="canonical"]');
        if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
        link.href = url;
        setMeta('property', 'og:type', 'website'); setMeta('property', 'og:site_name', 'Portfolio'); setMeta('property', 'og:locale', 'ru_RU');
        setMeta('property', 'og:title', fullTitle); setMeta('property', 'og:description', desc);
        setMeta('property', 'og:url', url); setMeta('property', 'og:image', img);
        setMeta('name', 'twitter:card', 'summary_large_image'); setMeta('name', 'twitter:title', fullTitle);
        setMeta('name', 'twitter:description', desc); setMeta('name', 'twitter:image', img);
        var data = {
            '@context': 'https://schema.org',
            '@graph': [
                { '@type': 'CreativeWork', '@id': url + '#project', name: title, description: desc, url: url, image: img, inLanguage: 'ru',
                  keywords: Array.isArray(p.tags) ? p.tags.slice(0, 20).map(String).join(', ') : undefined,
                  isPartOf: { '@type': 'WebSite', name: 'Portfolio', url: site } },
                { '@type': 'BreadcrumbList', itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Главная', item: site },
                    { '@type': 'ListItem', position: 2, name: 'Проекты', item: absUrl('projects.html') },
                    { '@type': 'ListItem', position: 3, name: title, item: url } ] }
            ]
        };
        var old = document.head.querySelector('script[type="application/ld+json"]');
        if (old) old.remove();
        var s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(data);
        document.head.appendChild(s);
    }

    function render(p) {
        var title = String(p.title || 'Проект');
        document.title = title + ' — Portfolio';
        var md = document.querySelector('meta[name="description"]');
        if (md && p.description) md.setAttribute('content', String(p.description).slice(0, 200));
        applySeo(p, title);

        root.textContent = '';
        var head = el('div', 'page-header');
        head.appendChild(el('h1', null, title));
        head.appendChild(el('p', null, p.category === 'file' ? 'Файл / приложение' : 'Веб-сайт'));
        root.appendChild(head);

        var grid = el('div', 'detail-grid');
        var img = safeImg(p.image);
        if (img) {
            var im = el('img', 'detail-img');
            im.src = img; im.alt = 'Превью проекта ' + title; im.width = 640; im.height = 400;
            grid.appendChild(im);
        }

        var info = el('div', 'detail-info');
        if (Array.isArray(p.tags) && p.tags.length) {
            var tags = el('div', 'project-tags');
            p.tags.slice(0, 20).forEach(function (t) { tags.appendChild(el('span', 'tag', String(t))); });
            info.appendChild(tags);
        }
        info.appendChild(el('p', 'detail-lead', String(p.description || '')));
        if (p.details) {
            String(p.details).split(/\n\s*\n/).forEach(function (para) {
                if (para.trim()) info.appendChild(el('p', 'detail-text', para.trim()));
            });
        }
        if (Array.isArray(p.features) && p.features.length) {
            info.appendChild(el('h2', 'detail-sub', 'Возможности'));
            var ul = el('ul', 'feature-list');
            p.features.slice(0, 20).forEach(function (f) { ul.appendChild(el('li', null, String(f))); });
            info.appendChild(ul);
        }
        var href = safeUrl(p.link);
        if (href) {
            var a = el('a', 'btn btn-primary detail-cta', String(p.buttonText || 'Открыть'));
            a.href = href;
            if (p.type === 'download') { a.setAttribute('download', ''); a.rel = 'noopener noreferrer'; }
            else { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
            info.appendChild(a);
        }
        grid.appendChild(info);
        root.appendChild(grid);
    }

    var want = new URLSearchParams(location.search).get('p') || '';
    fetch('projects.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (list) {
            var found = Array.isArray(list) ? list.filter(function (p) { return slug(p && p.title) === slug(want); })[0] : null;
            if (!found) { setMeta('name', 'robots', 'noindex'); message('Проект не найден. Посмотрите полный список на странице «Проекты».'); return; }
            render(found);
        })
        .catch(function () { message('Не удалось загрузить проект. Попробуйте обновить страницу.'); });
})();
