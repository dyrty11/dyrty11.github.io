/* Офлайн для генератора QR. Трогает только файлы самого генератора, остальной сайт идёт как обычно. */
'use strict';
var CACHE = 'qr-v3';
var FILES = [
    'qr.html', 'qr.webmanifest', 'qr/qr.css', 'qr/app.js', 'qr/content.js', 'qr/render.js', 'qr/anim.js', 'qr/files.js', 'qr/decode-worker.js',
    'qr/vendor/qrcode.min.js', 'qr/vendor/qrcode_utf8.js', 'qr/vendor/jsQR.min.js', 'qr/qrwasm.js', 'qr/qr_core.wasm',
    'qr/icons/icon-192.png', 'qr/icons/icon-512.png',
    'fonts.css', 'ttyou.css', 'frame-bust.js', 'favicon.svg', 'logo.svg', 'apple-touch-icon.png',
    'fonts/onest-cyr.woff2', 'fonts/onest-lat.woff2', 'fonts/-F63fjptAgt5VM-kVkqdyU8n1isq129k.woff2'
];
var SCOPE = FILES.map(function (f) { return new URL(f, self.location.href).pathname; });

self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () {}); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
    var r = e.request;
    if (r.method !== 'GET') return;
    var u = new URL(r.url);
    if (u.origin !== self.location.origin || SCOPE.indexOf(u.pathname) < 0) return;
    // сначала сеть (свежая версия), без сети — копия из кэша
    e.respondWith(fetch(r).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); }
        return res;
    }).catch(function () { return caches.match(r, { ignoreSearch: true }); }));
});
