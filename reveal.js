/* Плавное появление блоков при прокрутке. Элементы помечаются атрибутом data-reveal.
 * Без JS, без IntersectionObserver и при prefers-reduced-motion всё показывается сразу. */
(function () {
    'use strict';
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!els.length) return;

    document.documentElement.classList.add('js-reveal');
    els.forEach(function (el, i) { el.style.setProperty('--rd', Math.min(i % 4, 3) * 0.1 + 's'); });

    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    els.forEach(function (el) { io.observe(el); });

    setTimeout(function () { els.forEach(function (el) { el.classList.add('in'); }); }, 3500);
})();
