/* Анимированный QR: сцена-фон + «живые» модули. Кадры считаются на canvas, экспорт в GIF и видео. */
(function () {
    'use strict';
    var R = window.QRRender, TAU = Math.PI * 2;

    var DEFAULTS = { on: false, effect: 'flow', bg: 'aurora', c1: '#0b2a3a', c2: '#1f7a8c', c3: '#8fe0b0', glyph: '✦', dim: 0.35, dur: 4, aspect: 'square', pad: 0.14, caption: '', capColor: '#ffffff', fx: '#d6336c' };
    var EFFECTS = [['static', 'Без движения'], ['flow', 'Течение цвета'], ['wave', 'Волны'], ['rainbow', 'Радуга'], ['pulse', 'Круги от центра'], ['scan', 'Луч сканера'], ['sparkle', 'Искры']];
    var BGS = [['solid', 'Цвет'], ['gradient', 'Вращающийся градиент'], ['aurora', 'Северное сияние'], ['pattern', 'Узор из символов'], ['image', 'Своя картинка']];

    function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function rgba(hex, a) { hex = R.hex(hex); return 'rgba(' + parseInt(hex.substr(1, 2), 16) + ',' + parseInt(hex.substr(3, 2), 16) + ',' + parseInt(hex.substr(5, 2), 16) + ',' + a + ')'; }
    function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    /* ---------- сцена ---------- */
    // Узор из символов рисуется один раз на «лист», дальше кадры лишь сдвигают его.
    function makeSheet(W, H, A) {
        var T = W / 5.5, D = Math.hypot(W, H), n = Math.ceil(D / T) + 2, S = Math.round((2 * n + 4) * T), c = document.createElement('canvas'), g, i, j;
        c.width = S; c.height = S; g = c.getContext('2d');
        g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 ' + Math.round(T * 0.5) + 'px Onest, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        var gl = String(A.glyph || '✦').slice(0, 2);
        for (j = -n - 1; j <= n + 1; j++) for (i = -n - 1; i <= n + 1; i++) g.fillText(gl, S / 2 + i * T + (j & 1 ? T / 2 : 0) - T / 2, S / 2 + j * T);
        return { cv: c, T: T, S: S, glyph: A.glyph };
    }
    function scene(g, W, H, t, A, img, P) {
        var m = A.bg, ph = t * TAU, D = Math.hypot(W, H);
        g.globalAlpha = 1; g.fillStyle = R.hex(A.c1); g.fillRect(0, 0, W, H);
        if (m === 'gradient') {
            var gr = g.createLinearGradient(W / 2 - Math.cos(ph) * D / 2, H / 2 - Math.sin(ph) * D / 2, W / 2 + Math.cos(ph) * D / 2, H / 2 + Math.sin(ph) * D / 2);
            gr.addColorStop(0, R.hex(A.c1)); gr.addColorStop(0.5, R.hex(A.c2)); gr.addColorStop(1, R.hex(A.c3)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        } else if (m === 'aurora') {
            var cols = [A.c2, A.c3, A.c2], k;
            for (k = 0; k < 3; k++) {
                var cx = W * (0.5 + 0.38 * Math.cos(ph + k * 2.1)), cy = H * (0.5 + 0.34 * Math.sin(ph * (k % 2 ? 1 : -1) + k * 1.7)), r = Math.max(W, H) * 0.62;
                var rg = g.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, rgba(cols[k], 0.9)); rg.addColorStop(1, rgba(cols[k], 0));
                g.fillStyle = rg; g.fillRect(0, 0, W, H);
            }
        } else if (m === 'pattern' && P && P.sheet) {
            var bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, R.hex(A.c1)); bg.addColorStop(1, R.hex(A.c2)); g.fillStyle = bg; g.fillRect(0, 0, W, H);
            g.save(); g.translate(W / 2, H / 2); g.rotate(-0.26); g.globalAlpha = 0.28; g.drawImage(P.sheet.cv, -P.sheet.S / 2 + t * P.sheet.T, -P.sheet.S / 2); g.restore(); g.globalAlpha = 1;
        } else if (m === 'image' && img) {
            var z = 1.1 + 0.05 * Math.sin(ph), sc = Math.max(W / img.width, H / img.height) * z, iw = img.width * sc, ih = img.height * sc;
            g.drawImage(img, (W - iw) / 2 + Math.sin(ph) * W * 0.02, (H - ih) / 2 + Math.cos(ph) * H * 0.012, iw, ih);
            g.fillStyle = 'rgba(0,0,0,' + A.dim + ')'; g.fillRect(0, 0, W, H);
        }
    }

    /* ---------- движение цвета в модулях ---------- */
    function strips(g, Q, t, stops, repeats, ang, still) {
        var D = Q * 1.5, P = D / repeats, off = still ? 0 : t * P, k;
        g.save(); g.translate(Q / 2, Q / 2); g.rotate(ang);
        for (k = still ? 0 : -1; k <= (still ? 0 : repeats + 1); k++) {
            var x0 = -D / 2 + k * P + off, gr = g.createLinearGradient(x0, 0, x0 + (still ? D : P), 0);
            stops.forEach(function (s, i) { gr.addColorStop(i / (stops.length - 1), s); });
            g.fillStyle = gr; g.fillRect(x0 - 1, -D / 2, (still ? D : P) + 2, D);
        }
        g.restore();
    }
    function sparkSprite(color) {
        var c = document.createElement('canvas'); c.width = c.height = 48; var g = c.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
        gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); return c;
    }
    var SPARKS = (function () { var rnd = rng(11), a = [], i; for (i = 0; i < 50; i++) a.push({ x: rnd(), y: rnd(), f: rnd(), r: 0.008 + rnd() * 0.02 }); return a; })();
    function paintFx(g, Q, t, S, A, P) {
        var c1 = R.hex(S.fg), c2 = S.grad !== 'none' ? R.hex(S.fg2) : c1, ang = (Number(S.angle) || 0) * Math.PI / 180, e = A.effect, fx = R.hex(A.fx);
        g.clearRect(0, 0, Q, Q); g.globalAlpha = 1;
        if (e === 'flow') return strips(g, Q, t, [c1, c2, c1], 1, ang);
        if (e === 'wave') return strips(g, Q, t, [c1, c2, c1], 3, Math.PI / 4);
        if (e === 'rainbow') { var st = []; for (var i = 0; i <= 6; i++) st.push('hsl(' + (i * 60) + ',78%,36%)'); return strips(g, Q, t, st, 1, ang); }
        strips(g, Q, t, [c1, c2], 1, ang, true);
        if (e === 'pulse') {
            [0, 0.5].forEach(function (d) {
                var r = ((t + d) % 1) * Q * 0.8, w = Q * 0.07, r0 = Math.max(0, r - w), gr = g.createRadialGradient(Q / 2, Q / 2, r0, Q / 2, Q / 2, r + w);
                gr.addColorStop(0, rgba(fx, 0)); gr.addColorStop(0.5, rgba(fx, 1)); gr.addColorStop(1, rgba(fx, 0)); g.fillStyle = gr; g.fillRect(0, 0, Q, Q);
            });
        } else if (e === 'scan') {
            var bw = Q * 0.14, y = t * (Q + bw) - bw, gr2 = g.createLinearGradient(0, y, 0, y + bw);
            gr2.addColorStop(0, rgba(fx, 0)); gr2.addColorStop(0.5, rgba(fx, 1)); gr2.addColorStop(1, rgba(fx, 0)); g.fillStyle = gr2; g.fillRect(0, y, Q, bw);
        } else if (e === 'sparkle' && P && P.spark) {
            SPARKS.forEach(function (s) {
                var a = Math.pow(Math.max(0, Math.sin(TAU * (t + s.f))), 6); if (a < 0.02) return;
                var r = Q * s.r * 2.2; g.globalAlpha = a; g.drawImage(P.spark, s.x * Q - r, s.y * Q - r, r * 2, r * 2);
            });
            g.globalAlpha = 1;
        }
    }

    /* ---------- подготовка слоёв и кадр ---------- */
    function prepare(text, style, A, W, img) {
        var H = A.aspect === 'story' ? Math.round(W * 16 / 9) : W, Q = Math.round(W * (1 - 2 * Math.max(0.05, Math.min(0.3, A.pad))));
        var mres = R.build(text, R.merge(style, { _layer: 'mask' }));
        if (mres.error) return Promise.reject(new Error(mres.error));
        var hasLogo = style.logo && style.logo.type !== 'none' && (style.logo.type !== 'image' || /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+\/=]+$/.test(String(style.logo.data || '')));
        var lres = hasLogo ? R.build(text, R.merge(style, { _layer: 'logo' })) : null;
        return Promise.all([R.raster(mres, Q, 'canvas-alpha'), lres ? R.raster(lres, Q, 'canvas-alpha') : null]).then(function (r) {
            var tmp = document.createElement('canvas'); tmp.width = Q; tmp.height = Q;
            var panel = style.transparent ? '#ffffff' : R.hex(style.bg);
            var capH = A.caption ? W * 0.12 : 0, qx = Math.round((W - Q) / 2), qy = Math.round((H - Q - capH) / 2), rad = Q * 0.07;
            var P = { W: W, H: H, Q: Q, mask: r[0], logo: r[1], tmp: tmp, style: style, A: A, img: img || null, panel: panel, qx: qx, qy: qy, rad: rad };
            // тень панели и подпись рисуются один раз, а не в каждом кадре
            var sh = document.createElement('canvas'); sh.width = W; sh.height = H; var sg = sh.getContext('2d');
            sg.shadowColor = 'rgba(0,0,0,0.35)'; sg.shadowBlur = W * 0.05; sg.shadowOffsetX = W; sg.shadowOffsetY = W * 0.012; sg.fillStyle = '#000'; rrect(sg, qx - W, qy, Q, Q, rad); sg.fill(); P.shadow = sh;
            if (A.caption) {
                var fs = Math.round(W * 0.05), cc = document.createElement('canvas'); cc.width = W; cc.height = Math.round(capH + fs); var cg = cc.getContext('2d');
                cg.font = '700 ' + fs + 'px Onest, Arial, sans-serif'; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillStyle = R.hex(A.capColor);
                cg.shadowColor = 'rgba(0,0,0,0.35)'; cg.shadowBlur = fs * 0.4; cg.fillText(String(A.caption).slice(0, 32), W / 2, capH * 0.55); P.cap = cc;
            }
            if (A.bg === 'pattern') P.sheet = makeSheet(W, H, A);
            if (A.effect === 'sparkle') P.spark = sparkSprite(A.fx);
            return P;
        });
    }
    function draw(g, t, P) {
        var A = P.A, W = P.W, H = P.H, Q = P.Q, qx = P.qx, qy = P.qy, rad = P.rad;
        scene(g, W, H, t, A, P.img, P);
        g.drawImage(P.shadow, 0, 0);
        g.fillStyle = P.panel; rrect(g, qx, qy, Q, Q, rad); g.fill();
        var tg = P.tmp.getContext('2d'); paintFx(tg, Q, t, P.style, A, P); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(P.mask, 0, 0); tg.globalCompositeOperation = 'source-over';
        g.save(); rrect(g, qx, qy, Q, Q, rad); g.clip(); g.drawImage(P.tmp, qx, qy); if (P.logo) g.drawImage(P.logo, qx, qy); g.restore();
        if (P.cap) g.drawImage(P.cap, 0, qy + Q);
    }

    /* ---------- проигрыватель: 30 кадров/с, стоит вне экрана и в фоновой вкладке ---------- */
    function player(cv, P) {
        cv.width = P.W; cv.height = P.H; var g = cv.getContext('2d'), raf = 0, start = performance.now(), last = 0, onScreen = true, io = null;
        var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        if ('IntersectionObserver' in window) { io = new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; }); io.observe(cv); }
        function frame(now) {
            raf = requestAnimationFrame(frame);
            if (!onScreen || now - last < 32) return; last = now;
            draw(g, still ? 0 : ((now - start) / (P.A.dur * 1000)) % 1, P);
        }
        draw(g, 0, P); raf = requestAnimationFrame(frame);
        return { stop: function () { cancelAnimationFrame(raf); if (io) io.disconnect(); } };
    }

    /* ---------- проверка кадров (в фоне, не блокирует ввод) ---------- */
    function verify(P, text, isStale) {
        var cv = document.createElement('canvas'); cv.width = P.W; cv.height = P.H; var g = cv.getContext('2d', { willReadFrequently: true }), N = 4, ok = 0, i = 0;
        return new Promise(function (resolve) {
            (function next() {
                if (isStale && isStale()) return resolve(null);
                if (i >= N) return resolve({ ok: ok, total: N });
                draw(g, i / N, P); i++;
                R.decodeCanvasAsync(cv).then(function (t) { if (t === text) ok++; setTimeout(next, 0); });
            })();
        });
    }

    /* ---------- GIF ---------- */
    function medianCut(px, n) {
        var boxes = [px];
        while (boxes.length < n) {
            var bi = -1, bs = 0, i;
            for (i = 0; i < boxes.length; i++) if (boxes[i].length > 1 && boxes[i].length > bs) { bs = boxes[i].length; bi = i; }
            if (bi < 0) break;
            var b = boxes[bi], mn = [255, 255, 255], mx = [0, 0, 0], c;
            b.forEach(function (p) { for (c = 0; c < 3; c++) { if (p[c] < mn[c]) mn[c] = p[c]; if (p[c] > mx[c]) mx[c] = p[c]; } });
            var ch = 0, best = -1; for (c = 0; c < 3; c++) if (mx[c] - mn[c] > best) { best = mx[c] - mn[c]; ch = c; }
            b.sort(function (a, d) { return a[ch] - d[ch]; }); var mid = b.length >> 1;
            boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
        }
        return boxes.map(function (b) { var s = [0, 0, 0]; b.forEach(function (p) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }); return [Math.round(s[0] / b.length), Math.round(s[1] / b.length), Math.round(s[2] / b.length)]; });
    }
    function lzw(idx, out) {
        var CLEAR = 256, EOI = 257, size = 9, next = 258, dict = new Map(), cur = 0, bits = 0, buf = [], sub = [];
        function put(code) {
            cur |= code << bits; bits += size;
            while (bits >= 8) { sub.push(cur & 255); cur >>= 8; bits -= 8; if (sub.length === 255) { out.push(255); for (var i = 0; i < 255; i++) out.push(sub[i]); sub = []; } }
        }
        put(CLEAR); var prefix = idx[0], k, n = idx.length, key, hit;
        for (var i = 1; i < n; i++) {
            k = idx[i]; key = prefix * 256 + k; hit = dict.get(key);
            if (hit !== undefined) { prefix = hit; continue; }
            put(prefix);
            if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
            else { put(CLEAR); dict.clear(); next = 258; size = 9; }
            prefix = k;
        }
        put(prefix); put(EOI);
        if (bits > 0) { sub.push(cur & 255); }
        if (sub.length) { out.push(sub.length); for (var j = 0; j < sub.length; j++) out.push(sub[j]); }
        out.push(0);
    }
    function gif(P, fps, onProgress) {
        var N = Math.max(8, Math.min(120, Math.round(P.A.dur * fps))), cv = document.createElement('canvas'); cv.width = P.W; cv.height = P.H;
        var g = cv.getContext('2d', { willReadFrequently: true }), frames = [], i;
        return new Promise(function (resolve, reject) {
            var step = 0;
            function render() {
                try {
                    var t0 = performance.now();
                    while (step < N && performance.now() - t0 < 40) { draw(g, step / N, P); frames.push(g.getImageData(0, 0, P.W, P.H).data); step++; }
                    onProgress && onProgress(step / N * 0.7);
                    if (step < N) return setTimeout(render, 0);
                    setTimeout(encode, 0);
                } catch (e) { reject(e); }
            }
            function encode() {
                try {
                    var samples = [], f, p, d;
                    for (f = 0; f < N; f += Math.max(1, Math.floor(N / 8))) { d = frames[f]; for (p = 0; p < d.length; p += 4 * 37) samples.push([d[p], d[p + 1], d[p + 2]]); }
                    var pal = medianCut(samples, 256); while (pal.length < 256) pal.push([0, 0, 0]);
                    var cache = new Int16Array(262144).fill(-1);
                    function near(r, gg, b) {
                        var key = (r >> 2) << 12 | (gg >> 2) << 6 | (b >> 2), v = cache[key]; if (v >= 0) return v;
                        var best = 0, bd = 1e9, j, dr, dg, db, dd; for (j = 0; j < 256; j++) { dr = pal[j][0] - r; dg = pal[j][1] - gg; db = pal[j][2] - b; dd = dr * dr * 3 + dg * dg * 4 + db * db * 2; if (dd < bd) { bd = dd; best = j; } }
                        return (cache[key] = best);
                    }
                    var out = [], w = P.W, h = P.H, delay = Math.max(2, Math.round(100 / fps)), asc = function (s) { for (var q = 0; q < s.length; q++) out.push(s.charCodeAt(q)); };
                    asc('GIF89a'); out.push(w & 255, w >> 8, h & 255, h >> 8, 0xF7, 0, 0); pal.forEach(function (c) { out.push(c[0], c[1], c[2]); });
                    out.push(0x21, 0xFF, 11); asc('NETSCAPE2.0'); out.push(3, 1, 0, 0, 0);
                    var fi = 0;
                    (function next() {
                        var t0 = performance.now();
                        while (fi < N && performance.now() - t0 < 40) {
                            var data = frames[fi], idx = new Uint8Array(w * h), q;
                            for (q = 0; q < w * h; q++) idx[q] = near(data[q * 4], data[q * 4 + 1], data[q * 4 + 2]);
                            out.push(0x21, 0xF9, 4, 0x04, delay & 255, delay >> 8, 0, 0, 0x2C, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0, 8);
                            lzw(idx, out); frames[fi] = null; fi++;
                        }
                        onProgress && onProgress(0.7 + fi / N * 0.3);
                        if (fi < N) return setTimeout(next, 0);
                        out.push(0x3B); resolve(new Blob([new Uint8Array(out)], { type: 'image/gif' }));
                    })();
                } catch (e) { reject(e); }
            }
            render();
        });
    }

    /* ---------- видео ---------- */
    function videoMime() {
        if (!window.MediaRecorder) return null;
        var list = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
        return null;
    }
    function video(P, onProgress) {
        var mime = videoMime(); if (!mime) return Promise.reject(new Error('Браузер не умеет записывать видео. Сохраните GIF.'));
        var cv = document.createElement('canvas'); cv.width = P.W; cv.height = P.H; var g = cv.getContext('2d');
        var loops = Math.max(1, Math.round(6 / P.A.dur)), total = loops * P.A.dur * 1000, chunks = [];
        draw(g, 0, P);
        var rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime, videoBitsPerSecond: 6000000 });
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        return new Promise(function (resolve, reject) {
            var start = 0, raf = 0;
            rec.onstop = function () { cancelAnimationFrame(raf); resolve({ blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: /mp4/.test(mime) ? 'mp4' : 'webm' }); };
            rec.onerror = function (e) { reject(e.error || new Error('Запись не удалась')); };
            rec.start();
            function loop(now) {
                if (!start) start = now; var el = now - start;
                draw(g, (el / (P.A.dur * 1000)) % 1, P); onProgress && onProgress(Math.min(1, el / total));
                if (el >= total) { rec.stop(); return; } raf = requestAnimationFrame(loop);
            }
            raf = requestAnimationFrame(loop);
        });
    }

    window.QRAnim = { DEFAULTS: DEFAULTS, EFFECTS: EFFECTS, BGS: BGS, prepare: prepare, draw: draw, player: player, verify: verify, gif: gif, video: video, videoMime: videoMime };
})();
