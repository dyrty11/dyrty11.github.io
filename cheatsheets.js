/* Конструктор шпаргалок. Всё в браузере: данные хранятся в localStorage, на сервер ничего не уходит.
 * Весь пользовательский текст попадает на страницу только через textContent. */
(function () {
    'use strict';

    var KEY = 'cheatsheet.v1';
    var LIM = { title: 80, sub: 160, secTitle: 60, secText: 4000, secs: 30, file: 200000, hash: 12000 };
    var PAGE = { p: [794, 1123], l: [1123, 794] };
    var FZ = { s: 0.9, m: 1, l: 1.12 };
    var THEMES = ['paper', 'cream', 'dark'];
    var ACCENTS = [
        ['#ccff00', 'Лайм'], ['#00e5ff', 'Циан'], ['#ff3d71', 'Малина'], ['#ffb300', 'Янтарь'],
        ['#7c4dff', 'Фиолет'], ['#00c853', 'Зелёный'], ['#111111', 'Графит']
    ];

    function $(id) { return document.getElementById(id); }
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    /* ---------- шаблоны ---------- */
    function T(id, name, title, subtitle, accent, secs) {
        return { id: id, name: name, title: title, subtitle: subtitle, accent: accent, cols: 2, sections: secs.map(function (s) { return { title: s[0], text: s[1].join('\n') }; }) };
    }
    var TEMPLATES = [
        T('git', 'Git', 'Git', 'Основные команды на каждый день', '#ffb300', [
            ['Начало', ['git init :: создать репозиторий в текущей папке', 'git clone <url> :: скачать репозиторий', 'git status :: что изменилось', 'git config --global user.name "Имя" :: задать имя автора']],
            ['Коммиты', ['git add . :: добавить всё в индекс', 'git add -p :: выбрать куски для коммита', 'git commit -m "текст" :: сделать коммит', 'git commit --amend :: поправить последний коммит', 'git restore <файл> :: отменить правки в файле', 'git restore --staged <файл> :: убрать файл из индекса']],
            ['Ветки', ['git branch :: список веток', 'git switch -c имя :: создать ветку и перейти', 'git switch имя :: перейти в ветку', 'git merge имя :: влить ветку в текущую', 'git branch -d имя :: удалить ветку']],
            ['Удалённый репозиторий', ['git remote -v :: адреса удалённых репозиториев', 'git fetch :: скачать изменения, не вливая', 'git pull --rebase origin main :: забрать изменения и перенести свои поверх', 'git push origin main :: отправить коммиты', 'git push -u origin имя :: первая отправка новой ветки']],
            ['История', ['git log --oneline --graph :: компактная история с ветками', 'git diff :: изменения, ещё не в индексе', 'git diff --staged :: изменения в индексе', 'git show <хеш> :: показать коммит', 'git blame <файл> :: кто и когда менял строки']],
            ['Отмена и откат', ['git revert <хеш> :: отменить коммит новым коммитом', 'git reset --soft HEAD~1 :: отменить коммит, оставить правки', 'git stash :: спрятать текущие правки', 'git stash pop :: вернуть спрятанное', 'git reset --hard :: стереть все правки (осторожно!)']]
        ]),
        T('powershell', 'PowerShell', 'PowerShell', 'Команды для работы с файлами и системой', '#00e5ff', [
            ['Навигация', ['Get-Location :: где я сейчас (pwd)', 'Set-Location путь :: перейти в папку (cd)', 'Get-ChildItem :: список файлов (ls, dir)', 'Get-ChildItem -Recurse -Filter *.js :: найти файлы по маске']],
            ['Файлы и папки', ['New-Item -ItemType Directory имя :: создать папку', 'Copy-Item откуда куда :: копировать', 'Move-Item откуда куда :: переместить или переименовать', 'Remove-Item путь -Recurse :: удалить папку со всем содержимым', 'Test-Path путь :: существует ли путь']],
            ['Чтение и запись', ['Get-Content файл :: прочитать файл', 'Get-Content файл -Tail 20 :: последние 20 строк', 'Set-Content файл "текст" :: записать в файл', 'Add-Content файл "текст" :: дописать в конец']],
            ['Поиск и фильтры', ["Select-String -Path *.html -Pattern 'текст' :: найти текст в файлах", 'Where-Object { $_.Length -gt 1MB } :: оставить файлы больше 1 МБ', 'Sort-Object Length -Descending :: сортировка по убыванию', 'Select-Object -First 5 :: первые 5 элементов']],
            ['Система', ['Get-Process :: список процессов', 'Stop-Process -Name имя :: завершить процесс', 'Get-Service :: службы Windows', 'Get-FileHash файл -Algorithm SHA256 :: контрольная сумма файла', 'Get-Help команда -Examples :: примеры использования']],
            ['Скрипты', ['Set-ExecutionPolicy -Scope CurrentUser RemoteSigned :: разрешить свои скрипты', '.\\script.ps1 :: запустить скрипт из текущей папки', '$env:PATH :: переменная окружения', 'Write-Host "текст" :: вывести текст', 'команда1 | команда2 :: передать результат дальше (конвейер)']]
        ]),
        T('vscode', 'VS Code (Windows)', 'VS Code', 'Горячие клавиши для Windows', '#7c4dff', [
            ['Главное', ['Ctrl+P :: быстро открыть файл', 'Ctrl+Shift+P :: палитра команд', 'Ctrl+, :: настройки', 'Ctrl+B :: показать или скрыть боковую панель', 'Ctrl+` :: терминал']],
            ['Редактирование', ['Alt+↑ / Alt+↓ :: переместить строку', 'Shift+Alt+↓ :: дублировать строку', 'Ctrl+Shift+K :: удалить строку', 'Ctrl+/ :: закомментировать строку', 'Ctrl+D :: выделить следующее совпадение', 'Alt+клик :: добавить курсор', 'Ctrl+Shift+L :: выделить все совпадения']],
            ['Навигация', ['Ctrl+G :: перейти к строке', 'Ctrl+Shift+O :: перейти к символу в файле', 'F12 :: перейти к определению', 'Ctrl+Tab :: переключение между файлами', 'Ctrl+\\ :: разделить редактор', 'Ctrl+W :: закрыть вкладку']],
            ['Поиск', ['Ctrl+F :: поиск в файле', 'Ctrl+H :: замена в файле', 'Ctrl+Shift+F :: поиск по всему проекту']],
            ['Код', ['Shift+Alt+F :: форматировать документ', 'F2 :: переименовать символ везде', 'Ctrl+. :: быстрые исправления', 'Ctrl+Space :: показать подсказки']]
        ]),
        T('markdown', 'Markdown', 'Markdown', 'Разметка текста для README и заметок', '#ccff00', [
            ['Заголовки', ['# Заголовок :: первый уровень', '## Заголовок :: второй уровень', '### Заголовок :: третий уровень']],
            ['Оформление текста', ['**текст** :: жирный', '*текст* :: курсив', '~~текст~~ :: зачёркнутый', '`код` :: код в строке']],
            ['Списки', ['- пункт :: маркированный список', '1. пункт :: нумерованный список', '- [ ] задача :: чекбокс', '  - вложенный :: два пробела для вложенности']],
            ['Ссылки и картинки', ['[текст](https://адрес) :: ссылка', '![описание](img/файл.png) :: картинка']],
            ['Блоки', ['> цитата :: цитата', '``` :: блок кода (после трёх кавычек можно указать язык)', '--- :: горизонтальная линия']],
            ['Таблица', ['| A | B | :: строка заголовка', '|---|---| :: разделитель под заголовком', '| 1 | 2 | :: строка данных']]
        ]),
        T('regex', 'Регулярные выражения', 'Regex', 'Шпаргалка по регулярным выражениям', '#ff3d71', [
            ['Символы', ['. :: любой символ, кроме перевода строки', '\\d :: цифра', '\\w :: буква, цифра или _', '\\s :: пробельный символ', '\\D \\W \\S :: наоборот: не цифра, не буква, не пробел', '\\b :: граница слова']],
            ['Количество', ['* :: ноль или больше', '+ :: один или больше', '? :: ноль или один', '{3} :: ровно 3', '{2,5} :: от 2 до 5', '*? :: ленивое: как можно меньше']],
            ['Позиции и группы', ['^ :: начало строки', '$ :: конец строки', '(abc) :: группа с захватом', '(?:abc) :: группа без захвата', 'a|b :: a или b', '[abc] :: любой из символов', '[^abc] :: любой, кроме этих', '[a-z] :: диапазон']],
            ['Проверка соседей', ['(?=x) :: дальше идёт x', '(?!x) :: дальше не идёт x', '(?<=x) :: перед этим стоит x', '(?<!x) :: перед этим не стоит x']],
            ['Флаги', ['g :: найти все совпадения', 'i :: не учитывать регистр', 'm :: ^ и $ работают для каждой строки']],
            ['Примеры', ['\\d{4}-\\d{2}-\\d{2} :: дата вида 2026-11-03', '^\\S+@\\S+\\.\\S+$ :: простая проверка e-mail', '#[0-9a-fA-F]{6} :: цвет в hex']]
        ]),
        T('http', 'HTTP-статусы', 'HTTP-статусы', 'Коды ответов сервера', '#00c853', [
            ['2xx: успех', ['200 :: OK, всё хорошо', '201 :: Created, ресурс создан', '204 :: No Content, успех без тела ответа']],
            ['3xx: перенаправления', ['301 :: Moved Permanently, переехал навсегда', '302 :: Found, временный редирект', '304 :: Not Modified, берите из кэша']],
            ['4xx: ошибка клиента', ['400 :: Bad Request, неверный запрос', '401 :: Unauthorized, нужна авторизация', '403 :: Forbidden, доступ запрещён', '404 :: Not Found, не найдено', '405 :: Method Not Allowed, метод не разрешён', '409 :: Conflict, конфликт состояния', '429 :: Too Many Requests, превышен лимит запросов']],
            ['5xx: ошибка сервера', ['500 :: Internal Server Error, сбой на сервере', '502 :: Bad Gateway, плохой ответ от другого сервера', '503 :: Service Unavailable, сервис недоступен', '504 :: Gateway Timeout, шлюз не дождался ответа']]
        ]),
        T('websec', 'Безопасность сайта', 'Безопасность сайта', 'Заголовки, CSP и частые атаки', '#ff3d71', [
            ['Заголовки', ['Content-Security-Policy :: разрешённые источники ресурсов, защита от XSS', 'Strict-Transport-Security :: всегда открывать сайт по HTTPS (HSTS)', 'X-Content-Type-Options: nosniff :: не угадывать тип файла', 'X-Frame-Options: DENY :: запретить встраивание в iframe', 'Referrer-Policy :: что отправлять в заголовке Referer', 'Permissions-Policy :: отключить камеру, геолокацию и т. п.']],
            ['Директивы CSP', ["default-src 'self' :: по умолчанию только свой домен", "script-src 'self' :: скрипты только свои", "object-src 'none' :: без плагинов", "base-uri 'none' :: запретить подмену <base>", "frame-ancestors 'none' :: никто не встроит сайт (в meta-теге не работает)"]],
            ['Частые атаки', ['XSS :: внедрение скрипта через неочищенный ввод. Защита: textContent и CSP', 'CSRF :: запрос от имени пользователя. Защита: токены и SameSite-cookie', 'SQL-инъекция :: вставка SQL в запрос. Защита: параметризованные запросы', 'Clickjacking :: невидимый iframe поверх страницы. Защита: frame-ancestors', 'Утечка секретов :: ключи в репозитории. Защита: .gitignore и secret scanning']],
            ['Аккаунты и пароли', ['Длина важнее сложности :: от 14 символов', 'Уникальный пароль на каждый сайт :: менеджер паролей', 'Двухфакторная защита :: приложение-аутентификатор лучше SMS', 'Токены доступа :: минимум прав и короткий срок жизни']]
        ])
    ];

    function blank() {
        return { title: 'Моя шпаргалка', subtitle: 'Коротко о главном', theme: 'paper', accent: '#ccff00', cols: 2, orient: 'p', size: 'm',
            sections: [{ title: 'Первый раздел', text: 'команда :: что она делает\nЕщё одна :: описание\nСтрока без двойного двоеточия станет обычным текстом' }] };
    }
    function fromTemplate(t) {
        return { title: t.title, subtitle: t.subtitle, theme: 'paper', accent: t.accent, cols: t.cols, orient: 'p', size: 'm',
            sections: t.sections.map(function (s) { return { title: s.title, text: s.text }; }) };
    }

    /* ---------- проверка и нормализация входных данных ---------- */
    function str(v, max) { return typeof v === 'string' ? v.replace(/\r/g, '').slice(0, max) : ''; }
    function normalize(o) {
        if (!o || typeof o !== 'object' || !Array.isArray(o.sections)) return null;
        var s = {
            title: str(o.title, LIM.title), subtitle: str(o.subtitle, LIM.sub),
            theme: THEMES.indexOf(o.theme) >= 0 ? o.theme : 'paper',
            accent: (typeof o.accent === 'string' && /^#[0-9a-f]{6}$/i.test(o.accent)) ? o.accent.toLowerCase() : '#ccff00',
            cols: [1, 2, 3].indexOf(o.cols) >= 0 ? o.cols : 2,
            orient: o.orient === 'l' ? 'l' : 'p',
            size: (o.size === 's' || o.size === 'l') ? o.size : 'm',
            sections: []
        };
        o.sections.slice(0, LIM.secs).forEach(function (x) {
            if (x && typeof x === 'object') s.sections.push({ title: str(x.title, LIM.secTitle), text: str(x.text, LIM.secText) });
        });
        return s;
    }

    /* ---------- хранилище ---------- */
    var mem = null;
    function store(v) { try { localStorage.setItem(KEY, v); } catch (e) { mem = v; } }
    function readStore() { try { return localStorage.getItem(KEY); } catch (e) { return mem; } }

    var S;
    var saveTimer = 0, statusTimer = 0, scale = 1, pageRuleIdx = -1;

    function schedule() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { store(JSON.stringify(S)); }, 400); }
    function changed() { renderSheet(); schedule(); }
    function say(msg) {
        var n = $('status'); n.textContent = msg;
        clearTimeout(statusTimer); statusTimer = setTimeout(function () { n.textContent = ''; }, 5000);
    }

    /* ---------- разбор строк ---------- */
    function parseRows(text) {
        var rows = [];
        String(text).split('\n').forEach(function (ln) {
            ln = ln.replace(/\s+$/, '');
            if (!ln.trim()) return;
            var i = ln.indexOf(' :: ');
            if (i > 0) rows.push({ k: ln.slice(0, i).trim(), v: ln.slice(i + 4).trim() });
            else if (/\s::$/.test(ln)) rows.push({ k: ln.slice(0, -3).trim(), v: '' });
            else rows.push({ k: '', v: ln.trim() });
        });
        return rows;
    }

    /* ---------- цвета ---------- */
    function rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
    function lum(c) {
        var a = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function onColor(hex) {
        var L = lum(rgb(hex));
        return (1.05 / (L + 0.05)) > ((L + 0.05) / 0.05) ? '#ffffff' : '#000000';
    }

    /* ---------- лист ---------- */
    function renderSheet() {
        var sh = $('sheet'), pg = PAGE[S.orient], c = rgb(S.accent);
        sh.textContent = '';
        sh.className = 'sheet t-' + S.theme;
        sh.style.setProperty('--pw', pg[0] + 'px');
        sh.style.setProperty('--ph', pg[1] + 'px');
        sh.style.setProperty('--accent', S.accent);
        sh.style.setProperty('--on', onColor(S.accent));
        sh.style.setProperty('--tint', 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.18)');
        sh.style.setProperty('--fz', String(FZ[S.size]));
        sh.style.setProperty('--cols', String(S.cols));

        var head = el('header', 'sh-head');
        head.appendChild(el('h2', 'sh-title', S.title || 'Без названия'));
        if (S.subtitle) head.appendChild(el('p', 'sh-sub', S.subtitle));
        sh.appendChild(head);

        var body = el('div', 'sh-body');
        if (!S.sections.length) body.appendChild(el('p', 'sh-empty', 'Добавьте раздел в редакторе слева.'));
        S.sections.forEach(function (sec) {
            var box = el('section', 'sh-sec');
            box.appendChild(el('h3', 'sh-st', (sec.title || 'Раздел').toUpperCase()));
            var grid = el('div', 'sh-rows'), cells = [];
            parseRows(sec.text).forEach(function (r) {
                if (r.k) {
                    var k = el('div', 'sh-k', r.k), v = el('div', 'sh-v', r.v);
                    grid.appendChild(k); grid.appendChild(v); cells = [k, v];
                } else {
                    var t = el('div', 'sh-t', r.v);
                    grid.appendChild(t); cells = [t];
                }
            });
            cells.forEach(function (n) { n.className += ' last'; });
            box.appendChild(grid);
            body.appendChild(box);
        });
        sh.appendChild(body);
        sh.appendChild(el('footer', 'sh-foot', 'dyrty11.github.io · конструктор шпаргалок'));

        fit();
        var pages = Math.max(1, Math.ceil((sh.offsetHeight - 2) / pg[1]));
        sh.classList.toggle('multi', pages > 1);
        setPageRule(S.orient, pages > 1);
        $('pages').textContent = pages === 1
            ? 'Лист A4 · помещается на одну страницу'
            : 'Лист A4 · примерно ' + pages + ' стр. Чтобы уместить на одной: уменьшите размер текста, выберите 3 колонки или сократите текст.';
    }

    function fit() {
        var sh = $('sheet'), sc = $('scaler'), st = $('stage');
        var pw = PAGE[S.orient][0];
        var avail = st.clientWidth - 32;
        var k = avail > 0 ? Math.min(1, avail / pw) : 1;
        scale = k;
        sh.style.transform = 'scale(' + k + ')';
        sc.style.width = Math.round(pw * k) + 'px';
        sc.style.height = Math.round(sh.offsetHeight * k) + 'px';
    }

    /* Размер и поля страницы для печати. Правило добавляется через CSSOM (inline-стили запрещены CSP). */
    function setPageRule(orient, multi) {
        var link = document.querySelector('link[href="cheatsheets.css"]');
        var sheet = link && link.sheet;
        if (!sheet) return;
        try {
            if (pageRuleIdx >= 0) sheet.deleteRule(pageRuleIdx);
            pageRuleIdx = sheet.cssRules.length;
            sheet.insertRule('@page { size: A4 ' + (orient === 'l' ? 'landscape' : 'portrait') + '; margin: ' + (multi ? '12mm' : '0') + '; }', pageRuleIdx);
        } catch (e) { pageRuleIdx = -1; }
    }

    /* ---------- редактор ---------- */
    function mkBtn(text, label, fn) {
        var b = el('button', 'icon-btn', text);
        b.type = 'button';
        b.setAttribute('aria-label', label);
        b.title = label;
        b.addEventListener('click', fn);
        return b;
    }

    function renderEditor() {
        var list = $('secList');
        list.textContent = '';
        S.sections.forEach(function (sec, i) {
            var card = el('div', 'sec-card'), head = el('div', 'sec-head');
            var inp = document.createElement('input');
            inp.type = 'text'; inp.maxLength = LIM.secTitle; inp.value = sec.title; inp.placeholder = 'Название раздела';
            inp.setAttribute('aria-label', 'Название раздела ' + (i + 1));
            inp.addEventListener('input', function () { sec.title = inp.value; changed(); });
            var up = mkBtn('↑', 'Поднять раздел ' + (i + 1), function () { move(i, -1); });
            var dn = mkBtn('↓', 'Опустить раздел ' + (i + 1), function () { move(i, 1); });
            var rm = mkBtn('✕', 'Удалить раздел ' + (i + 1), function () {
                if (!confirm('Удалить раздел «' + (sec.title || 'без названия') + '»?')) return;
                S.sections.splice(i, 1); renderEditor(); changed();
            });
            up.disabled = i === 0; dn.disabled = i === S.sections.length - 1;
            head.appendChild(inp); head.appendChild(up); head.appendChild(dn); head.appendChild(rm);
            var ta = document.createElement('textarea');
            ta.value = sec.text; ta.maxLength = LIM.secText; ta.spellcheck = false;
            ta.rows = Math.min(14, Math.max(4, sec.text.split('\n').length + 1));
            ta.placeholder = 'команда :: описание';
            ta.setAttribute('aria-label', 'Строки раздела ' + (i + 1));
            ta.addEventListener('input', function () { sec.text = ta.value; changed(); });
            card.appendChild(head); card.appendChild(ta);
            list.appendChild(card);
        });
        $('addSec').disabled = S.sections.length >= LIM.secs;
    }

    function move(i, d) {
        var j = i + d;
        if (j < 0 || j >= S.sections.length) return;
        var t = S.sections[i]; S.sections[i] = S.sections[j]; S.sections[j] = t;
        renderEditor(); changed();
    }

    function syncControls() {
        $('fTitle').value = S.title;
        $('fSub').value = S.subtitle;
        ['orient', 'cols', 'theme', 'size'].forEach(function (name) {
            Array.prototype.forEach.call(document.querySelectorAll('input[name="' + name + '"]'), function (r) { r.checked = String(S[name]) === r.value; });
        });
        syncAccents();
    }
    function syncAccents() {
        Array.prototype.forEach.call(document.querySelectorAll('.sw'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-c') === S.accent ? 'true' : 'false'); });
        $('accentCustom').value = S.accent;
    }
    function apply(next) { S = next; syncControls(); renderEditor(); renderSheet(); schedule(); }

    /* ---------- скачивание ---------- */
    function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'cheatsheet'; }
    function download(blob, name) {
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = name; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }

    function toMd() {
        function esc(s) { return s.replace(/\|/g, '\\|'); }
        function code(s) { return s.indexOf('`') >= 0 ? '`` ' + esc(s) + ' ``' : '`' + esc(s) + '`'; }
        var out = ['# ' + (S.title || 'Шпаргалка')];
        if (S.subtitle) out.push('', '_' + S.subtitle + '_');
        S.sections.forEach(function (sec) {
            out.push('', '## ' + (sec.title || 'Раздел'), '');
            var table = false;
            parseRows(sec.text).forEach(function (r) {
                if (r.k) {
                    if (!table) { out.push('| Что | Описание |', '|---|---|'); table = true; }
                    out.push('| ' + code(r.k) + ' | ' + esc(r.v) + ' |');
                } else {
                    if (table) { out.push(''); table = false; }
                    out.push(r.v, '');
                }
            });
        });
        return out.join('\n') + '\n';
    }

    /* PNG: рисуем лист на canvas по реальной раскладке DOM (позиции каждого символа), поэтому картинка совпадает с предпросмотром. */
    function drawPng() {
        var sh = $('sheet'), box = sh.getBoundingClientRect();
        var w = sh.offsetWidth, h = sh.offsetHeight;
        if (!w || !h) return;
        var k = box.width / w || 1;
        var sc = Math.min(2, Math.sqrt(16e6 / (w * h)));
        var cv = document.createElement('canvas');
        cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
        var ctx = cv.getContext('2d');
        if (!ctx) { say('Браузер не поддерживает рисование на canvas.'); return; }
        ctx.scale(sc, sc);
        ctx.textBaseline = 'alphabetic';
        var rng = document.createRange();

        function edge(x1, y1, x2, y2, bw, color, style) {
            ctx.strokeStyle = color; ctx.lineWidth = bw;
            ctx.setLineDash(style === 'dashed' ? [bw * 3, bw * 2] : style === 'dotted' ? [bw, bw] : []);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        function paintBox(e) {
            var r = e.getBoundingClientRect();
            if (!r.width || !r.height) return;
            var cs = getComputedStyle(e);
            var x = (r.left - box.left) / k, y = (r.top - box.top) / k, bw = r.width / k, bh = r.height / k;
            var bg = cs.backgroundColor;
            if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') { ctx.fillStyle = bg; ctx.fillRect(x, y, bw, bh); }
            var sides = [['Top', 0], ['Right', 1], ['Bottom', 2], ['Left', 3]];
            sides.forEach(function (sd) {
                var n = sd[0], t = parseFloat(cs['border' + n + 'Width']), st = cs['border' + n + 'Style'];
                if (!(t > 0) || st === 'none' || st === 'hidden') return;
                var col = cs['border' + n + 'Color'];
                if (sd[1] === 0) edge(x, y + t / 2, x + bw, y + t / 2, t, col, st);
                else if (sd[1] === 2) edge(x, y + bh - t / 2, x + bw, y + bh - t / 2, t, col, st);
                else if (sd[1] === 3) edge(x + t / 2, y, x + t / 2, y + bh, t, col, st);
                else edge(x + bw - t / 2, y, x + bw - t / 2, y + bh, t, col, st);
            });
        }
        function paintText(node) {
            var text = node.nodeValue;
            if (!text || !text.trim()) return;
            var cs = getComputedStyle(node.parentElement);
            ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
            ctx.fillStyle = cs.color;
            var m = ctx.measureText('Hg');
            var asc = typeof m.fontBoundingBoxAscent === 'number' ? m.fontBoundingBoxAscent : parseFloat(cs.fontSize) * 0.8;
            for (var i = 0; i < text.length;) {
                var len = text.codePointAt(i) > 0xffff ? 2 : 1, ch = text.substr(i, len), at = i;
                i += len;
                if (/\s/.test(ch)) continue;
                rng.setStart(node, at); rng.setEnd(node, at + len);
                var rs = rng.getClientRects();
                if (!rs.length) continue;
                ctx.fillText(ch, (rs[0].left - box.left) / k, (rs[0].top - box.top) / k + asc);
            }
        }

        paintBox(sh);
        var walker = document.createTreeWalker(sh, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT), n;
        while ((n = walker.nextNode())) { if (n.nodeType === 1) paintBox(n); else paintText(n); }

        cv.toBlob(function (blob) {
            if (!blob) { say('Не удалось создать картинку. Попробуйте «Печать / PDF».'); return; }
            download(blob, slug(S.title) + '.png');
            say('PNG сохранён.');
        }, 'image/png');
    }

    /* ---------- ссылка ---------- */
    function enc(text) {
        var b = new TextEncoder().encode(text), s = '';
        for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
        return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function dec(t) {
        t = t.replace(/-/g, '+').replace(/_/g, '/');
        while (t.length % 4) t += '=';
        var s = atob(t), b = new Uint8Array(s.length);
        for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
        return new TextDecoder().decode(b);
    }
    function fromHash() {
        var m = /^#s=([A-Za-z0-9_-]+)$/.exec(location.hash);
        if (!m || m[1].length > LIM.hash) return null;
        try { return normalize(JSON.parse(dec(m[1]))); } catch (e) { return null; }
    }

    /* ---------- запуск ---------- */
    function init() {
        var sel = $('tpl');
        var o0 = el('option', null, '— выберите шаблон —'); o0.value = ''; sel.appendChild(o0);
        TEMPLATES.forEach(function (t) { var o = el('option', null, t.name); o.value = t.id; sel.appendChild(o); });
        sel.addEventListener('change', function () {
            var t = TEMPLATES.filter(function (x) { return x.id === sel.value; })[0];
            sel.value = '';
            if (!t) return;
            if (!confirm('Заменить текущую шпаргалку шаблоном «' + t.name + '»? Несохранённые правки пропадут. Совет: сначала скачайте JSON.')) return;
            apply(fromTemplate(t));
            say('Шаблон «' + t.name + '» загружен.');
        });

        var shared = fromHash(), saved = null;
        try { saved = normalize(JSON.parse(readStore() || 'null')); } catch (e) { saved = null; }
        S = shared || saved || fromTemplate(TEMPLATES[0]);

        $('fTitle').addEventListener('input', function () { S.title = this.value; changed(); });
        $('fSub').addEventListener('input', function () { S.subtitle = this.value; changed(); });
        ['orient', 'cols', 'theme', 'size'].forEach(function (name) {
            Array.prototype.forEach.call(document.querySelectorAll('input[name="' + name + '"]'), function (r) {
                r.addEventListener('change', function () {
                    if (!r.checked) return;
                    S[name] = name === 'cols' ? parseInt(r.value, 10) : r.value;
                    changed();
                });
            });
        });

        var box = $('accents');
        ACCENTS.forEach(function (a) {
            var b = el('button', 'sw');
            b.type = 'button'; b.setAttribute('data-c', a[0]);
            b.style.setProperty('--c', a[0]);
            b.setAttribute('aria-label', 'Цвет: ' + a[1]); b.title = a[1];
            b.addEventListener('click', function () { S.accent = a[0]; syncAccents(); changed(); });
            box.appendChild(b);
        });
        $('accentCustom').addEventListener('input', function () {
            if (/^#[0-9a-f]{6}$/i.test(this.value)) { S.accent = this.value.toLowerCase(); syncAccents(); changed(); }
        });

        $('addSec').addEventListener('click', function () {
            if (S.sections.length >= LIM.secs) return;
            S.sections.push({ title: 'Новый раздел', text: 'что :: описание' });
            renderEditor(); changed();
            var tas = document.querySelectorAll('#secList textarea');
            if (tas.length) tas[tas.length - 1].focus();
        });

        var oldTitle = document.title;
        window.addEventListener('beforeprint', function () { oldTitle = document.title; document.title = S.title || 'Шпаргалка'; });
        window.addEventListener('afterprint', function () { document.title = oldTitle; });
        $('btnPrint').addEventListener('click', function () { window.print(); });
        $('btnPng').addEventListener('click', function () {
            var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
            ready.then(drawPng, drawPng);
        });
        $('btnMd').addEventListener('click', function () { download(new Blob([toMd()], { type: 'text/markdown;charset=utf-8' }), slug(S.title) + '.md'); say('Markdown сохранён.'); });
        $('btnJson').addEventListener('click', function () { download(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }), slug(S.title) + '.json'); say('JSON сохранён. Его можно открыть кнопкой «Открыть JSON».'); });
        $('btnImport').addEventListener('click', function () { $('importFile').click(); });
        $('importFile').addEventListener('change', function () {
            var f = this.files && this.files[0], inp = this;
            if (!f) return;
            if (f.size > LIM.file) { say('Файл слишком большой (максимум 200 КБ).'); inp.value = ''; return; }
            var rd = new FileReader();
            rd.onload = function () {
                var d = null;
                try { d = normalize(JSON.parse(String(rd.result))); } catch (e) { d = null; }
                if (d) { apply(d); say('Шпаргалка открыта из файла.'); } else say('Не получилось прочитать файл: это не шпаргалка в формате JSON.');
                inp.value = '';
            };
            rd.onerror = function () { say('Не удалось прочитать файл.'); inp.value = ''; };
            rd.readAsText(f);
        });
        $('btnLink').addEventListener('click', function () {
            var t = enc(JSON.stringify(S));
            if (t.length > LIM.hash) { say('Шпаргалка слишком большая для ссылки. Сохраните её как JSON.'); return; }
            var url = location.origin + location.pathname + '#s=' + t;
            try { history.replaceState(null, '', '#s=' + t); } catch (e) { /* ignore */ }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function () { say('Ссылка скопирована. Открыв её, любой увидит эту шпаргалку.'); }, function () { say('Ссылка в адресной строке: скопируйте её оттуда.'); });
            } else say('Ссылка в адресной строке: скопируйте её оттуда.');
        });
        $('btnReset').addEventListener('click', function () {
            if (!confirm('Начать с чистого листа? Текущая шпаргалка будет удалена.')) return;
            apply(blank());
            try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
            say('Новый чистый лист.');
        });

        syncControls(); renderEditor(); renderSheet();
        if (shared) say('Открыта шпаргалка по ссылке. Ваши сохранённые данные не тронуты, пока вы её не измените.');

        if (window.ResizeObserver) new ResizeObserver(function () { fit(); }).observe($('stage'));
        else window.addEventListener('resize', fit);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderSheet);
    }

    init();
})();
