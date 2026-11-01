/* Интерактивные 3D-модели для главной страницы.
 * Чистый Canvas 2D: без библиотек, без eval, без внешних запросов (CSP script-src 'self').
 * Перетаскивание мышью/пальцем, стрелки клавиатуры, пауза вне экрана, prefers-reduced-motion. */
(function () {
    'use strict';

    var canvas = document.getElementById('hero3d');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-model]'));
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var CAM = 4;

    /* ---------- геометрия ---------- */
    function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

    function edgesByDist(v, d) {
        var e = [], i, j;
        for (i = 0; i < v.length; i++) {
            for (j = i + 1; j < v.length; j++) {
                if (Math.abs(dist(v[i], v[j]) - d) < 0.01) e.push([i, j]);
            }
        }
        return e;
    }

    function scaleTo(v, r) {
        return v.map(function (p) {
            var l = Math.hypot(p[0], p[1], p[2]);
            return [p[0] / l * r, p[1] / l * r, p[2] / l * r];
        });
    }

    function octahedron(r) {
        var v = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]];
        return { v: v, e: edgesByDist(v, r * Math.SQRT2), core: true, dots: true };
    }

    function prism() {
        var v = [], e = [], i, a, n = 6;
        for (i = 0; i < n; i++) { a = Math.PI / 3 * i + Math.PI / 6; v.push([Math.cos(a), 0.78, Math.sin(a)]); }
        for (i = 0; i < n; i++) { a = Math.PI / 3 * i + Math.PI / 6; v.push([Math.cos(a), -0.78, Math.sin(a)]); }
        for (i = 0; i < n; i++) {
            e.push([i, (i + 1) % n]);
            e.push([n + i, n + (i + 1) % n]);
            e.push([i, n + i]);
        }
        return [{ v: v, e: e, dots: true }, octahedron(0.4)];
    }

    function icosahedron() {
        var p = (1 + Math.sqrt(5)) / 2, raw = [], s1, s2;
        [-1, 1].forEach(function (a) {
            [-1, 1].forEach(function (b) {
                raw.push([0, a, b * p], [a, b * p, 0], [b * p, 0, a]);
            });
        });
        var e = edgesByDist(raw, 2);
        return [{ v: scaleTo(raw, 1.2), e: e, dots: true }, octahedron(0.34)];
    }

    function torus() {
        var N = 20, M = 10, R = 0.82, r = 0.34, v = [], e = [], i, j, u, w;
        for (i = 0; i < N; i++) {
            u = i / N * Math.PI * 2;
            for (j = 0; j < M; j++) {
                w = j / M * Math.PI * 2;
                v.push([(R + r * Math.cos(w)) * Math.cos(u), r * Math.sin(w), (R + r * Math.cos(w)) * Math.sin(u)]);
                e.push([i * M + j, i * M + (j + 1) % M]);
                e.push([i * M + j, ((i + 1) % N) * M + j]);
            }
        }
        return [{ v: v, e: e, dots: false }];
    }

    var MODELS = { prism: prism(), ico: icosahedron(), torus: torus() };
    var LABELS = {
        prism: '3D-модель: шестигранная призма с ядром',
        ico: '3D-модель: икосаэдр с ядром',
        torus: '3D-модель: тор'
    };

    /* облако точек вокруг модели (сфера Фибоначчи) */
    var stars = (function () {
        var out = [], n = 40, i, y, rad, th;
        for (i = 0; i < n; i++) {
            y = 1 - (i / (n - 1)) * 2;
            rad = Math.sqrt(1 - y * y);
            th = i * 2.399963;
            out.push([Math.cos(th) * rad * 1.9, y * 1.9, Math.sin(th) * rad * 1.9]);
        }
        return out;
    })();

    /* ---------- состояние ---------- */
    var W = 300, H = 300, S = 80;
    var yaw = 0.6, pitch = 0.4, vyaw = 0;
    var dragging = false, lx = 0, ly = 0;
    var current = 'prism', switchedAt = 0;
    var fg = [255, 255, 255], ac = [204, 255, 0];
    var visible = true, raf = 0, fade = 0;

    function parseHex(s, d) {
        var m = /^#([0-9a-f]{6})$/i.exec((s || '').trim());
        if (!m) return d;
        var n = parseInt(m[1], 16);
        return [n >> 16, (n >> 8) & 255, n & 255];
    }

    function readColors() {
        var cs = getComputedStyle(document.documentElement);
        fg = parseHex(cs.getPropertyValue('--text-main'), [255, 255, 255]);
        ac = parseHex(cs.getPropertyValue('--accent'), [204, 255, 0]);
    }

    function rgba(c, a) {
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
    }

    function rot(p, yw, pt, sc) {
        var cy = Math.cos(yw), sy = Math.sin(yw), cx = Math.cos(pt), sx = Math.sin(pt);
        var x = p[0] * cy + p[2] * sy;
        var z = -p[0] * sy + p[2] * cy;
        var y = p[1] * cx - z * sx;
        z = p[1] * sx + z * cx;
        var k = CAM / (CAM + z) * S * sc;
        return [W / 2 + x * k, H / 2 - y * k, z];
    }

    function resize() {
        var r = canvas.getBoundingClientRect();
        var d = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, Math.round(r.width));
        H = Math.max(1, Math.round(r.height));
        S = Math.min(W, H) * 0.3;
        canvas.width = Math.round(W * d);
        canvas.height = Math.round(H * d);
        ctx.setTransform(d, 0, 0, d, 0, 0);
        kick();
    }

    /* ---------- отрисовка ---------- */
    function draw(now) {
        if (!dragging) {
            yaw += (reduce ? 0 : 0.006) + vyaw;
            vyaw *= 0.94;
            if (!reduce) pitch += (0.4 - pitch) * 0.02;
        }
        var f = Math.min(1, (now - switchedAt) / 450);
        fade = f;
        var e = f * f * (3 - 2 * f);
        var sc = 0.88 + 0.12 * e;

        ctx.clearRect(0, 0, W, H);
        ctx.lineCap = 'round';

        /* частицы */
        var i, p, a;
        for (i = 0; i < stars.length; i++) {
            p = rot(stars[i], yaw * 0.4, 0.5, sc);
            a = (0.5 - p[2] / 4) * 0.5 * e;
            ctx.fillStyle = rgba(fg, a);
            ctx.fillRect(p[0], p[1], 1.4, 1.4);
        }

        /* модель */
        MODELS[current].forEach(function (part) {
            var pts = part.v.map(function (q) { return rot(q, yaw, pitch, sc); });
            var col = part.core ? ac : fg;
            ctx.lineWidth = part.core ? 1.6 : 1.2;
            part.e.forEach(function (ed) {
                var A = pts[ed[0]], B = pts[ed[1]];
                var z = (A[2] + B[2]) / 2;
                var depth = 1 - (z + 1.3) / 2.6;
                ctx.strokeStyle = rgba(col, (0.22 + 0.7 * depth) * e);
                ctx.beginPath();
                ctx.moveTo(A[0], A[1]);
                ctx.lineTo(B[0], B[1]);
                ctx.stroke();
            });
            if (part.dots) {
                pts.forEach(function (q) {
                    var depth = 1 - (q[2] + 1.3) / 2.6;
                    ctx.fillStyle = rgba(ac, (0.35 + 0.65 * depth) * e);
                    ctx.beginPath();
                    ctx.arc(q[0], q[1], 1.2 + 1.8 * depth, 0, 6.2832);
                    ctx.fill();
                });
            }
        });
    }

    function shouldRun() {
        return visible && !document.hidden &&
            (!reduce || dragging || fade < 1 || Math.abs(vyaw) > 0.0005);
    }

    function loop(now) {
        raf = 0;
        draw(now);
        if (shouldRun()) raf = requestAnimationFrame(loop);
    }

    function kick() {
        if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
    }

    /* ---------- управление ---------- */
    function setModel(name) {
        if (!MODELS[name]) return;
        current = name;
        switchedAt = performance.now();
        fade = 0;
        canvas.setAttribute('aria-label', LABELS[name] + '. Потяните или используйте стрелки, чтобы повернуть');
        buttons.forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-model') === name));
        });
        kick();
    }

    buttons.forEach(function (b) {
        b.hidden = false;
        b.addEventListener('click', function () { setModel(b.getAttribute('data-model')); });
    });
    var hint = document.querySelector('.stage-hint');
    if (hint) hint.hidden = false;

    canvas.addEventListener('pointerdown', function (ev) {
        dragging = true; lx = ev.clientX; ly = ev.clientY;
        try { canvas.setPointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
        canvas.classList.add('grabbing');
        kick();
    });
    canvas.addEventListener('pointermove', function (ev) {
        if (!dragging) return;
        var dx = ev.clientX - lx, dy = ev.clientY - ly;
        lx = ev.clientX; ly = ev.clientY;
        yaw += dx * 0.01; vyaw = dx * 0.01;
        pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * 0.01));
        kick();
    });
    function endDrag() { dragging = false; canvas.classList.remove('grabbing'); kick(); }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    canvas.addEventListener('keydown', function (ev) {
        var used = true;
        if (ev.key === 'ArrowLeft') vyaw -= 0.05;
        else if (ev.key === 'ArrowRight') vyaw += 0.05;
        else if (ev.key === 'ArrowUp') pitch = Math.max(-1.2, pitch - 0.15);
        else if (ev.key === 'ArrowDown') pitch = Math.min(1.2, pitch + 0.15);
        else used = false;
        if (used) { ev.preventDefault(); kick(); }
    });

    /* ---------- жизненный цикл ---------- */
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            if (visible) kick();
        }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    if ('MutationObserver' in window) {
        new MutationObserver(function () { readColors(); kick(); })
            .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    readColors();
    resize();
    setModel('prism');
})();
