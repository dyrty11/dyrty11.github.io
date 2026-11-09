/* Раздел «Избранное» на главной строится из projects.json.
 * Какие проекты избранные, владелец отмечает в админке (поле featured).
 * Если ни у одного проекта нет поля featured, показываются первые три проекта.
 * Если projects.json не загрузился, остаются карточки из HTML. Весь текст выводится через textContent. */
(function () {
    'use strict';
    var grid = document.querySelector('#projects .projects-grid');
    if (!grid) return;

    var MAX = 6;
    var PROJECT_ICONS = {"layout": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M3 4h18v13l-3 3H3z\"/><path d=\"M3 9h18\"/><path d=\"M9 9v11\" stroke=\"var(--ic2, currentColor)\"/></svg>", "file": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M5 2.5h9l5 5v14H5z\"/><path d=\"M14 2.5v5h5\"/><path d=\"M12 18.5v-6M9.5 15l2.5-2.5 2.5 2.5\" stroke=\"var(--ic2, currentColor)\"/></svg>", "shopping-bag": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M5 8h14l1 13.5H4z\"/><path d=\"M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8\"/><circle cx=\"12\" cy=\"14\" r=\"1.5\" fill=\"var(--ic2, currentColor)\" stroke=\"none\"/></svg>", "archive": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M12 2.5l8.5 5v9l-8.5 5-8.5-5v-9z\"/><path d=\"M3.5 7.5l8.5 5 8.5-5\"/><path d=\"M12 12.5v9\" stroke=\"var(--ic2, currentColor)\"/></svg>"};
    var TAG_ICONS = {"javascript": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M8 6.5L2.5 12 8 17.5M16 6.5l5.5 5.5-5.5 5.5\"/><path d=\"M14 4.5l-4 15\" stroke=\"var(--ic2, currentColor)\"/></svg>", "js": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M8 6.5L2.5 12 8 17.5M16 6.5l5.5 5.5-5.5 5.5\"/><path d=\"M14 4.5l-4 15\" stroke=\"var(--ic2, currentColor)\"/></svg>", "html": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M3 4h18v16H3z\"/><path d=\"M3 9h18\" stroke=\"var(--ic2, currentColor)\"/><path d=\"M9.5 12.5l-2 2.5 2 2.5M14.5 12.5l2 2.5-2 2.5\"/></svg>", "css": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M9 3H7.5L5 5.5V10l-2.5 2L5 14v4.5L7.5 21H9M15 3h1.5L19 5.5V10l2.5 2-2.5 2v4.5L16.5 21H15\"/><circle cx=\"12\" cy=\"12\" r=\"1.7\" fill=\"var(--ic2, currentColor)\" stroke=\"none\"/></svg>", "python": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M3 4.5h18v15H3z\"/><path d=\"M7 9.5l3 2.5-3 2.5\" stroke=\"var(--ic2, currentColor)\"/><path d=\"M12.5 15.5H17\"/></svg>", "windows": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M3 5l8-1.2v7.7H3zM13 3.5L21 2v9.5h-8zM3 13h8v7.7L3 19.5zM13 13h8v9l-8-1.5z\"/></svg>", "exe": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M6 6h12v12H6z\"/><path d=\"M10 10h4v4h-4z\" fill=\"var(--ic2, currentColor)\" stroke=\"none\"/><path d=\"M9.5 2.5V6M14.5 2.5V6M9.5 18v3.5M14.5 18v3.5\"/></svg>", "security": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M12 2.5l8 3v6c0 5.2-3.4 9-8 10.5-4.6-1.5-8-5.3-8-10.5v-6z\"/><path d=\"M8.5 12l2.5 2.5 4.5-5\" stroke=\"var(--ic2, currentColor)\"/></svg>", "tools": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M12 2.5l8.5 5v9l-8.5 5-8.5-5v-9z\"/><path d=\"M12 8l3.5 2v4L12 16l-3.5-2v-4z\" fill=\"var(--ic2, currentColor)\" stroke=\"none\"/></svg>", "developer tools": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M12 2.5l8.5 5v9l-8.5 5-8.5-5v-9z\"/><path d=\"M12 8l3.5 2v4L12 16l-3.5-2v-4z\" fill=\"var(--ic2, currentColor)\" stroke=\"none\"/></svg>", "react": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><ellipse cx=\"12\" cy=\"12\" rx=\"10\" ry=\"4\"/><ellipse cx=\"12\" cy=\"12\" rx=\"10\" ry=\"4\" transform=\"rotate(60 12 12)\"/><ellipse cx=\"12\" cy=\"12\" rx=\"10\" ry=\"4\" transform=\"rotate(120 12 12)\"/><circle cx=\"12\" cy=\"12\" r=\"1.8\" fill=\"var(--ic2, currentColor)\" stroke=\"none\"/></svg>"};
    var BTN_ICONS = {"link": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M10.5 4.5h-6v15h15v-6\"/><path d=\"M13 11l7-7\"/><path d=\"M14.5 4H20v5.5\"/></svg>", "download": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"miter\" stroke-linecap=\"square\"><path d=\"M12 3v12\"/><path d=\"M6.5 10.5L12 16l5.5-5.5\"/><path d=\"M3.5 20.5h17\"/></svg>"};

    function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/g, '-').replace(/^-+|-+$/g, ''); }
    function safeUrl(u) {
        try {
            var s = String(u || '');
            if (s.indexOf('//') === 0) return null;
            var x = new URL(s, location.href);
            return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null;
        } catch (e) { return null; }
    }
    function safeImg(p) { return /^img\/[A-Za-z0-9._-]+\.(webp|png|jpe?g)$/.test(String(p || '')) ? p : null; }
    var DATA_ICON = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/;
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

    function card(p) {
        var c = el('div', 'project-card animated-dashed visible');

        var icon = el('div', 'project-icon');
        if (typeof p.customIcon === 'string' && DATA_ICON.test(p.customIcon) && p.customIcon.length < 300 * 1024) {
            var im = document.createElement('img'); im.src = p.customIcon; im.alt = ''; im.width = 32; im.height = 32; icon.appendChild(im);
        } else {
            icon.innerHTML = PROJECT_ICONS[PROJECT_ICONS.hasOwnProperty(p.icon) ? p.icon : 'layout'];
        }
        c.appendChild(icon);

        var img = safeImg(p.image);
        if (img) {
            var th = el('img', 'project-thumb');
            th.src = img; th.alt = 'Превью проекта ' + String(p.title || ''); th.width = 640; th.height = 400;
            th.loading = 'lazy'; th.decoding = 'async';
            c.appendChild(th);
        }

        c.appendChild(el('h3', null, String(p.title || '')));
        c.appendChild(el('p', null, String(p.description || '')));

        var tags = el('div', 'project-tags');
        (Array.isArray(p.tags) ? p.tags.slice(0, 20) : []).forEach(function (raw) {
            var t = String(raw), key = t.toLowerCase(), span = el('span', 'tag');
            if (TAG_ICONS.hasOwnProperty(key)) { span.innerHTML = TAG_ICONS[key]; span.appendChild(document.createTextNode(' ' + t)); }
            else { span.textContent = t; }
            tags.appendChild(span);
        });
        c.appendChild(tags);

        var more = el('a', 'details-link', 'Подробнее →');
        more.href = /^project-[a-z0-9-]+\.html$/.test(String(p.page || '')) ? p.page : 'project.html?p=' + encodeURIComponent(slug(p.title));
        more.setAttribute('aria-label', 'Подробнее о проекте ' + String(p.title || ''));
        c.appendChild(more);

        var href = safeUrl(p.link);
        if (href) {
            var dl = p.type === 'download';
            var a = el('a', 'action-btn');
            a.href = href; a.rel = 'noopener noreferrer';
            if (dl) a.setAttribute('download', ''); else a.target = '_blank';
            a.appendChild(el('span', null, String(p.buttonText || 'Открыть')));
            a.insertAdjacentHTML('beforeend', BTN_ICONS[dl ? 'download' : 'link']);
            c.appendChild(a);
        }
        return c;
    }

    fetch('projects.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (list) {
            if (!Array.isArray(list)) return;
            list = list.filter(function (p) { return p && typeof p === 'object'; });
            var flagged = list.some(function (p) { return typeof p.featured === 'boolean'; });
            var items = flagged ? list.filter(function (p) { return p.featured === true; }) : list.slice(0, 3);
            items = items.slice(0, MAX);

            grid.textContent = '';
            if (!items.length) {
                grid.appendChild(el('p', 'fav-empty', 'Пока нет избранных проектов. Загляните в раздел «Проекты».'));
            } else {
                items.forEach(function (p) { grid.appendChild(card(p)); });
            }
            document.dispatchEvent(new Event('projects:rendered'));
        })
        .catch(function () { /* оставляем статичные карточки из HTML */ });
})();
