/* Файлы без зависимостей: ZIP (без сжатия), PDF из JPEG-страниц, скачивание, буфер обмена. */
(function () {
    'use strict';
    var enc = new TextEncoder();

    var table = (function () {
        var t = new Uint32Array(256);
        for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
        return t;
    })();
    function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = table[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

    function dosTime(d) { return [((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF]; }

    // files: [{name, data: Uint8Array}]
    function zip(files) {
        var parts = [], central = [], off = 0, tm = dosTime(new Date());
        function u16(v) { return [v & 255, (v >> 8) & 255]; }
        function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
        files.forEach(function (f) {
            var name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
            var lh = new Uint8Array([0x50, 0x4b, 3, 4].concat(u16(20), u16(0x0800), u16(0), u16(tm[0]), u16(tm[1]), u32(crc), u32(size), u32(size), u16(name.length), u16(0)));
            parts.push(lh, name, f.data);
            central.push(new Uint8Array([0x50, 0x4b, 1, 2].concat(u16(20), u16(20), u16(0x0800), u16(0), u16(tm[0]), u16(tm[1]), u32(crc), u32(size), u32(size), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), name);
            off += lh.length + name.length + size;
        });
        var cdSize = 0; central.forEach(function (c) { cdSize += c.length; });
        var end = new Uint8Array([0x50, 0x4b, 5, 6].concat(u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(off), u16(0)));
        return new Blob(parts.concat(central, [end]), { type: 'application/zip' });
    }

    // pages: [{jpeg: Uint8Array, wpx, hpx, wpt, hpt}]
    function pdf(pages) {
        var chunks = [], len = 0, offs = [];
        function push(x) { if (typeof x === 'string') x = enc.encode(x); chunks.push(x); len += x.length; }
        function obj(id, body) { offs[id] = len; push(id + ' 0 obj\n'); push(body); push('\nendobj\n'); }
        push('%PDF-1.4\n');
        var kids = pages.map(function (_, i) { return (3 + 3 * i) + ' 0 R'; }).join(' ');
        obj(1, '<</Type/Catalog/Pages 2 0 R>>');
        obj(2, '<</Type/Pages/Count ' + pages.length + '/Kids[' + kids + ']>>');
        pages.forEach(function (p, i) {
            var pid = 3 + 3 * i, cid = pid + 1, iid = pid + 2, w = p.wpt.toFixed(2), h = p.hpt.toFixed(2);
            obj(pid, '<</Type/Page/Parent 2 0 R/MediaBox[0 0 ' + w + ' ' + h + ']/Resources<</XObject<</Im0 ' + iid + ' 0 R>>>>/Contents ' + cid + ' 0 R>>');
            var content = 'q ' + w + ' 0 0 ' + h + ' 0 0 cm /Im0 Do Q';
            obj(cid, '<</Length ' + content.length + '>>\nstream\n' + content + '\nendstream');
            offs[iid] = len; push(iid + ' 0 obj\n<</Type/XObject/Subtype/Image/Width ' + p.wpx + '/Height ' + p.hpx + '/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ' + p.jpeg.length + '>>\nstream\n');
            push(p.jpeg); push('\nendstream\nendobj\n');
        });
        var total = 3 + 3 * pages.length, xref = len, x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
        for (var i = 1; i < total; i++) x += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n';
        push(x + 'trailer\n<</Size ' + total + '/Root 1 0 R>>\nstartxref\n' + xref + '\n%%EOF');
        return new Blob(chunks, { type: 'application/pdf' });
    }

    function bytes(blob) { return blob.arrayBuffer().then(function (b) { return new Uint8Array(b); }); }

    function download(blob, name) {
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = name; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }

    function copyImage(blobPromise) {
        if (!navigator.clipboard || !window.ClipboardItem) return Promise.reject(new Error('Браузер не умеет копировать картинки'));
        return navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
    }
    function copyText(t) {
        if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
        return new Promise(function (ok, no) {
            var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
            ta.className = 'sr-copy'; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy') ? ok() : no(new Error('copy')); } catch (e) { no(e); } ta.remove();
        });
    }
    function share(blob, name, title) {
        var file = new File([blob], name, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: title || 'QR-код' });
        return Promise.reject(new Error('Отправка файлов не поддерживается'));
    }

    function slug(s) {
        var m = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
        var r = String(s || '').toLowerCase().replace(/[а-яё]/g, function (c) { return m[c]; }).replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
        return r || 'qr';
    }

    window.QRFiles = { zip: zip, pdf: pdf, bytes: bytes, download: download, copyImage: copyImage, copyText: copyText, share: share, slug: slug, crc32: crc32 };
})();
