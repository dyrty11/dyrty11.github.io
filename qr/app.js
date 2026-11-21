/* Генератор QR-кодов: интерфейс. Всё работает локально, данные никуда не отправляются. */
(function () {
    'use strict';
    var C = window.QRContent, R = window.QRRender, F = window.QRFiles;
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var LS = {
        get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
    };
    function h(tag, props, kids) {
        var e = document.createElement(tag);
        Object.keys(props || {}).forEach(function (k) {
            if (k === 'text') e.textContent = props[k]; else if (k === 'class') e.className = props[k];
            else if (props[k] !== false && props[k] != null) e.setAttribute(k, props[k] === true ? '' : props[k]);
        });
        (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return e;
    }
    function svgNode(str) { return document.importNode(new DOMParser().parseFromString(str, 'image/svg+xml').documentElement, true); }
    var toastT;
    function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2600); }
    function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }
    function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

    /* ---------------- состояние ---------------- */
    var state = { type: 'url', vals: {}, style: R.clone(R.DEFAULTS) };
    (function restore() {
        var s = LS.get('qr.state.v1');
        if (s && C.byId[s.type]) { state.type = s.type; state.vals = s.vals || {}; state.style = R.merge(R.DEFAULTS, s.style); }
    })();
    function vals() { if (!state.vals[state.type]) state.vals[state.type] = C.defaults(state.type); return state.vals[state.type]; }
    var saveState = debounce(function () {
        var st = R.clone(state.style); if (st.logo && st.logo.data && st.logo.data.length > 150000) st.logo = R.clone(R.DEFAULTS.logo);
        LS.set('qr.state.v1', { type: state.type, vals: state.vals, style: st });
    }, 400);

    function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
    function setPath(o, p, v) { var k = p.split('.'), last = k.pop(); k.reduce(function (a, x) { return a[x]; }, o)[last] = v; }

    /* ---------------- вкладки ---------------- */
    var modes = ['create', 'batch', 'scan', 'hist'];
    function setMode(m) {
        modes.forEach(function (k) {
            var on = k === m;
            $('#tab-' + k).setAttribute('aria-selected', on ? 'true' : 'false'); $('#tab-' + k).tabIndex = on ? 0 : -1;
            $('#mode-' + k).hidden = !on;
        });
        if (m !== 'scan') camStop();
        if (m === 'hist') renderHist();
        if (m === 'batch') renderBatchPreview();
    }
    $$('.modes button').forEach(function (b) {
        b.addEventListener('click', function () { setMode(b.dataset.mode); });
        b.addEventListener('keydown', function (e) {
            var i = modes.indexOf(b.dataset.mode), n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
            if (n < 0) return; n = (n + modes.length) % modes.length; setMode(modes[n]); $('#tab-' + modes[n]).focus();
        });
    });

    /* ---------------- типы и поля ---------------- */
    function renderTypes() {
        var box = $('#types'); box.textContent = '';
        C.groups.forEach(function (g) {
            box.appendChild(h('div', { class: 'tgroup', text: g }));
            C.types.filter(function (t) { return t.group === g; }).forEach(function (t) {
                var b = h('button', { type: 'button', class: 'chip', 'aria-pressed': t.id === state.type ? 'true' : 'false', text: t.label });
                b.addEventListener('click', function () { state.type = t.id; renderTypes(); renderFields(); update(); });
                box.appendChild(b);
            });
        });
    }
    function renderFields() {
        var t = C.byId[state.type], box = $('#fields'), v = vals(); box.textContent = '';
        $('#typeHint').textContent = t.hint || '';
        var single = t.fields.filter(function (f) { return f.id; }).length === 1;
        t.fields.forEach(function (f) {
            if (f.kind === 'action') {
                var ab = h('button', { type: 'button', class: 'b wide', text: f.label });
                ab.addEventListener('click', function () {
                    if (!navigator.geolocation) return toast('Браузер не умеет определять местоположение');
                    navigator.geolocation.getCurrentPosition(function (p) {
                        v.lat = p.coords.latitude.toFixed(6); v.lon = p.coords.longitude.toFixed(6); renderFields(); update();
                    }, function () { toast('Не удалось определить местоположение. Проверьте разрешение для сайта.'); }, { timeout: 10000 });
                });
                box.appendChild(ab); return;
            }
            var id = 'f-' + f.id, input;
            if (f.kind === 'textarea') input = h('textarea', { id: id, rows: 3, placeholder: f.ph || '' });
            else if (f.kind === 'select') { input = h('select', { id: id }); f.opts.forEach(function (o) { input.appendChild(h('option', { value: o[0], text: o[1] })); }); }
            else if (f.kind === 'checkbox') input = h('input', { id: id, type: 'checkbox' });
            else input = h('input', { id: id, type: f.kind || 'text', placeholder: f.ph || '', autocomplete: 'off', spellcheck: 'false' });
            if (f.kind === 'checkbox') input.checked = !!v[f.id]; else input.value = v[f.id] == null ? '' : v[f.id];
            var ev = f.kind === 'select' || f.kind === 'checkbox' ? 'change' : 'input';
            input.addEventListener(ev, function () { v[f.id] = f.kind === 'checkbox' ? input.checked : input.value; if (f.kind === 'checkbox' || f.kind === 'select') applyShow(); update(); });
            var wrap;
            if (f.kind === 'checkbox') wrap = h('label', { class: 'chk wide', for: id }, [input, f.label]);
            else wrap = h('label', { class: 'fld' + (f.kind === 'textarea' || single ? ' wide' : ''), for: id }, [f.label + (f.req ? ' *' : ''), input]);
            if (f.show) wrap.dataset.show = f.show;
            box.appendChild(wrap);
        });
        applyShow();
    }
    function applyShow() { var v = vals(); $$('#fields [data-show]').forEach(function (w) { w.hidden = !v[w.dataset.show]; }); }

    /* ---------------- элементы оформления ---------------- */
    function miniSvg(opts) { var r = R.build('QR', R.merge({ margin: 1 }, opts)); return svgNode(r.svgAt(64)); }
    function renderChoices() {
        var maps = { body: R.BODY, eyeFrame: R.FRAME, eyeBall: R.BALL };
        $$('[data-choice]').forEach(function (box) {
            var key = box.dataset.choice; box.textContent = '';
            maps[key].forEach(function (o) {
                var opts = {}; opts[key] = o[0];
                var b = h('button', { type: 'button', class: 'choice', 'data-v': o[0], title: o[1] }, [miniSvg(opts), h('span', { text: o[1] })]);
                b.addEventListener('click', function () { state.style[key] = o[0]; syncChoices(); update(); });
                box.appendChild(b);
            });
        });
        var ib = $('#logoIcon'); ib.textContent = '';
        Object.keys(R.ICONS).forEach(function (k) {
            var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24');
            var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', R.ICONS[k]); s.appendChild(p);
            var b = h('button', { type: 'button', class: 'choice', 'data-v': k, title: R.ICON_NAMES[k], 'aria-label': R.ICON_NAMES[k] }, [s]);
            b.addEventListener('click', function () { state.style.logo.icon = k; syncChoices(); update(); });
            ib.appendChild(b);
        });
        var sel = $('[data-s="frame"]'); sel.textContent = '';
        R.FRAMES.forEach(function (o) { sel.appendChild(h('option', { value: o[0], text: o[1] })); });
    }
    function syncChoices() {
        $$('[data-choice]').forEach(function (box) { $$('.choice', box).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === state.style[box.dataset.choice] ? 'true' : 'false'); }); });
        $$('#logoIcon .choice').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === state.style.logo.icon ? 'true' : 'false'); });
    }

    var PALETTES = [
        ['Классика', '#000000', '#000000', '#ffffff', 'none'], ['Мята', '#0b3d2e', '#157a50', '#ffffff', 'linear'], ['Океан', '#0a3d91', '#0a7fa8', '#ffffff', 'linear'],
        ['Закат', '#b5380a', '#c2255c', '#ffffff', 'linear'], ['Лаванда', '#4c2a85', '#7243c4', '#ffffff', 'linear'], ['Графит', '#1d1f21', '#5a5f66', '#ffffff', 'linear'],
        ['Бордо', '#7a0f2e', '#7a0f2e', '#fff6f0', 'none'], ['Лес', '#14532d', '#14532d', '#f0f7ee', 'none'], ['Ночь', '#e9efeb', '#8fe0b0', '#0a0c0b', 'linear']
    ];
    function renderPalettes() {
        var box = $('#palettes'); box.textContent = '';
        PALETTES.forEach(function (p, i) {
            var b = h('button', { type: 'button', class: 'sw', title: p[0], 'aria-label': 'Схема: ' + p[0] });
            b.style.background = 'linear-gradient(135deg,' + p[1] + ' 0 50%,' + p[2] + ' 50% 100%)'; b.style.boxShadow = '0 0 0 3px ' + p[3] + ' inset';
            b.addEventListener('click', function () { var s = state.style; s.fg = p[1]; s.fg2 = p[2]; s.bg = p[3]; s.grad = p[4]; s.transparent = false; s.eyeFrameColor = ''; s.eyeBallColor = ''; syncControls(); update(); });
            box.appendChild(b);
        });
    }

    function bindControls() {
        $$('[data-s]').forEach(function (el) {
            var p = el.dataset.s, ev = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(ev, function () {
                var v = el.type === 'checkbox' ? el.checked : el.value;
                if (el.dataset.num !== undefined) v = Number(v);
                if (el.dataset.pct !== undefined) v = Number(v) / 100;
                setPath(state.style, p, v); syncVisibility(); update();
            });
        });
        $('#eyeColors').addEventListener('change', function () {
            var s = state.style;
            if (this.checked) { s.eyeFrameColor = s.eyeFrameColor || s.fg; s.eyeBallColor = s.eyeBallColor || s.fg; } else { s.eyeFrameColor = ''; s.eyeBallColor = ''; }
            syncControls(); update();
        });
        $('#logoFile').addEventListener('change', function () {
            var f = this.files && this.files[0]; if (!f) return;
            if (f.size > 4 * 1024 * 1024) return toast('Файл больше 4 МБ');
            var url = URL.createObjectURL(f), img = new Image();
            img.onload = function () {
                var s = Math.min(1, 256 / Math.max(img.naturalWidth || 256, img.naturalHeight || 256)), w = Math.max(1, Math.round((img.naturalWidth || 256) * s)), hh = Math.max(1, Math.round((img.naturalHeight || 256) * s));
                var cv = document.createElement('canvas'); cv.width = w; cv.height = hh; cv.getContext('2d').drawImage(img, 0, 0, w, hh);
                URL.revokeObjectURL(url); state.style.logo.data = cv.toDataURL('image/png'); state.style.logo.type = 'image'; syncControls(); update();
            };
            img.onerror = function () { URL.revokeObjectURL(url); toast('Не удалось открыть картинку'); };
            img.src = url;
        });
    }
    function syncVisibility() {
        var s = state.style;
        $('#gradRow').hidden = s.grad === 'none';
        $('#eyeRow').hidden = !(s.eyeFrameColor || s.eyeBallColor);
        $('#logoIcon').hidden = s.logo.type !== 'icon';
        $('#logoTextRow').hidden = s.logo.type !== 'text';
        $('#logoImgRow').hidden = s.logo.type !== 'image';
        $('#angleOut').textContent = s.angle; $('#bgrOut').textContent = s.bgRadius; $('#lsOut').textContent = Math.round(s.logo.size * 100); $('#mgOut').textContent = s.margin;
    }
    function syncControls() {
        var s = state.style;
        $$('[data-s]').forEach(function (el) {
            var p = el.dataset.s, v = getPath(s, p);
            if (el.type === 'checkbox') el.checked = !!v;
            else if (el.type === 'color') el.value = v || (p === 'logo.color' ? s.fg : s.fg);
            else if (el.dataset.pct !== undefined) el.value = Math.round(v * 100);
            else el.value = v;
        });
        $('#eyeColors').checked = !!(s.eyeFrameColor || s.eyeBallColor);
        syncChoices(); syncVisibility();
    }

    /* ---------------- вывод ---------------- */
    var lastRes = null, vTok = 0;
    var verifyLater = debounce(runVerify, 350);
    function update() { render(); saveState(); }
    function render() {
        var stage = $('#stage'), text = C.build(state.type, vals()), errs = C.check(state.type, vals());
        var ul = $('#errs'); ul.textContent = ''; errs.forEach(function (e) { ul.appendChild(h('li', { text: e })); });
        stage.classList.toggle('checker', !!state.style.transparent);
        var dis = function (v) { $$('[data-dl],#copyImg,#shareBtn,#printBtn,#copyRaw,#linkBtn').forEach(function (b) { b.disabled = v; }); };
        if (!text) {
            lastRes = null; stage.textContent = ''; stage.appendChild(h('div', { class: 'ph', text: 'Заполните обязательные поля слева, и здесь появится код' }));
            setStatus('', ''); $('#notes').textContent = ''; $('#raw').textContent = ''; $('#meta').textContent = ''; dis(true); return;
        }
        var res = R.build(text, state.style);
        if (res.error) { lastRes = null; stage.textContent = ''; stage.appendChild(h('div', { class: 'ph', text: res.error })); setStatus(res.error, 'bad'); dis(true); return; }
        lastRes = res; dis(false);
        stage.textContent = ''; stage.appendChild(svgNode(res.svg));
        $('#raw').textContent = text;
        var bytes = new TextEncoder().encode(text).length;
        $('#meta').textContent = 'Версия ' + res.version + ', ' + res.n + '×' + res.n + ' модулей, коррекция ' + res.ecl + ', ' + bytes + ' байт данных.';
        setStatus('Проверяю читаемость…', ''); $('#notes').textContent = '';
        verifyLater();
    }
    function setStatus(t, cls) { var s = $('#status'); s.textContent = t; s.className = 'status' + (cls ? ' ' + cls : ''); }
    function runVerify() {
        var res = lastRes; if (!res) return; var tok = ++vTok;
        R.verify(res).then(function (v) {
            if (tok !== vTok || res !== lastRes) return;
            if (v.ok) setStatus('Код читается: проверено тестовым сканером', 'ok');
            else setStatus('Тестовый сканер не смог прочитать этот код. Телефон, скорее всего, справится, но проверьте на своём или упростите оформление.', 'bad');
            var ul = $('#notes'); ul.textContent = ''; v.notes.forEach(function (n) { ul.appendChild(h('li', { text: n })); });
        }).catch(function () { setStatus('', ''); });
    }

    var MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
    function a4pdf(res, cm) {
        var W = 1654, H = 2339, w = Math.round(cm / 2.54 * 200);
        return R.raster(res, w, 'canvas').then(function (qc) {
            var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d');
            x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(qc, Math.round((W - qc.width) / 2), Math.round((H - qc.height) / 2));
            return new Promise(function (ok) { cv.toBlob(ok, 'image/jpeg', 0.95); });
        }).then(F.bytes).then(function (jpeg) { return F.pdf([{ jpeg: jpeg, wpx: W, hpx: H, wpt: 595.28, hpt: 841.89 }]); });
    }
    function blobFor(fmt) {
        var res = lastRes, px = Number($('#px').value) || 1024;
        if (fmt === 'svg') return Promise.resolve(new Blob([res.svgAt(Math.max(px, 1024))], { type: 'image/svg+xml' }));
        if (fmt === 'pdf') return a4pdf(res, Number($('#pdfSz').value) || 12);
        return R.raster(res, px, MIME[fmt], 0.95);
    }
    function fname(ext) { return 'qr-' + F.slug(lastRes ? lastRes.text : '') + '.' + ext; }
    function remember() {
        if (LS.get('qr.hist.off') || !lastRes) return;
        var st = R.clone(state.style); if (st.logo.type === 'image') st.logo = R.clone(R.DEFAULTS.logo);
        var list = LS.get('qr.hist') || [], key = lastRes.text + JSON.stringify(st);
        list = list.filter(function (e) { return e.text + JSON.stringify(e.style) !== key; });
        list.unshift({ ts: Date.now(), type: state.type, vals: vals(), style: st, text: lastRes.text });
        LS.set('qr.hist', list.slice(0, 40));
    }
    $$('[data-dl]').forEach(function (b) {
        b.addEventListener('click', function () {
            if (!lastRes) return; var fmt = b.dataset.dl; b.disabled = true;
            blobFor(fmt).then(function (blob) { F.download(blob, fname(fmt)); remember(); toast('Файл сохранён'); })
                .catch(function (e) { toast(e.message || 'Не получилось сохранить'); }).then(function () { b.disabled = !lastRes; });
        });
    });
    $('#copyImg').addEventListener('click', function () {
        if (!lastRes) return;
        F.copyImage(blobFor('png')).then(function () { remember(); toast('Картинка скопирована'); }).catch(function () { toast('Браузер не разрешил копирование. Скачайте PNG.'); });
    });
    if (!navigator.share) $('#shareBtn').hidden = true;
    $('#shareBtn').addEventListener('click', function () {
        if (!lastRes) return;
        blobFor('png').then(function (b) { return F.share(b, fname('png'), 'QR-код'); }).then(remember).catch(function (e) { if (e && e.name !== 'AbortError') toast('Не удалось поделиться. Скачайте PNG.'); });
    });
    $('#printBtn').addEventListener('click', function () {
        if (!lastRes) return;
        R.raster(lastRes, 1400, 'image/png').then(function (b) {
            var url = URL.createObjectURL(b), img = h('img', { alt: 'QR-код для печати' }), pa = $('#printArea');
            pa.textContent = ''; pa.appendChild(img);
            img.onload = function () { remember(); window.print(); };
            img.src = url;
            window.addEventListener('afterprint', function done() { window.removeEventListener('afterprint', done); pa.textContent = ''; URL.revokeObjectURL(url); });
        });
    });
    $('#copyRaw').addEventListener('click', function () { F.copyText($('#raw').textContent).then(function () { toast('Текст скопирован'); }).catch(function () { toast('Не удалось скопировать'); }); });

    /* ---------------- стили: случайный, сброс, сохранённые, ссылка ---------------- */
    function hsl(hh, s, l) {
        s /= 100; l /= 100; var a = s * Math.min(l, 1 - l), f = function (n) { var k = (n + hh / 30) % 12, c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * c).toString(16).padStart(2, '0'); };
        return '#' + f(0) + f(8) + f(4);
    }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    async function randomize() {
        var btn = $('#randBtn'); btn.disabled = true;
        try {
            for (var i = 0; i < 8; i++) {
                var hue = Math.random() * 360, s = state.style;
                s.fg = hsl(hue, 65 + Math.random() * 25, 16 + Math.random() * 12); s.fg2 = hsl((hue + 40 + Math.random() * 90) % 360, 70 + Math.random() * 20, 26 + Math.random() * 12);
                s.grad = Math.random() < 0.7 ? pick(['linear', 'radial']) : 'none'; s.angle = pick([0, 45, 90, 135]); s.bg = '#ffffff'; s.transparent = false;
                s.body = pick(R.BODY)[0]; s.eyeFrame = pick(R.FRAME)[0]; s.eyeBall = pick(['square', 'rounded', 'circle', 'leaf']); s.eyeFrameColor = ''; s.eyeBallColor = '';
                if (!lastRes && !C.build(state.type, vals())) break;
                var r = R.build(C.build(state.type, vals()), s); if (r.error) break;
                var v = await R.verify(r); if (v.ok && r.contrast >= 4.5) break;
            }
        } finally { btn.disabled = false; syncControls(); update(); }
    }
    $('#randBtn').addEventListener('click', randomize);
    $('#resetStyle').addEventListener('click', function () { state.style = R.clone(R.DEFAULTS); syncControls(); update(); toast('Оформление сброшено'); });

    function renderPresets() {
        var ul = $('#presets'), list = LS.get('qr.presets') || []; ul.textContent = '';
        list.forEach(function (p, i) {
            var use = h('button', { type: 'button', class: 'b', text: 'Применить' }), del = h('button', { type: 'button', class: 'b', text: 'Удалить', 'aria-label': 'Удалить стиль ' + p.name });
            use.addEventListener('click', function () { state.style = R.merge(R.DEFAULTS, p.style); syncControls(); update(); toast('Стиль применён'); });
            del.addEventListener('click', function () { list.splice(i, 1); LS.set('qr.presets', list); renderPresets(); });
            ul.appendChild(h('li', {}, [h('span', { text: p.name }), h('span', { class: 'acts' }, [use, del])]));
        });
    }
    $('#presetSave').addEventListener('click', function () {
        var n = $('#presetName').value.trim() || 'Мой стиль', list = LS.get('qr.presets') || [];
        list.unshift({ name: n, style: R.clone(state.style) }); if (!LS.set('qr.presets', list.slice(0, 20))) toast('Не хватило места в браузере. Уберите картинку-логотип.');
        $('#presetName').value = ''; renderPresets(); toast('Стиль сохранён');
    });
    function b64(s) { var b = new TextEncoder().encode(s), bin = ''; b.forEach(function (x) { bin += String.fromCharCode(x); }); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    function unb64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); }
    $('#linkBtn').addEventListener('click', function () {
        var st = R.clone(state.style); if (st.logo.type === 'image') st.logo = R.clone(R.DEFAULTS.logo);
        var url = location.origin + location.pathname + '#c=' + b64(JSON.stringify({ t: state.type, v: vals(), s: st }));
        F.copyText(url).then(function () { toast('Ссылка скопирована'); }).catch(function () { toast('Не удалось скопировать'); });
    });
    (function fromHash() {
        var m = /^#c=([\w-]+)$/.exec(location.hash); if (!m) return;
        try {
            var o = JSON.parse(unb64(m[1]));
            if (o && C.byId[o.t]) { state.type = o.t; state.vals[o.t] = Object.assign(C.defaults(o.t), o.v || {}); state.style = R.merge(R.DEFAULTS, o.s || {}); }
        } catch (e) { /* битая ссылка */ }
        try { history.replaceState(null, '', location.pathname); } catch (e) { /* ничего */ }
    })();

    /* ---------------- пакетный режим ---------------- */
    function urlish(v) { return /^https?:\/\/\S+$/i.test(v) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(v); }
    function parseBatch() {
        var mode = $('#batchType').value, out = [];
        $('#batchIn').value.split(/\r?\n/).forEach(function (line) {
            line = line.trim(); if (!line) return;
            var name = '', val = line, i = line.indexOf('|');
            if (i < 0 && line.indexOf('\t') > 0) i = line.indexOf('\t');
            if (i > 0) { name = line.slice(0, i).trim(); val = line.slice(i + 1).trim(); }
            if (!val) return;
            if (mode === 'url' || (mode === 'auto' && urlish(val))) val = C.normUrl(val);
            out.push({ name: name, value: val });
        });
        return out.slice(0, 500);
    }
    var renderBatchPreview = debounce(function () {
        var box = $('#batchPrev'); box.textContent = ''; var items = parseBatch();
        $('#batchStatus').textContent = items.length ? 'Строк: ' + items.length + (items.length === 500 ? ' (максимум за раз)' : '') : '';
        items.slice(0, 12).forEach(function (it) {
            var r = R.build(it.value, state.style); if (r.error) return;
            box.appendChild(h('figure', {}, [svgNode(r.svgAt(120)), h('figcaption', { text: it.name || it.value })]));
        });
    }, 250);
    $('#batchIn').addEventListener('input', renderBatchPreview);
    $('#batchType').addEventListener('change', renderBatchPreview);
    $('#batchFile').addEventListener('change', function () {
        var f = this.files && this.files[0]; if (!f) return;
        if (f.size > 1024 * 1024) return toast('Файл больше 1 МБ');
        f.text().then(function (t) { $('#batchIn').value = t.replace(/^﻿/, ''); renderBatchPreview(); });
    });
    function prog(v) { var p = $('#batchProg'); p.hidden = v == null; if (v != null) p.value = v; }
    function csvq(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }
    $('#batchZip').addEventListener('click', async function () {
        var items = parseBatch(), fmt = $('#batchFmt').value, px = Number($('#batchPx').value), st = $('#batchStatus'), btn = this;
        if (!items.length) return toast('Добавьте хотя бы одну строку');
        btn.disabled = true; var files = [], csv = ['﻿№;название;значение;файл'], enc = new TextEncoder(), skipped = 0;
        try {
            for (var i = 0; i < items.length; i++) {
                prog(Math.round(i / items.length * 100)); st.textContent = 'Делаю ' + (i + 1) + ' из ' + items.length + '…';
                var r = R.build(items[i].value, state.style); if (r.error) { skipped++; continue; }
                var data = fmt === 'svg' ? enc.encode(r.svgAt(1024)) : await F.bytes(await R.raster(r, px, MIME[fmt], 0.95));
                var name = String(i + 1).padStart(3, '0') + '-' + F.slug(items[i].name || items[i].value) + '.' + fmt;
                files.push({ name: name, data: data }); csv.push([i + 1, csvq(items[i].name), csvq(items[i].value), name].join(';'));
                if (i % 5 === 4) await tick();
            }
            files.push({ name: 'список.csv', data: enc.encode(csv.join('\r\n')) });
            F.download(F.zip(files), 'qr-codes.zip'); st.textContent = 'Готово: ' + (files.length - 1) + ' файлов' + (skipped ? ', пропущено слишком длинных: ' + skipped : '') + '.';
        } catch (e) { st.textContent = 'Не получилось: ' + (e.message || e); }
        prog(null); btn.disabled = false;
    });
    $('#batchPdf').addEventListener('click', async function () {
        var items = parseBatch(), cols = Number($('#batchCols').value), st = $('#batchStatus'), btn = this;
        if (!items.length) return toast('Добавьте хотя бы одну строку');
        btn.disabled = true;
        try {
            var W = 1240, H = 1754, M = 70, cw = (W - 2 * M) / cols, qw = Math.round(cw * 0.84), fs = Math.round(cw * 0.07);
            var cellH = Math.round(qw + fs * 2.6 + cw * 0.04), rows = Math.max(1, Math.floor((H - 2 * M) / cellH)), per = cols * rows, pages = [], cv, x;
            for (var i = 0; i < items.length; i++) {
                prog(Math.round(i / items.length * 100)); st.textContent = 'Верстаю ' + (i + 1) + ' из ' + items.length + '…';
                if (i % per === 0) { cv = document.createElement('canvas'); cv.width = W; cv.height = H; x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); pages.push(cv); }
                var r = R.build(items[i].value, state.style); if (r.error) continue;
                var k = i % per, cx = M + (k % cols) * cw, cy = M + Math.floor(k / cols) * cellH, qc = await R.raster(r, qw, 'canvas');
                x.setLineDash([8, 8]); x.strokeStyle = '#bbb'; x.lineWidth = 1.5; x.strokeRect(cx + 4, cy + 4, cw - 8, cellH - 8); x.setLineDash([]);
                x.drawImage(qc, Math.round(cx + (cw - qc.width) / 2), cy + Math.round(cw * 0.04));
                var cap = items[i].name || items[i].value; x.fillStyle = '#111'; x.font = '600 ' + fs + 'px Onest, Arial, sans-serif'; x.textAlign = 'center';
                while (cap.length > 3 && x.measureText(cap).width > cw - 24) cap = cap.slice(0, -2);
                if (cap !== (items[i].name || items[i].value)) cap += '…';
                x.fillText(cap, cx + cw / 2, cy + Math.round(cw * 0.04) + qc.height + fs * 1.5);
                if (i % 5 === 4) await tick();
            }
            var out = [];
            for (var p = 0; p < pages.length; p++) {
                var jb = await new Promise(function (ok) { pages[p].toBlob(ok, 'image/jpeg', 0.92); });
                out.push({ jpeg: await F.bytes(jb), wpx: W, hpx: H, wpt: 595.28, hpt: 841.89 });
            }
            F.download(F.pdf(out), 'qr-nakleyki.pdf'); st.textContent = 'Готово: страниц ' + out.length + ', кодов ' + items.length + '.';
        } catch (e) { st.textContent = 'Не получилось: ' + (e.message || e); }
        prog(null); btn.disabled = false;
    });

    /* ---------------- сканер ---------------- */
    var stream = null, scanning = false, facing = 'environment', detector = null, scanCv = document.createElement('canvas'), lastScan = '';
    var SHORT = /(^|\.)(bit\.ly|t\.co|tinyurl\.com|goo\.gl|clck\.ru|cutt\.ly|is\.gd|rebrand\.ly|vk\.cc)$/i;
    function camStop() { scanning = false; if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } $('#cam').srcObject = null; $('#camWrap').hidden = true; $('#camFlip').hidden = true; $('#camBtn').textContent = 'Включить камеру'; }
    function decodeCanvasAny(cv) { var d = R.decodeCanvas(cv); return d; }
    async function camStart() {
        var st = $('#scanStatus');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { st.textContent = 'Этот браузер не даёт доступ к камере. Откройте картинку с кодом.'; return; }
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 } }, audio: false }); }
        catch (e) { st.textContent = 'Нет доступа к камере. Разрешите её для сайта в настройках браузера или откройте картинку.'; return; }
        var v = $('#cam'); v.srcObject = stream; try { await v.play(); } catch (e) { /* автозапуск */ }
        $('#camWrap').hidden = false; $('#camFlip').hidden = false; $('#camBtn').textContent = 'Остановить'; st.textContent = 'Наведите камеру на QR-код.';
        scanning = true; if ('BarcodeDetector' in window && !detector) { try { detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; } }
        scanLoop();
    }
    async function scanLoop() {
        if (!scanning) return; var v = $('#cam'), text = null;
        if (v.videoWidth) {
            try {
                if (detector) { var r = await detector.detect(v); if (r[0]) text = r[0].rawValue; }
                if (!text) {
                    var s = Math.min(1, 720 / v.videoWidth); scanCv.width = Math.round(v.videoWidth * s); scanCv.height = Math.round(v.videoHeight * s);
                    var cx = scanCv.getContext('2d', { willReadFrequently: true }); cx.drawImage(v, 0, 0, scanCv.width, scanCv.height); text = decodeCanvasAny(scanCv);
                }
            } catch (e) { /* кадр пропускаем */ }
        }
        if (text) { camStop(); if (navigator.vibrate) navigator.vibrate(60); showScan(text); return; }
        setTimeout(scanLoop, 120);
    }
    $('#camBtn').addEventListener('click', function () { scanning ? camStop() : camStart(); });
    $('#camFlip').addEventListener('click', function () { facing = facing === 'environment' ? 'user' : 'environment'; camStop(); camStart(); });

    async function decodeImage(file) {
        var st = $('#scanStatus'); st.textContent = 'Ищу код…';
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = async function () {
            URL.revokeObjectURL(url); var text = null, big = Math.max(img.naturalWidth, img.naturalHeight);
            try { if ('BarcodeDetector' in window) { var r = await new BarcodeDetector({ formats: ['qr_code'] }).detect(img); if (r[0]) text = r[0].rawValue; } } catch (e) { /* дальше jsQR */ }
            var sizes = [Math.min(big, 1600), 1000, 700, 450];
            for (var i = 0; i < sizes.length && !text; i++) {
                var s = Math.min(1, sizes[i] / big); scanCv.width = Math.max(1, Math.round(img.naturalWidth * s)); scanCv.height = Math.max(1, Math.round(img.naturalHeight * s));
                var cx = scanCv.getContext('2d', { willReadFrequently: true }); cx.fillStyle = '#fff'; cx.fillRect(0, 0, scanCv.width, scanCv.height); cx.drawImage(img, 0, 0, scanCv.width, scanCv.height); text = decodeCanvasAny(scanCv);
                await tick();
            }
            if (text) { st.textContent = ''; showScan(text); } else st.textContent = 'QR-код на картинке не найден. Попробуйте более чёткое или обрезанное изображение.';
        };
        img.onerror = function () { URL.revokeObjectURL(url); st.textContent = 'Не удалось открыть файл как картинку.'; };
        img.src = url;
    }
    $('#scanFile').addEventListener('change', function () { if (this.files[0]) decodeImage(this.files[0]); this.value = ''; });
    var drop = $('#drop');
    ['dragenter', 'dragover'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (ev) { var f = ev.dataTransfer && ev.dataTransfer.files[0]; if (f) decodeImage(f); });
    document.addEventListener('paste', function (ev) {
        if ($('#mode-scan').hidden) return;
        var items = ev.clipboardData && ev.clipboardData.files; if (items && items[0] && /^image\//.test(items[0].type)) { ev.preventDefault(); decodeImage(items[0]); }
    });

    function showScan(text) {
        lastScan = text; var d = C.describe(text), rows = $('#scanRows'); rows.textContent = '';
        $('#scanCard').hidden = false; $('#scanKind').textContent = d.kind;
        d.rows.forEach(function (r) { rows.appendChild(h('dt', { text: r[0] })); rows.appendChild(h('dd', { text: r[1] })); });
        $('#scanRaw').textContent = d.secret ? text.replace(/secret=[^&]+/i, 'secret=••••••') : text;
        var open = $('#scanOpen'), warn = $('#scanWarn'), wmsg = '';
        if (d.link && /^https?:\/\//i.test(d.link)) {
            open.hidden = false; open.href = d.link;
            try {
                var u = new URL(d.link);
                if (d.punycode) wmsg = 'Адрес записан в международной кодировке (xn--): так иногда маскируют поддельные сайты. Проверьте, что это нужный вам адрес.';
                else if (/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) wmsg = 'Ссылка ведёт на IP-адрес, а не на сайт. Переходите, только если уверены в источнике.';
                else if (u.username) wmsg = 'В адресе есть логин перед знаком @: так часто маскируют чужой сайт. Смотрите, что стоит после @.';
                else if (SHORT.test(u.hostname)) wmsg = 'Это сокращённая ссылка: конечный сайт неизвестен до перехода.';
            } catch (e) { /* пусто */ }
        } else { open.hidden = true; open.removeAttribute('href'); }
        if (d.type === 'sbp' || d.type === 'epc' || d.type === 'crypto') wmsg = 'Это платёжные данные. Перед оплатой сверьте получателя и сумму в приложении банка или кошелька.';
        warn.hidden = !wmsg; warn.textContent = wmsg;
        $('#scanCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    $('#scanCopy').addEventListener('click', function () { F.copyText(lastScan).then(function () { toast('Скопировано'); }).catch(function () { toast('Не удалось скопировать'); }); });
    $('#scanEdit').addEventListener('click', function () {
        var isUrl = /^https?:\/\//i.test(lastScan); state.type = isUrl ? 'url' : 'text';
        state.vals[state.type] = isUrl ? Object.assign(C.defaults('url'), { url: lastScan }) : { text: lastScan };
        renderTypes(); renderFields(); setMode('create'); update();
    });

    /* ---------------- история ---------------- */
    var TYPE_NAME = {}; C.types.forEach(function (t) { TYPE_NAME[t.id] = t.label; });
    function renderHist() {
        var ul = $('#histList'), list = LS.get('qr.hist') || []; ul.textContent = '';
        $('#histOn').checked = !LS.get('qr.hist.off'); $('#histClear').hidden = !list.length;
        if (!list.length) ul.appendChild(h('li', {}, [h('span', {}), h('span', { class: 't2', text: 'Пока пусто. Скачанные и скопированные коды появятся здесь.' })]));
        list.forEach(function (e, i) {
            var th = h('div', { class: 'th' }), r = R.build(e.text, e.style); if (!r.error) th.appendChild(svgNode(r.svgAt(64)));
            var secret = e.type === 'wifi' || e.type === 'otp' || e.type === 'sbp' || e.type === 'crypto';
            var info = h('div', {}, [h('div', { class: 't1', text: (TYPE_NAME[e.type] || 'Текст') + ' · ' + new Date(e.ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }), h('div', { class: 't2', text: secret ? 'Содержимое скрыто, откройте, чтобы посмотреть' : e.text.slice(0, 90) })]);
            var open = h('button', { type: 'button', class: 'b', text: 'Открыть' }), del = h('button', { type: 'button', class: 'b', text: 'Удалить' });
            open.addEventListener('click', function () { state.type = e.type; state.vals[e.type] = Object.assign(C.defaults(e.type), e.vals); state.style = R.merge(R.DEFAULTS, e.style); renderTypes(); renderFields(); syncControls(); setMode('create'); update(); });
            del.addEventListener('click', function () { list.splice(i, 1); LS.set('qr.hist', list); renderHist(); });
            ul.appendChild(h('li', {}, [th, info, h('div', { class: 'acts' }, [open, del])]));
        });
    }
    $('#histClear').addEventListener('click', function () { LS.set('qr.hist', []); renderHist(); });
    $('#histOn').addEventListener('change', function () { LS.set('qr.hist.off', !this.checked); if (!this.checked) LS.set('qr.hist', []); renderHist(); });

    /* ---------------- старт ---------------- */
    renderTypes(); renderFields(); renderChoices(); renderPalettes(); renderPresets(); bindControls(); syncControls(); update();
    window.addEventListener('pagehide', camStop);
})();
