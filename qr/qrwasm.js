/* Быстрое построение матрицы QR на Rust (WebAssembly). Не нашлось файла или браузер не умеет —
   render.js молча использует JS-библиотеку. Исходники: qr-wasm/. */
(function () {
    'use strict';
    var ECL = { L: 0, M: 1, Q: 2, H: 3 };
    var W = window.QRWasm = { ready: false, encode: null };
    if (!window.WebAssembly || !WebAssembly.instantiate || !window.fetch) return;

    fetch('qr/qr_core.wasm').then(function (r) {
        if (!r.ok) throw new Error('нет файла');
        return r.arrayBuffer();
    }).then(function (buf) { return WebAssembly.instantiate(buf, {}); }).then(function (res) {
        var x = res.instance.exports, enc = new TextEncoder();
        function run(text, ecl) {
            var bytes = enc.encode(text), p = x.qr_alloc(bytes.length);
            new Uint8Array(x.memory.buffer, p, bytes.length).set(bytes);
            var n = x.qr_encode(p, bytes.length, ECL[ecl] === undefined ? 1 : ECL[ecl], 0);
            x.qr_free(p, bytes.length);
            if (n < 0) return null;                       // не влезло или ошибка: пусть решает JS
            var flat = new Uint8Array(x.memory.buffer, x.qr_modules(), n * n), m = [];
            for (var r = 0; r < n; r++) m.push(Array.prototype.slice.call(flat, r * n, r * n + n));
            return { n: n, m: m, version: (n - 17) / 4 };
        }
        var t = run('https://example.com', 'M');          // самопроверка: версия 2, 25 модулей
        if (!t || t.n !== 25 || t.m[0][0] !== 1 || t.m[1][1] !== 0) throw new Error('самопроверка не прошла');
        W.encode = run; W.ready = true;
    }).catch(function () { /* остаёмся на JS */ });
})();
