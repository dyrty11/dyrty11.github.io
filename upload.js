// Красивая загрузка файлов в форме контактов: выбор, перетаскивание, список, счётчик размера
(function () {
    'use strict';
    var input = document.getElementById('fAttach');
    var zone = document.getElementById('uploadZone');
    var list = document.getElementById('fileList');
    var meter = document.getElementById('uploadMeter');
    var bar = document.getElementById('uploadBar');
    var totalEl = document.getElementById('uploadTotal');
    var status = document.getElementById('formStatus');
    if (!input || !zone || !list || typeof DataTransfer === 'undefined') return;

    var MAX_FILES = 5, MAX_TOTAL = 10 * 1024 * 1024;
    var OK_EXT = /\.(png|jpe?g|gif|webp|pdf|txt|zip|docx?)$/i;
    var files = [];

    function say(msg) {
        if (!status) return;
        status.textContent = msg || '';
        status.className = 'form-status' + (msg ? ' err' : '');
    }
    function fmt(bytes) {
        if (bytes < 1024) return bytes + ' Б';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' КБ';
        return (bytes / 1048576).toFixed(1) + ' МБ';
    }
    function sync() {
        var dt = new DataTransfer();
        files.forEach(function (f) { dt.items.add(f); });
        input.files = dt.files;
    }
    function total() { return files.reduce(function (s, f) { return s + f.size; }, 0); }

    function render() {
        list.textContent = '';
        files.forEach(function (f, i) {
            var li = document.createElement('li');
            li.className = 'file-chip';
            var name = document.createElement('span');
            name.className = 'file-name';
            name.textContent = f.name;
            var size = document.createElement('span');
            size.className = 'file-size';
            size.textContent = fmt(f.size);
            var rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'file-remove';
            rm.setAttribute('aria-label', 'Убрать файл ' + f.name);
            rm.textContent = '×';
            rm.addEventListener('click', function () {
                files.splice(i, 1);
                sync(); render(); say('');
            });
            li.appendChild(name); li.appendChild(size); li.appendChild(rm);
            list.appendChild(li);
        });
        var t = total();
        meter.hidden = files.length === 0;
        bar.style.setProperty('width', Math.min(100, t / MAX_TOTAL * 100) + '%');
        meter.classList.toggle('over', t > MAX_TOTAL);
        totalEl.textContent = fmt(t) + ' из 10 МБ';
    }

    function add(newFiles) {
        var msg = '';
        Array.prototype.forEach.call(newFiles, function (f) {
            if (!OK_EXT.test(f.name)) { msg = 'Этот тип файла не подходит: ' + f.name; return; }
            if (files.some(function (x) { return x.name === f.name && x.size === f.size; })) return;
            if (files.length >= MAX_FILES) { msg = 'Можно прикрепить не больше ' + MAX_FILES + ' файлов.'; return; }
            files.push(f);
        });
        if (total() > MAX_TOTAL) msg = 'Файлы слишком большие: суммарно не больше 10 МБ.';
        sync(); render(); say(msg);
    }

    input.addEventListener('change', function () { add(input.files); });
    ['dragenter', 'dragover'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('dragover'); });
    });
    zone.addEventListener('drop', function (e) { if (e.dataTransfer) add(e.dataTransfer.files); });
})();
