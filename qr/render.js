/* Движок QR: матрица -> SVG (единый источник) -> PNG/JPG/WebP, проверка читаемости.
 * Формы модулей, глаза, градиенты, логотип, рамка с подписью. Всё локально. */
(function () {
    'use strict';

    var f = function (n) { return String(+n.toFixed(3)); };
    var xml = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    var ICONS = {
        link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
        wifi: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z',
        mail: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
        phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
        pin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
        star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
        cart: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0020 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z'
    };
    var ICON_NAMES = { link: 'Ссылка', wifi: 'Wi‑Fi', mail: 'Почта', phone: 'Телефон', pin: 'Метка', heart: 'Сердце', star: 'Звезда', cart: 'Корзина' };

    var BODY = [['square', 'Квадраты'], ['rounded', 'Мягкие'], ['dots', 'Точки'], ['diamond', 'Ромбы'], ['classy', 'Классика'], ['small', 'Мелкие'], ['vbars', 'Столбики'], ['hbars', 'Полосы']];
    var FRAME = [['square', 'Квадрат'], ['rounded', 'Скруглённый'], ['circle', 'Круг'], ['leaf', 'Лист']];
    var BALL = [['square', 'Квадрат'], ['rounded', 'Скруглённый'], ['circle', 'Круг'], ['diamond', 'Ромб'], ['leaf', 'Лист']];
    var FRAMES = [['none', 'Без рамки'], ['border', 'Рамка'], ['bottom', 'Подпись снизу'], ['top', 'Подпись сверху']];

    var DEFAULTS = {
        ecl: 'M', margin: 4, body: 'square', eyeFrame: 'square', eyeBall: 'square',
        fg: '#000000', fg2: '#000000', grad: 'none', angle: 45,
        bg: '#ffffff', transparent: false, bgRadius: 0,
        eyeFrameColor: '', eyeBallColor: '',
        logo: { type: 'none', icon: 'star', text: 'QR', data: '', size: 0.22, shape: 'rounded', color: '' },
        frame: 'none', frameText: 'СКАНИРУЙ МЕНЯ', frameColor: '#000000'
    };

    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function merge(a, b) {
        var r = clone(a); if (!b) return r;
        Object.keys(b).forEach(function (k) {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
            if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && r[k] && typeof r[k] === 'object') r[k] = merge(r[k], b[k]); else r[k] = b[k];
        });
        return r;
    }

    /* ---------- матрица ---------- */
    function encode(text, ecl) {
        var qr = qrcode(0, ecl || 'M');
        var mode = /^\d+$/.test(text) ? 'Numeric' : /^[0-9A-Z $%*+\-.\/:]+$/.test(text) ? 'Alphanumeric' : 'Byte';
        qr.addData(text, mode);
        qr.make();
        var n = qr.getModuleCount(), m = [];
        for (var r = 0; r < n; r++) { m[r] = []; for (var c = 0; c < n; c++) m[r][c] = qr.isDark(r, c) ? 1 : 0; }
        return { n: n, m: m, version: (n - 17) / 4 };
    }

    /* ---------- геометрия ---------- */
    function rr(x, y, w, h, tl, tr, br, bl) {
        return 'M' + f(x + tl) + ' ' + f(y) + 'h' + f(w - tl - tr) + (tr ? 'a' + f(tr) + ' ' + f(tr) + ' 0 0 1 ' + f(tr) + ' ' + f(tr) : '') +
            'v' + f(h - tr - br) + (br ? 'a' + f(br) + ' ' + f(br) + ' 0 0 1 ' + f(-br) + ' ' + f(br) : '') +
            'h' + f(-(w - br - bl)) + (bl ? 'a' + f(bl) + ' ' + f(bl) + ' 0 0 1 ' + f(-bl) + ' ' + f(-bl) : '') +
            'v' + f(-(h - bl - tl)) + (tl ? 'a' + f(tl) + ' ' + f(tl) + ' 0 0 1 ' + f(tl) + ' ' + f(-tl) : '') + 'z';
    }
    function circ(cx, cy, r) { return 'M' + f(cx - r) + ' ' + f(cy) + 'a' + f(r) + ' ' + f(r) + ' 0 1 0 ' + f(2 * r) + ' 0a' + f(r) + ' ' + f(r) + ' 0 1 0 ' + f(-2 * r) + ' 0z'; }
    function diamond(cx, cy, r) { return 'M' + f(cx) + ' ' + f(cy - r) + 'l' + f(r) + ' ' + f(r) + 'l' + f(-r) + ' ' + f(r) + 'l' + f(-r) + ' ' + f(-r) + 'z'; }

    // sharp: угол, остающийся острым ('tl','tr','bl'); r — радиус остальных
    function leaf(x, y, s, r, sharp) {
        return rr(x, y, s, s, sharp === 'tl' ? 0 : r, sharp === 'tr' ? 0 : r, sharp === 'br' ? 0 : r, sharp === 'bl' ? 0 : r);
    }

    function eyePaths(kind, ex, ey, which, frameShape, ballShape) {
        var sharp = which, fr, hole, ball;
        switch (frameShape) {
            case 'rounded': fr = rr(ex, ey, 7, 7, 2, 2, 2, 2); hole = rr(ex + 1, ey + 1, 5, 5, 1.2, 1.2, 1.2, 1.2); break;
            case 'circle': fr = circ(ex + 3.5, ey + 3.5, 3.5); hole = circ(ex + 3.5, ey + 3.5, 2.5); break;
            case 'leaf': fr = leaf(ex, ey, 7, 2.8, sharp); hole = leaf(ex + 1, ey + 1, 5, 1.7, sharp); break;
            default: fr = rr(ex, ey, 7, 7, 0, 0, 0, 0); hole = rr(ex + 1, ey + 1, 5, 5, 0, 0, 0, 0);
        }
        switch (ballShape) {
            case 'rounded': ball = rr(ex + 2, ey + 2, 3, 3, 0.8, 0.8, 0.8, 0.8); break;
            case 'circle': ball = circ(ex + 3.5, ey + 3.5, 1.5); break;
            case 'diamond': ball = diamond(ex + 3.5, ey + 3.5, 2.1); break;
            case 'leaf': ball = leaf(ex + 2, ey + 2, 3, 1.3, sharp); break;
            default: ball = rr(ex + 2, ey + 2, 3, 3, 0, 0, 0, 0);
        }
        return { frame: fr + hole, ball: ball };
    }

    // центры выравнивающих узоров (для версий 2..40); рисуются квадратами ради устойчивого чтения
    function alignCenters(n) {
        var v = (n - 17) / 4, out = [];
        if (v < 2) return out;
        var na = Math.floor(v / 7) + 2, last = 4 * v + 10, step = v === 32 ? 26 : Math.ceil((last - 6) / (na - 1) / 2) * 2, pos = [6], i;
        for (i = na - 2; i >= 0; i--) pos.push(last - i * step);
        pos.forEach(function (a) { pos.forEach(function (b) {
            if ((a === 6 && b === 6) || (a === 6 && b === last) || (a === last && b === 6)) return;
            out.push([a, b]);
        }); });
        return out;
    }

    function bodyPath(shape, M, n, skip) {
        var d = [], r, c;
        var dk = function (rr_, cc) { return rr_ >= 0 && cc >= 0 && rr_ < n && cc < n && M[rr_][cc] && !skip(rr_, cc); };
        if (shape === 'vbars' || shape === 'hbars') {
            var v = shape === 'vbars';
            for (var a = 0; a < n; a++) {
                var run = -1;
                for (var b = 0; b <= n; b++) {
                    var on = b < n && (v ? dk(b, a) : dk(a, b));
                    if (on && run < 0) run = b;
                    if (!on && run >= 0) {
                        var len = b - run;
                        d.push(v ? rr(a + 0.1, run, 0.8, len, 0.4, 0.4, 0.4, 0.4) : rr(run, a + 0.1, len, 0.8, 0.4, 0.4, 0.4, 0.4));
                        run = -1;
                    }
                }
            }
            return d.join('');
        }
        for (r = 0; r < n; r++) for (c = 0; c < n; c++) {
            if (!dk(r, c)) continue;
            switch (shape) {
                case 'rounded': {
                    var u = dk(r - 1, c), dn = dk(r + 1, c), l = dk(r, c - 1), rt = dk(r, c + 1), R = 0.5;
                    d.push(rr(c, r, 1, 1, !u && !l ? R : 0, !u && !rt ? R : 0, !dn && !rt ? R : 0, !dn && !l ? R : 0));
                    break;
                }
                case 'dots': d.push(circ(c + 0.5, r + 0.5, 0.5)); break;
                case 'diamond': d.push(diamond(c + 0.5, r + 0.5, 0.68)); break;
                case 'classy': d.push(rr(c, r, 1, 1, 0.5, 0, 0.5, 0)); break;
                case 'small': d.push(rr(c + 0.1, r + 0.1, 0.8, 0.8, 0, 0, 0, 0)); break;
                default: d.push('M' + c + ' ' + r + 'h1v1h-1z');
            }
        }
        return d.join('');
    }

    /* ---------- цвета ---------- */
    function hex(c) {
        c = String(c || '#000').trim();
        if (/^#[0-9a-f]{3}$/i.test(c)) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
        return /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : '#000000';
    }
    function lum(c) {
        c = hex(c);
        var a = [1, 3, 5].map(function (i) { var v = parseInt(c.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
    function onColor(c) { return lum(c) > 0.42 ? '#111111' : '#ffffff'; }

    /* ---------- сборка SVG ---------- */
    function build(text, options) {
        var o = merge(DEFAULTS, options), L = o.logo || {};
        var hasLogo = L.type && L.type !== 'none' && (L.type !== 'image' || /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+\/=]+$/.test(String(L.data || '')));
        var ecl = o.ecl;
        if (hasLogo && ecl !== 'H' && ecl !== 'Q') ecl = 'Q';
        if (hasLogo && Number(L.size) > 0.24) ecl = 'H';
        var q;
        try { q = encode(String(text), ecl); } catch (e) { return { error: 'Слишком много данных для QR-кода. Сократите текст или понизьте уровень коррекции.' }; }
        var n = q.n, mg = Math.max(0, Math.min(12, Number(o.margin) || 0)), side = n + 2 * mg;

        // область под логотипом
        var cells = 0, s0 = 0;
        if (hasLogo) {
            cells = Math.round(n * Math.max(0.1, Math.min(0.34, Number(L.size) || 0.22)));
            if ((n - cells) % 2) cells++;
            s0 = (n - cells) / 2;
        }
        var inLogo = function (r, c) { return hasLogo && r >= s0 && r < s0 + cells && c >= s0 && c < s0 + cells; };
        var aligns = alignCenters(n);
        var inAlign = function (r, c) { for (var i = 0; i < aligns.length; i++) if (Math.abs(r - aligns[i][0]) <= 2 && Math.abs(c - aligns[i][1]) <= 2) return true; return false; };
        var inEye = function (r, c) { return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7) || (o.body !== 'square' && inAlign(r, c)); };

        var fg = hex(o.fg), fg2 = hex(o.fg2), useGrad = o.grad === 'linear' || o.grad === 'radial';
        var layer = o._layer || ''; if (layer) o.frame = 'none'; if (layer === 'mask') useGrad = false;
        var defs = '', paint = fg;
        if (useGrad) {
            var cx = mg + n / 2, cy = mg + n / 2;
            if (o.grad === 'radial') {
                defs = '<radialGradient id="qg" gradientUnits="userSpaceOnUse" cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(n * 0.72) + '"><stop offset="0" stop-color="' + fg + '"/><stop offset="1" stop-color="' + fg2 + '"/></radialGradient>';
            } else {
                var a = (Number(o.angle) || 0) * Math.PI / 180, Lh = n / 2 * (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)));
                defs = '<linearGradient id="qg" gradientUnits="userSpaceOnUse" x1="' + f(cx - Math.cos(a) * Lh) + '" y1="' + f(cy - Math.sin(a) * Lh) + '" x2="' + f(cx + Math.cos(a) * Lh) + '" y2="' + f(cy + Math.sin(a) * Lh) + '"><stop offset="0" stop-color="' + fg + '"/><stop offset="1" stop-color="' + fg2 + '"/></linearGradient>';
            }
            paint = 'url(#qg)';
        }
        var frameFill = o.eyeFrameColor ? hex(o.eyeFrameColor) : paint;
        var ballFill = o.eyeBallColor ? hex(o.eyeBallColor) : paint;
        var bgc = o.transparent ? 'none' : hex(o.bg);
        var panelBg = o.transparent ? (o.frame !== 'none' ? '#ffffff' : 'none') : hex(o.bg);
        if (layer) panelBg = 'none';
        if (layer === 'mask') { paint = frameFill = ballFill = '#000000'; }

        // QR-часть в локальных координатах (0..side)
        var g = '';
        if (panelBg !== 'none') {
            var br = Math.max(0, Math.min(side / 2, Number(o.bgRadius) || 0));
            g += br ? '<rect width="' + side + '" height="' + side + '" rx="' + f(br) + '" fill="' + panelBg + '"/>' : '<rect width="' + side + '" height="' + side + '" fill="' + panelBg + '"/>';
        }
        g += '<g transform="translate(' + mg + ' ' + mg + ')">';
        var body = bodyPath(o.body, q.m, n, function (r, c) { return inEye(r, c) || inLogo(r, c); });
        if (body && layer !== 'logo') g += '<path fill="' + paint + '"' + (o.body === 'square' ? ' shape-rendering="crispEdges"' : '') + ' d="' + body + '"/>';
        var eyes = [[0, 0, 'tl'], [n - 7, 0, 'tr'], [0, n - 7, 'bl']];
        var fp = '', bp = '';
        eyes.forEach(function (e) { var p = eyePaths('', e[0], e[1], e[2], o.eyeFrame, o.eyeBall); fp += p.frame; bp += p.ball; });
        if (o.body !== 'square' && layer !== 'logo') {
            var ap = '';
            aligns.forEach(function (a) { var x = a[1] - 2, y = a[0] - 2; ap += rr(x, y, 5, 5, 0, 0, 0, 0) + rr(x + 1, y + 1, 3, 3, 0, 0, 0, 0) + rr(x + 2, y + 2, 1, 1, 0, 0, 0, 0); });
            if (ap) g += '<path fill="' + paint + '" fill-rule="evenodd" d="' + ap + '"/>';
        }
        if (layer !== 'logo') {
            g += '<path fill="' + frameFill + '" fill-rule="evenodd" d="' + fp + '"/>';
            g += '<path fill="' + ballFill + '" d="' + bp + '"/>';
        }

        if (hasLogo && layer !== 'mask') {
            var lx = s0, ly = s0, ls = cells, lc = L.color ? hex(L.color) : fg;
            var back = L.shape === 'none' ? '' : (L.shape === 'circle' ? circ(lx + ls / 2, ly + ls / 2, ls / 2) : L.shape === 'square' ? rr(lx, ly, ls, ls, 0, 0, 0, 0) : rr(lx, ly, ls, ls, ls * 0.22, ls * 0.22, ls * 0.22, ls * 0.22));
            if (back) g += '<path fill="' + (bgc === 'none' ? '#ffffff' : bgc) + '" d="' + back + '"/>';
            var inset = ls * (L.shape === 'circle' ? 0.2 : 0.12), ix = lx + inset, iy = ly + inset, is = ls - 2 * inset;
            if (L.type === 'image') g += '<image x="' + f(ix) + '" y="' + f(iy) + '" width="' + f(is) + '" height="' + f(is) + '" preserveAspectRatio="xMidYMid meet" href="' + xml(L.data) + '" xlink:href="' + xml(L.data) + '"/>';
            else if (L.type === 'icon' && ICONS[L.icon]) g += '<path fill="' + lc + '" transform="translate(' + f(ix) + ' ' + f(iy) + ') scale(' + f(is / 24) + ')" d="' + ICONS[L.icon] + '"/>';
            else if (L.type === 'text') {
                var t = String(L.text || '').slice(0, 4), fs = Math.min(is * 0.8, (is * 1.5) / Math.max(1, t.length * 0.9));
                g += '<text x="' + f(lx + ls / 2) + '" y="' + f(ly + ls / 2) + '" fill="' + lc + '" font-family="Onest,Arial,Helvetica,sans-serif" font-weight="800" font-size="' + f(fs) + '" text-anchor="middle" dominant-baseline="central">' + xml(t) + '</text>';
            }
        }
        g += '</g>';

        // рамка
        var W = side, H = side, out = '', fr = o.frame;
        if (fr && fr !== 'none') {
            var pad = Math.max(2, side * 0.07), lab = fr === 'border' ? 0 : Math.max(5, side * 0.17), fc = hex(o.frameColor), rad = pad * 1.7;
            W = side + 2 * pad; H = side + 2 * pad + lab;
            var top = fr === 'top' ? lab : 0;
            out += '<rect width="' + f(W) + '" height="' + f(H) + '" rx="' + f(rad) + '" fill="' + fc + '"/>';
            out += '<g transform="translate(' + f(pad) + ' ' + f(pad + top) + ')"><clipPath id="qc"><rect width="' + side + '" height="' + side + '" rx="' + f(rad * 0.6) + '"/></clipPath><g clip-path="url(#qc)">' + g + '</g></g>';
            if (lab) {
                var text = String(o.frameText || '').slice(0, 28), fs2 = Math.min(lab * 0.46, (W - 2 * pad) / Math.max(4, text.length * 0.62));
                var ty = fr === 'top' ? (lab + pad) / 2 : pad + side + (lab + pad) / 2 - pad * 0.0;
                if (fr === 'top') ty = (pad + lab) / 2; else ty = pad + side + (lab + pad) / 2;
                out += '<text x="' + f(W / 2) + '" y="' + f(ty) + '" fill="' + onColor(fc) + '" font-family="Onest,Arial,Helvetica,sans-serif" font-weight="800" font-size="' + f(fs2) + '" text-anchor="middle" dominant-baseline="central" letter-spacing="' + f(fs2 * 0.06) + '">' + xml(text) + '</text>';
            }
        } else out = g;

        var head = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + f(W) + ' ' + f(H) + '" width="__W__" height="__H__">';
        var inner = (defs ? '<defs>' + defs + '</defs>' : '') + out + '</svg>';
        var res = {
            n: n, version: q.version, w: W, h: H, ecl: ecl, error: '', options: o, text: text,
            svgAt: function (px) { px = Math.round(px); return (head + inner).replace('__W__', px).replace('__H__', Math.round(px * H / W)); }
        };
        res.svg = res.svgAt(512);
        res.contrast = Math.min(ratio(fg, panelBg === 'none' ? '#ffffff' : panelBg), useGrad ? ratio(fg2, panelBg === 'none' ? '#ffffff' : panelBg) : 99);
        res.inverted = lum(fg) > lum(panelBg === 'none' ? '#ffffff' : panelBg);
        return res;
    }

    /* ---------- растр ---------- */
    function raster(res, px, mime, quality) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(new Blob([res.svgAt(px)], { type: 'image/svg+xml;charset=utf-8' })), img = new Image();
            img.onload = function () {
                var w = Math.round(px), h = Math.round(px * res.h / res.w), cv = document.createElement('canvas');
                cv.width = w; cv.height = h;
                var ctx = cv.getContext('2d');
                if (mime && mime !== 'image/png' && mime !== 'canvas-alpha') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(url);
                if (mime === 'canvas' || mime === 'canvas-alpha') return resolve(cv);
                cv.toBlob(function (b) { b ? resolve(b) : reject(new Error('Не удалось сохранить изображение')); }, mime || 'image/png', quality || 0.92);
            };
            img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Не удалось отрисовать код')); };
            img.src = url;
        });
    }

    function syncDecode(d) { var q = window.jsQR && jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' }); return q ? q.data : null; }
    function decodeCanvas(cv) { var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height); return syncDecode(d); }

    // Чтение в отдельном потоке (Worker); если его нет, читаем здесь.
    var worker = null, wid = 0, pending = {};
    function getWorker() {
        if (worker !== null) return worker;
        try {
            worker = new Worker('qr/decode-worker.js');
            worker.onmessage = function (e) { var p = pending[e.data.id]; if (p) { delete pending[e.data.id]; p(e.data.text); } };
            worker.onerror = function () { worker = false; Object.keys(pending).forEach(function (k) { var p = pending[k]; delete pending[k]; p(undefined); }); };
        } catch (e) { worker = false; }
        return worker;
    }
    function decodeCanvasAsync(cv) {
        var d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height), w = getWorker();
        if (!w) return Promise.resolve(syncDecode(d));
        return new Promise(function (resolve) {
            var id = ++wid; pending[id] = function (t) { resolve(t === undefined ? syncDecode(d) : t); };
            w.postMessage({ id: id, buf: d.data.buffer, w: d.width, h: d.height });
        });
    }
    var nativeDet = null;
    function native() { if (nativeDet === null) { try { nativeDet = window.BarcodeDetector ? new BarcodeDetector({ formats: ['qr_code'] }) : false; } catch (e) { nativeDet = false; } } return nativeDet; }

    // Проверка читаемости: рисуем код и читаем так же, как камера. Идёт в фоне, при новом вводе прерывается (isStale).
    function readAt(res, px) {
        return raster(res, px, 'canvas').then(function (cv) {
            var back = document.createElement('canvas'); back.width = cv.width; back.height = cv.height;
            var x = back.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#ffffff'; x.fillRect(0, 0, back.width, back.height); x.drawImage(cv, 0, 0);
            return back;
        });
    }
    function verify(res0, isStale) {
        var res = res0.options.frame && res0.options.frame !== 'none' ? build(res0.text, merge(res0.options, { frame: 'none' })) : res0; // рамка читаемость модулей не меняет
        var side = res.n + 2 * (Number(res.options.margin) || 0), p1 = Math.max(280, Math.min(720, side * 7)), tries = [p1, Math.min(1000, Math.round(p1 * 1.5)), Math.min(1100, Math.round(p1 * 2.2))], got = null, stale = false;
        var chain = Promise.resolve();
        tries.forEach(function (px) {
            chain = chain.then(function () {
                if (got !== null || stale) return;
                if (isStale && isStale()) { stale = true; return; }
                return readAt(res, px).then(function (cv) {
                    if (isStale && isStale()) { stale = true; return; }
                    var nd = native(), first = nd ? nd.detect(cv).then(function (r) { return r[0] ? r[0].rawValue : null; }).catch(function () { return null; }) : Promise.resolve(null);
                    return first.then(function (t) { return t === res.text ? t : decodeCanvasAsync(cv); }).then(function (t) { if (t === res.text) got = t; });
                });
            });
        });
        return chain.then(function () {
            if (stale) return null;
            var notes = [];
            if (res.contrast < 3) notes.push('Низкий контраст (' + res.contrast.toFixed(1) + ':1): сделайте модули темнее или фон светлее.');
            else if (res.contrast < 4.5) notes.push('Контраст ниже рекомендуемого (' + res.contrast.toFixed(1) + ':1). При плохом освещении код может не читаться.');
            if (res.inverted) notes.push('Модули светлее фона: часть старых сканеров такие коды не читает.');
            if (res.options.logo && res.options.logo.type !== 'none' && res.options.logo.size > 0.28) notes.push('Крупный логотип: проверьте код на нескольких телефонах.');
            return { ok: got === res.text, decoded: got, notes: notes };
        });
    }

    window.QRRender = { build: build, raster: raster, verify: verify, decodeCanvas: decodeCanvas, decodeCanvasAsync: decodeCanvasAsync, encode: encode, DEFAULTS: DEFAULTS, merge: merge, clone: clone, ICONS: ICONS, ICON_NAMES: ICON_NAMES, BODY: BODY, FRAME: FRAME, BALL: BALL, FRAMES: FRAMES, ratio: ratio, hex: hex };
})();
