// Проверка собранного qr_core.wasm: сравнивает с JS-библиотекой и читает матрицу декодером jsQR.
// Запуск: node qr-wasm/verify.mjs путь/к/qr_core.wasm
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = new URL('..', import.meta.url).pathname;
const jsQR = require(root + 'qr/vendor/jsQR.min.js');
const ctx = { window: {}, self: {}, console };
vm.createContext(ctx);
for (const f of ['qr/vendor/qrcode.min.js', 'qr/vendor/qrcode_utf8.js']) vm.runInContext(fs.readFileSync(root + f, 'utf8'), ctx);
const qrcode = ctx.qrcode || ctx.window.qrcode;
const { instance } = await WebAssembly.instantiate(fs.readFileSync(process.argv[2]), {});
const x = instance.exports, enc = new TextEncoder();
const ECL = { L: 0, M: 1, Q: 2, H: 3 };
function wasm(text, ecl) {
    const b = enc.encode(text), p = x.qr_alloc(b.length);
    new Uint8Array(x.memory.buffer, p, b.length).set(b);
    const n = x.qr_encode(p, b.length, ECL[ecl], 0); x.qr_free(p, b.length);
    if (n < 0) return null;
    return { n, flat: Uint8Array.from(new Uint8Array(x.memory.buffer, x.qr_modules(), n * n)) };
}
function js(text, ecl) {
    const q = qrcode(0, ecl);
    const mode = /^\d+$/.test(text) ? 'Numeric' : /^[0-9A-Z $%*+\-.\/:]+$/.test(text) ? 'Alphanumeric' : 'Byte';
    q.addData(text, mode); q.make();
    const n = q.getModuleCount(), flat = new Uint8Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) flat[r * n + c] = q.isDark(r, c) ? 1 : 0;
    return { n, flat };
}
function decode(m) {
    const S = 6, Q = 4, side = (m.n + 2 * Q) * S, px = new Uint8ClampedArray(side * side * 4).fill(255);
    for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.flat[r * m.n + c])
        for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
            const i = (((r + Q) * S + dy) * side + (c + Q) * S + dx) * 4; px[i] = px[i + 1] = px[i + 2] = 0;
        }
    const res = jsQR(px, side, side); return res && res.data;
}
const samples = ['https://dyrty11.github.io', '1234567890123456', 'HELLO WORLD 42', 'Привет, мир', 'x'.repeat(300), 'WIFI:T:WPA;S:дом;P:пароль123;;', 'BEGIN:VCARD\nVERSION:3.0\nFN:Иван Иванов\nTEL:+79990001122\nEND:VCARD'];
let bad = 0, same = 0, total = 0;
for (const t of samples) for (const e of ['L', 'M', 'Q', 'H']) {
    const w = wasm(t, e), j = js(t, e); total++;
    if (!w) { console.log('FAIL wasm null', JSON.stringify(t.slice(0, 20)), e); bad++; continue; }
    if (w.n !== j.n) { console.log('FAIL размер', t.slice(0, 20), e, w.n, j.n); bad++; continue; }
    if (decode(w) !== t) { console.log('FAIL декодирование', t.slice(0, 20), e); bad++; continue; }
    if (Buffer.compare(Buffer.from(w.flat), Buffer.from(j.flat)) === 0) same++;
}
const t0 = performance.now(); for (let i = 0; i < 300; i++) wasm('https://example.com/item/' + i, 'M'); const tw = performance.now() - t0;
const t1 = performance.now(); for (let i = 0; i < 300; i++) js('https://example.com/item/' + i, 'M'); const tj = performance.now() - t1;
console.log(`проверено ${total}, ошибок ${bad}, матрица совпала с JS в ${same}; 300 кодов: wasm ${tw.toFixed(0)} мс, js ${tj.toFixed(0)} мс`);
process.exit(bad ? 1 : 0);
