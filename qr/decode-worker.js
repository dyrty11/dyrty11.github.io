/* Чтение QR в фоновом потоке: тяжёлый jsQR не должен тормозить ввод. */
importScripts('vendor/jsQR.min.js');
self.onmessage = function (e) {
    var d = e.data, text = null;
    try { var q = jsQR(new Uint8ClampedArray(d.buf), d.w, d.h, { inversionAttempts: 'attemptBoth' }); text = q ? q.data : null; } catch (x) { text = null; }
    self.postMessage({ id: d.id, text: text });
};
