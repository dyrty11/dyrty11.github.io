/* Песочница предпросмотра VoidForge. Страница открывается в iframe с sandbox="allow-scripts" (без allow-same-origin),
 * поэтому у сгенерированного кода непрозрачный origin: доступа к сайту, localStorage и cookie нет. */
(function () {
    'use strict';
    window.addEventListener('message', function (e) {
        if (e.source !== window.parent || !e.data || typeof e.data.html !== 'string') return;
        document.open();
        document.write(e.data.html);
        document.close();
    }, { once: true });
})();
