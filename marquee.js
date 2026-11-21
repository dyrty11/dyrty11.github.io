/* Лента карточек: едет сама, листается мышью и пальцем, останавливается при наведении.
 * Карточки идут ровной линией в скруглённом контейнере; радиус растёт к центру.
 * Без JS остаётся CSS-анимация. Вне экрана и при prefers-reduced-motion лента стоит. */
(function () {
    'use strict';
    var root = document.querySelector('.marquee');
    if (!root) return;
    var track = root.querySelector('.marquee-track');
    var group = track && track.querySelector('.marquee-group');
    var cards = track ? Array.prototype.slice.call(track.querySelectorAll('.mq-card')) : [];
    if (!group || !cards.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.add('is-js');

    var x = 0, loop = 0, vw = 0, cw = 0, lefts = [], hover = false, drag = false, moved = 0, startX = 0, startPos = 0, visible = true, last = 0;
    var speed = 0.5, gap = 8, baseR = 32, midR = 58;
    var bodies = cards.map(function (c) { return c.querySelector('.mq-body'); });

    function measure() {
        loop = group.getBoundingClientRect().width;
        vw = root.getBoundingClientRect().width;
        cw = cards[0].offsetWidth;
        gap = parseFloat(getComputedStyle(cards[0]).marginRight) || 8;
        midR = Math.min(58, cw * 0.2);
        lefts = cards.map(function (c) { return c.offsetLeft; });
    }

    function paint() {
        if (loop) x = ((x % loop) + loop) % loop;
        track.style.transform = 'translate3d(' + (-x) + 'px,0,0)';
        var zone = Math.min(vw * 0.12, 150);          // у краёв карточки чуть заезжают друг под друга
        var pitch = cw + gap, mid = vw / 2;
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i], body = bodies[i];
            var cx = lefts[i] - x + cw / 2;
            if (cx < -cw || cx > vw + cw) { c.style.transform = ''; continue; }
            // радиус: у центральной карточки больше, к соседним плавно убывает
            var k = Math.max(0, 1 - Math.abs(cx - mid) / pitch);
            body.style.borderRadius = (baseR + (midR - baseR) * k * k * (3 - 2 * k)).toFixed(1) + 'px';
            var t = 0, dir = 0;
            if (cx < zone) { t = (zone - cx) / zone; dir = 1; }
            else if (cx > vw - zone) { t = (cx - (vw - zone)) / zone; dir = -1; }
            t = Math.min(t, 1.2);
            var e = t * t * (3 - 2 * Math.min(t, 1));
            var tx = dir * e * cw * 0.3;
            var sc = 1 - 0.04 * e;
            c.style.transform = e ? 'translate3d(' + tx.toFixed(1) + 'px,0,0) scale(' + sc.toFixed(3) + ')' : '';
            c.style.zIndex = String(100 - Math.round(Math.min(e, 1.2) * 60));
        }
    }

    function tick(t) {
        var dt = last ? Math.min(t - last, 50) : 16; last = t;
        if (visible && !hover && !drag && !reduce) { x += speed * dt / 16; paint(); }
        requestAnimationFrame(tick);
    }

    measure(); paint();
    window.addEventListener('resize', function () { measure(); paint(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); paint(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(root);

    root.addEventListener('mouseenter', function () { hover = true; });
    root.addEventListener('mouseleave', function () { hover = false; });
    root.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        drag = true; moved = 0; startX = e.clientX; startPos = x; root.classList.add('is-drag');
    });
    window.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var d = e.clientX - startX; moved = Math.max(moved, Math.abs(d));
        x = startPos - d; paint();
    });
    function end() { if (drag) { drag = false; root.classList.remove('is-drag'); } }
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    root.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    root.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { x += e.deltaX; paint(); e.preventDefault(); }
    }, { passive: false });
    requestAnimationFrame(tick);
})();
