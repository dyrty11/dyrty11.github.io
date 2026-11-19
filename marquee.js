/* Бегущая лента: сама едет, останавливается при наведении, листается мышью и пальцем.
 * Без JS работает CSS-анимация. Вне экрана и при prefers-reduced-motion не крутится. */
(function () {
    'use strict';
    var root = document.querySelector('.marquee');
    if (!root) return;
    var track = root.querySelector('.marquee-track');
    var group = track && track.querySelector('.marquee-group');
    if (!group) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.add('is-js');
    var x = 0, w = 0, speed = 0.45, hover = false, drag = false, moved = 0, startX = 0, startPos = 0, visible = true, last = 0;
    function measure() { w = group.getBoundingClientRect().width; }
    function apply() { if (w) { x = ((x % w) + w) % w; } track.style.transform = 'translate3d(' + (-x) + 'px,0,0)'; }
    function tick(t) {
        var dt = last ? Math.min(t - last, 50) : 16; last = t;
        if (visible && !hover && !drag && !reduce) { x += speed * dt / 16; apply(); }
        requestAnimationFrame(tick);
    }
    measure(); apply();
    window.addEventListener('resize', measure);
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
        x = startPos - d; apply();
    });
    function end() { if (drag) { drag = false; root.classList.remove('is-drag'); } }
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    root.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    root.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { x += e.deltaX; apply(); e.preventDefault(); }
    }, { passive: false });
    requestAnimationFrame(tick);
})();
