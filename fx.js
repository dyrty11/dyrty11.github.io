/* Живые детали интерфейса: печатающийся текст в первом экране и подсветка карточек за курсором.
 * Без внешних запросов. При prefers-reduced-motion всё остаётся статичным. */
(function () {
    'use strict';
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* --- печатающийся текст --- */
    var roll = document.querySelector('[data-roll]');
    if (roll && !reduce) {
        var words = String(roll.getAttribute('data-roll')).split('|').filter(Boolean);
        var out = roll.querySelector('.roll-word');
        if (words.length > 1 && out) {
            var w = 0, n = words[0].length, erasing = false, timer = 0;
            var tick = function () {
                var word = words[w];
                out.textContent = word.slice(0, n);
                var delay;
                if (!erasing) {
                    if (n < word.length) { n++; delay = 85; } else { erasing = true; delay = 1600; }
                } else {
                    if (n > 0) { n--; delay = 42; } else { erasing = false; w = (w + 1) % words.length; delay = 280; }
                }
                timer = setTimeout(tick, delay);
            };
            timer = setTimeout(tick, 1800);
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) { clearTimeout(timer); }
                else { clearTimeout(timer); timer = setTimeout(tick, 400); }
            });
        }
    }

    /* --- подсветка карточки под курсором --- */
    if (!reduce && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        var card = null, raf = 0, px = 0, py = 0;
        var paint = function () {
            raf = 0;
            if (!card) return;
            var r = card.getBoundingClientRect();
            card.style.setProperty('--mx', (px - r.left).toFixed(0) + 'px');
            card.style.setProperty('--my', (py - r.top).toFixed(0) + 'px');
        };
        document.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse') return;
            var c = e.target.closest ? e.target.closest('.project-card') : null;
            if (c !== card) {
                if (card) { card.style.removeProperty('--mx'); card.style.removeProperty('--my'); }
                card = c;
            }
            if (card) { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paint); }
        }, { passive: true });
    }
})();
