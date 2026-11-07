/* Лёгкий 3D-наклон карточек проектов под курсором.
 * Работает только с мышью и без prefers-reduced-motion. Управляет CSS-переменными, не inline-стилями. */
(function () {
    'use strict';
    var mm = window.matchMedia;
    if (!mm || mm('(prefers-reduced-motion: reduce)').matches || !mm('(hover: hover) and (pointer: fine)').matches) return;

    var active = null, raf = 0, px = 0, py = 0, MAX = 7;

    function reset() {
        if (!active) return;
        active.classList.remove('tilt-active');
        active.style.removeProperty('--rx');
        active.style.removeProperty('--ry');
        active = null;
    }

    function apply() {
        raf = 0;
        if (!active) return;
        var r = active.getBoundingClientRect();
        var x = (px - r.left) / r.width - 0.5;
        var y = (py - r.top) / r.height - 0.5;
        active.style.setProperty('--rx', (-y * MAX).toFixed(2) + 'deg');
        active.style.setProperty('--ry', (x * MAX).toFixed(2) + 'deg');
    }

    document.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var c = e.target.closest ? e.target.closest('.project-card') : null;
        if (c !== active) {
            reset();
            if (c && c.classList.contains('visible')) {
                active = c;
                c.classList.add('tilt-active');
            }
        }
        px = e.clientX; py = e.clientY;
        if (active && !raf) raf = requestAnimationFrame(apply);
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', reset);
})();
