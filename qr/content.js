/* Типы содержимого QR-кода: поля формы, сборка строки и разбор результата сканирования.
 * Всё считается в браузере, ничего не отправляется. */
(function () {
    'use strict';

    var opt = function (list) { return list.map(function (x) { return Array.isArray(x) ? x : [x, x]; }); };
    var digits = function (s) { return String(s || '').replace(/\D+/g, ''); };
    var trim = function (s) { return String(s == null ? '' : s).trim(); };
    var esc = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); };
    var escWifi = function (s) { return String(s || '').replace(/([\\;,:"])/g, '\\$1'); };
    var noBar = function (s) { return trim(s).replace(/\|/g, ' '); };

    function normUrl(u) {
        u = trim(u);
        if (!u) return '';
        if (/^(https?|ftp|mailto|tel|sms|geo|market|intent|tg|viber|whatsapp|skype|facetime|spotify|steam|zoommtg):/i.test(u)) return u;
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) return u;
        return 'https://' + u.replace(/^\/+/, '');
    }
    function ibanOk(s) {
        s = String(s || '').replace(/\s+/g, '').toUpperCase();
        if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
        var r = s.slice(4) + s.slice(0, 4), rem = 0;
        for (var i = 0; i < r.length; i++) {
            var c = r.charCodeAt(i), v = c >= 65 ? String(c - 55) : r[i];
            for (var k = 0; k < v.length; k++) rem = (rem * 10 + Number(v[k])) % 97;
        }
        return rem === 1;
    }
    function dt(v, allDay) {
        // "2026-11-20T19:30" -> "20261120T193000"
        var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v || '');
        if (!m) return '';
        return allDay ? m[1] + m[2] + m[3] : m[1] + m[2] + m[3] + 'T' + (m[4] || '00') + (m[5] || '00') + '00';
    }
    function geoUrl(v) {
        var lat = trim(v.lat).replace(',', '.'), lon = trim(v.lon).replace(',', '.');
        if (!/^-?\d+(\.\d+)?$/.test(lat) || !/^-?\d+(\.\d+)?$/.test(lon)) return '';
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return '';
        var label = trim(v.label);
        switch (v.format) {
            case 'google': return 'https://maps.google.com/?q=' + lat + ',' + lon;
            case 'yandex': return 'https://yandex.ru/maps/?pt=' + lon + ',' + lat + '&z=16&l=map';
            case 'apple': return 'https://maps.apple.com/?ll=' + lat + ',' + lon + (label ? '&q=' + encodeURIComponent(label) : '');
            default: return 'geo:' + lat + ',' + lon + (label ? '?q=' + lat + ',' + lon + '(' + encodeURIComponent(label) + ')' : '');
        }
    }

    var SOCIAL = {
        instagram: ['Instagram', 'https://instagram.com/'], vk: ['VK', 'https://vk.com/'], youtube: ['YouTube (канал)', 'https://youtube.com/@'],
        tiktok: ['TikTok', 'https://tiktok.com/@'], github: ['GitHub', 'https://github.com/'], x: ['X', 'https://x.com/'],
        facebook: ['Facebook', 'https://facebook.com/'], linkedin: ['LinkedIn', 'https://linkedin.com/in/'], twitch: ['Twitch', 'https://twitch.tv/'],
        pinterest: ['Pinterest', 'https://pinterest.com/'], reddit: ['Reddit', 'https://reddit.com/user/'], discord: ['Discord (код приглашения)', 'https://discord.gg/'],
        ok: ['Одноклассники', 'https://ok.ru/'], max: ['Свой адрес', '']
    };
    var CRYPTO = { bitcoin: ['Bitcoin (BTC)', 'bitcoin'], litecoin: ['Litecoin (LTC)', 'litecoin'], dogecoin: ['Dogecoin (DOGE)', 'dogecoin'], ethereum: ['Ethereum (ETH)', 'ethereum'], monero: ['Monero (XMR)', 'monero'], tron: ['TRON / USDT TRC20 (адрес)', ''] };

    var TYPES = [
        { id: 'text', label: 'Текст', group: 'Основное', hint: 'Любой текст до нескольких тысяч символов.',
          fields: [{ id: 'text', label: 'Текст', kind: 'textarea', ph: 'Привет! Это мой первый QR-код', req: 1 }],
          build: function (v) { return String(v.text || ''); } },

        { id: 'url', label: 'Ссылка', group: 'Основное', hint: 'Адрес сайта. Если не указать https://, он добавится сам.',
          fields: [
              { id: 'url', label: 'Адрес', kind: 'text', ph: 'example.com/page', req: 1 },
              { id: 'utm', label: 'Добавить метки UTM (для статистики переходов)', kind: 'checkbox' },
              { id: 'src', label: 'utm_source', kind: 'text', ph: 'poster', show: 'utm' },
              { id: 'med', label: 'utm_medium', kind: 'text', ph: 'qr', show: 'utm' },
              { id: 'cmp', label: 'utm_campaign', kind: 'text', ph: 'autumn-2026', show: 'utm' }
          ],
          build: function (v) {
              var u = normUrl(v.url);
              if (!u || !v.utm) return u;
              try {
                  var o = new URL(u);
                  if (trim(v.src)) o.searchParams.set('utm_source', trim(v.src));
                  if (trim(v.med)) o.searchParams.set('utm_medium', trim(v.med));
                  if (trim(v.cmp)) o.searchParams.set('utm_campaign', trim(v.cmp));
                  return o.toString();
              } catch (e) { return u; }
          } },

        { id: 'wifi', label: 'Wi‑Fi', group: 'Связь', hint: 'Гость наводит камеру и подключается без ввода пароля.',
          fields: [
              { id: 'ssid', label: 'Название сети (SSID)', kind: 'text', req: 1, ph: 'Home-5G' },
              { id: 'pass', label: 'Пароль', kind: 'text', ph: 'оставьте пустым для открытой сети' },
              { id: 'enc', label: 'Защита', kind: 'select', opts: opt([['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP (устаревшая)'], ['nopass', 'Без пароля']]), def: 'WPA' },
              { id: 'hidden', label: 'Скрытая сеть', kind: 'checkbox' }
          ],
          build: function (v) {
              if (!trim(v.ssid)) return '';
              var enc = v.enc || 'WPA';
              return 'WIFI:T:' + (enc === 'nopass' ? 'nopass' : enc) + ';S:' + escWifi(v.ssid) + ';' + (enc !== 'nopass' && v.pass ? 'P:' + escWifi(v.pass) + ';' : '') + (v.hidden ? 'H:true;' : '') + ';';
          } },

        { id: 'vcard', label: 'Визитка', group: 'Связь', hint: 'Контакт, который сохраняется в телефонную книгу одним касанием (vCard).',
          fields: [
              { id: 'first', label: 'Имя', kind: 'text', req: 1 }, { id: 'last', label: 'Фамилия', kind: 'text' },
              { id: 'org', label: 'Компания', kind: 'text' }, { id: 'title', label: 'Должность', kind: 'text' },
              { id: 'mobile', label: 'Телефон мобильный', kind: 'tel', ph: '+7 900 000-00-00' }, { id: 'work', label: 'Телефон рабочий', kind: 'tel' },
              { id: 'email', label: 'Email', kind: 'email' }, { id: 'site', label: 'Сайт', kind: 'text' },
              { id: 'street', label: 'Улица, дом', kind: 'text' }, { id: 'city', label: 'Город', kind: 'text' },
              { id: 'zip', label: 'Индекс', kind: 'text' }, { id: 'country', label: 'Страна', kind: 'text' },
              { id: 'note', label: 'Заметка', kind: 'textarea' }
          ],
          build: function (v) {
              if (!trim(v.first) && !trim(v.last)) return '';
              var L = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + esc(trim(v.last)) + ';' + esc(trim(v.first)) + ';;;', 'FN:' + esc((trim(v.first) + ' ' + trim(v.last)).trim())];
              if (trim(v.org)) L.push('ORG:' + esc(trim(v.org)));
              if (trim(v.title)) L.push('TITLE:' + esc(trim(v.title)));
              if (trim(v.mobile)) L.push('TEL;TYPE=CELL:' + trim(v.mobile));
              if (trim(v.work)) L.push('TEL;TYPE=WORK,VOICE:' + trim(v.work));
              if (trim(v.email)) L.push('EMAIL;TYPE=INTERNET:' + trim(v.email));
              if (trim(v.site)) L.push('URL:' + normUrl(v.site));
              if (trim(v.street) || trim(v.city) || trim(v.zip) || trim(v.country)) L.push('ADR;TYPE=WORK:;;' + esc(trim(v.street)) + ';' + esc(trim(v.city)) + ';;' + esc(trim(v.zip)) + ';' + esc(trim(v.country)));
              if (trim(v.note)) L.push('NOTE:' + esc(trim(v.note)));
              L.push('END:VCARD');
              return L.join('\n');
          } },

        { id: 'email', label: 'Email', group: 'Основное', hint: 'Открывает письмо с готовой темой и текстом.',
          fields: [{ id: 'to', label: 'Кому', kind: 'email', req: 1, ph: 'name@example.com' }, { id: 'subject', label: 'Тема', kind: 'text' }, { id: 'body', label: 'Текст письма', kind: 'textarea' }],
          build: function (v) {
              if (!trim(v.to)) return '';
              var q = [];
              if (trim(v.subject)) q.push('subject=' + encodeURIComponent(trim(v.subject)));
              if (trim(v.body)) q.push('body=' + encodeURIComponent(v.body));
              return 'mailto:' + trim(v.to) + (q.length ? '?' + q.join('&') : '');
          } },

        { id: 'phone', label: 'Телефон', group: 'Основное', hint: 'Набор номера по касанию.',
          fields: [{ id: 'tel', label: 'Номер', kind: 'tel', req: 1, ph: '+7 900 000-00-00' }],
          build: function (v) { var t = trim(v.tel).replace(/[^\d+]/g, ''); return t ? 'tel:' + t : ''; } },

        { id: 'sms', label: 'SMS', group: 'Основное', hint: 'Готовое сообщение на указанный номер.',
          fields: [{ id: 'tel', label: 'Номер', kind: 'tel', req: 1 }, { id: 'msg', label: 'Текст', kind: 'textarea' }],
          build: function (v) { var t = trim(v.tel).replace(/[^\d+]/g, ''); return t ? 'SMSTO:' + t + ':' + (v.msg || '') : ''; } },

        { id: 'whatsapp', label: 'WhatsApp', group: 'Связь', hint: 'Чат с номером и первым сообщением.',
          fields: [{ id: 'tel', label: 'Номер с кодом страны', kind: 'tel', req: 1, ph: '+7 900 000-00-00' }, { id: 'msg', label: 'Сообщение', kind: 'textarea' }],
          build: function (v) { var d = digits(v.tel); return d ? 'https://wa.me/' + d + (trim(v.msg) ? '?text=' + encodeURIComponent(v.msg) : '') : ''; } },

        { id: 'telegram', label: 'Telegram', group: 'Связь', hint: 'Профиль, канал или бот по имени пользователя.',
          fields: [{ id: 'user', label: 'Имя пользователя', kind: 'text', req: 1, ph: '@username' }],
          build: function (v) { var u = trim(v.user).replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, ''); return /^[A-Za-z0-9_]{3,64}$/.test(u) ? 'https://t.me/' + u : ''; } },

        { id: 'social', label: 'Соцсеть', group: 'Связь', hint: 'Ссылка на профиль. Выберите сеть и впишите имя.',
          fields: [{ id: 'net', label: 'Сеть', kind: 'select', opts: Object.keys(SOCIAL).map(function (k) { return [k, SOCIAL[k][0]]; }), def: 'instagram' },
                   { id: 'user', label: 'Имя пользователя (или полный адрес для «Свой адрес»)', kind: 'text', req: 1 }],
          build: function (v) {
              var n = SOCIAL[v.net || 'instagram'] || SOCIAL.instagram, u = trim(v.user).replace(/^@/, '');
              if (!u) return '';
              return n[1] ? n[1] + encodeURIComponent(u).replace(/%2F/gi, '/') : normUrl(u);
          } },

        { id: 'sbp', label: 'Оплата по реквизитам', group: 'Деньги', hint: 'Банковский QR по ГОСТ Р 56042: приложение банка само подставит получателя, счёт и сумму.',
          fields: [
              { id: 'name', label: 'Получатель', kind: 'text', req: 1, ph: 'ООО «Ромашка» или ИП Иванов И. И.' },
              { id: 'acc', label: 'Расчётный счёт (20 цифр)', kind: 'text', req: 1, ph: '40702810000000000000' },
              { id: 'bank', label: 'Банк', kind: 'text', req: 1, ph: 'ПАО Сбербанк' },
              { id: 'bic', label: 'БИК (9 цифр)', kind: 'text', req: 1, ph: '044525225' },
              { id: 'corr', label: 'Корр. счёт (20 цифр)', kind: 'text', req: 1, ph: '30101810400000000225' },
              { id: 'inn', label: 'ИНН получателя', kind: 'text', ph: '10 или 12 цифр' }, { id: 'kpp', label: 'КПП', kind: 'text', ph: '9 цифр, если есть' },
              { id: 'sum', label: 'Сумма, ₽ (необязательно)', kind: 'text', ph: '1500,00' },
              { id: 'purpose', label: 'Назначение платежа', kind: 'text', ph: 'Оплата по счёту № 12' },
              { id: 'payer', label: 'ФИО плательщика (необязательно)', kind: 'text' }
          ],
          check: function (v) {
              var e = [];
              if (v.acc && digits(v.acc).length !== 20) e.push('Расчётный счёт должен содержать 20 цифр.');
              if (v.bic && digits(v.bic).length !== 9) e.push('БИК состоит из 9 цифр.');
              if (v.corr && digits(v.corr).length !== 20) e.push('Корр. счёт: 20 цифр (для банков без него поставьте нули).');
              if (v.inn && [10, 12].indexOf(digits(v.inn).length) < 0) e.push('ИНН: 10 цифр для организации, 12 для человека.');
              return e;
          },
          build: function (v) {
              if (!trim(v.name) || !trim(v.acc) || !trim(v.bank) || !trim(v.bic) || !trim(v.corr)) return '';
              var p = ['ST00012', 'Name=' + noBar(v.name), 'PersonalAcc=' + digits(v.acc), 'BankName=' + noBar(v.bank), 'BIC=' + digits(v.bic), 'CorrespAcc=' + digits(v.corr)];
              var sum = trim(v.sum).replace(',', '.');
              if (/^\d+(\.\d{1,2})?$/.test(sum) && Number(sum) > 0) p.push('Sum=' + Math.round(Number(sum) * 100));
              if (trim(v.purpose)) p.push('Purpose=' + noBar(v.purpose));
              if (trim(v.inn)) p.push('PayeeINN=' + digits(v.inn));
              if (trim(v.kpp)) p.push('KPP=' + digits(v.kpp));
              if (trim(v.payer)) p.push('LastName=' + noBar(v.payer));
              return p.join('|');
          } },

        { id: 'epc', label: 'Перевод в евро (SEPA)', group: 'Деньги', hint: 'EPC QR: приложения банков еврозоны заполняют платёж сами.',
          fields: [
              { id: 'name', label: 'Получатель (до 70 символов)', kind: 'text', req: 1 }, { id: 'iban', label: 'IBAN', kind: 'text', req: 1, ph: 'DE89 3704 0044 0532 0130 00' },
              { id: 'bic', label: 'BIC (необязательно)', kind: 'text' }, { id: 'amount', label: 'Сумма, EUR', kind: 'text', ph: '25.00' },
              { id: 'ref', label: 'Назначение (до 140 символов)', kind: 'text' }
          ],
          check: function (v) { return v.iban && !ibanOk(v.iban) ? ['Контрольная сумма IBAN не сходится: проверьте номер.'] : []; },
          build: function (v) {
              if (!trim(v.name) || !trim(v.iban)) return '';
              var a = trim(v.amount).replace(',', '.');
              return ['BCD', '002', '1', 'SCT', trim(v.bic).replace(/\s+/g, ''), trim(v.name).slice(0, 70), trim(v.iban).replace(/\s+/g, '').toUpperCase(),
                  /^\d+(\.\d{1,2})?$/.test(a) && Number(a) > 0 ? 'EUR' + Number(a).toFixed(2) : '', '', '', trim(v.ref).slice(0, 140)].join('\n');
          } },

        { id: 'crypto', label: 'Криптовалюта', group: 'Деньги', hint: 'Адрес кошелька. Сумму в QR поддерживают не все кошельки.',
          fields: [{ id: 'coin', label: 'Монета', kind: 'select', opts: Object.keys(CRYPTO).map(function (k) { return [k, CRYPTO[k][0]]; }), def: 'bitcoin' },
                   { id: 'addr', label: 'Адрес кошелька', kind: 'text', req: 1 }, { id: 'amount', label: 'Сумма (необязательно)', kind: 'text' }, { id: 'label', label: 'Метка', kind: 'text' }],
          check: function (v) { return v.addr && !/^[A-Za-z0-9]{20,120}$/.test(trim(v.addr)) ? ['Адрес выглядит необычно: проверьте, что скопировали его целиком.'] : []; },
          build: function (v) {
              var a = trim(v.addr); if (!a) return '';
              var c = CRYPTO[v.coin || 'bitcoin'] || CRYPTO.bitcoin;
              if (!c[1]) return a;
              var q = [], am = trim(v.amount).replace(',', '.');
              if (/^\d+(\.\d+)?$/.test(am) && v.coin !== 'ethereum') q.push((v.coin === 'monero' ? 'tx_amount=' : 'amount=') + am);
              if (trim(v.label) && v.coin !== 'ethereum') q.push('label=' + encodeURIComponent(trim(v.label)));
              return c[1] + ':' + a + (q.length ? '?' + q.join('&') : '');
          } },

        { id: 'geo', label: 'Место на карте', group: 'Прочее', hint: 'Точка на карте. Можно взять текущее местоположение.',
          fields: [{ id: 'lat', label: 'Широта', kind: 'text', req: 1, ph: '55.7558' }, { id: 'lon', label: 'Долгота', kind: 'text', req: 1, ph: '37.6173' },
                   { kind: 'action', action: 'locate', label: 'Моё местоположение' },
                   { id: 'label', label: 'Подпись', kind: 'text' },
                   { id: 'format', label: 'Формат', kind: 'select', opts: opt([['geo', 'Универсальный (geo:)'], ['google', 'Google Карты'], ['yandex', 'Яндекс Карты'], ['apple', 'Apple Карты']]), def: 'geo' }],
          build: geoUrl },

        { id: 'event', label: 'Событие', group: 'Прочее', hint: 'Добавляется в календарь телефона (vEvent).',
          fields: [{ id: 'title', label: 'Название', kind: 'text', req: 1 }, { id: 'allday', label: 'Весь день', kind: 'checkbox' },
                   { id: 'start', label: 'Начало', kind: 'datetime-local', req: 1 }, { id: 'end', label: 'Конец', kind: 'datetime-local' },
                   { id: 'place', label: 'Место', kind: 'text' }, { id: 'desc', label: 'Описание', kind: 'textarea' }],
          build: function (v) {
              if (!trim(v.title) || !dt(v.start, 1)) return '';
              var all = !!v.allday, L = ['BEGIN:VEVENT', 'SUMMARY:' + esc(trim(v.title)), 'DTSTART' + (all ? ';VALUE=DATE' : '') + ':' + dt(v.start, all)];
              if (dt(v.end, 1)) L.push('DTEND' + (all ? ';VALUE=DATE' : '') + ':' + dt(v.end, all));
              if (trim(v.place)) L.push('LOCATION:' + esc(trim(v.place)));
              if (trim(v.desc)) L.push('DESCRIPTION:' + esc(trim(v.desc)));
              L.push('END:VEVENT');
              return L.join('\n');
          } },

        { id: 'otp', label: 'Ключ 2FA (TOTP)', group: 'Прочее', hint: 'Для переноса кода двухфакторной защиты в приложение-аутентификатор. Не публикуйте такой QR.',
          fields: [{ id: 'issuer', label: 'Сервис', kind: 'text', req: 1, ph: 'Example' }, { id: 'acct', label: 'Аккаунт', kind: 'text', req: 1, ph: 'me@example.com' },
                   { id: 'secret', label: 'Секретный ключ (Base32)', kind: 'text', req: 1, ph: 'JBSWY3DPEHPK3PXP' },
                   { id: 'digits', label: 'Цифр в коде', kind: 'select', opts: opt(['6', '7', '8']), def: '6' }, { id: 'period', label: 'Период, сек', kind: 'select', opts: opt(['30', '60']), def: '30' }],
          check: function (v) { return v.secret && !/^[A-Z2-7 ]+=*$/i.test(trim(v.secret)) ? ['Ключ должен состоять из букв A–Z и цифр 2–7.'] : []; },
          build: function (v) {
              var s = trim(v.secret).replace(/\s+/g, '').toUpperCase();
              if (!trim(v.issuer) || !trim(v.acct) || !s) return '';
              return 'otpauth://totp/' + encodeURIComponent(trim(v.issuer)) + ':' + encodeURIComponent(trim(v.acct)) + '?secret=' + s + '&issuer=' + encodeURIComponent(trim(v.issuer)) + '&digits=' + (v.digits || 6) + '&period=' + (v.period || 30);
          } }
    ];

    var byId = {};
    TYPES.forEach(function (t) { byId[t.id] = t; });

    function defaults(type) {
        var o = {};
        (byId[type] || TYPES[0]).fields.forEach(function (f) { if (f.id) o[f.id] = f.def != null ? f.def : (f.kind === 'checkbox' ? false : ''); });
        return o;
    }
    function build(type, values) { var t = byId[type]; return t ? String(t.build(values || {}) || '') : ''; }
    function check(type, values) { var t = byId[type]; return t && t.check ? t.check(values || {}) : []; }

    /* ---------- разбор того, что нашёл сканер ---------- */
    function unesc(s) { return String(s || '').replace(/\\([\\;,:"nN])/g, function (_, c) { return c === 'n' || c === 'N' ? '\n' : c; }); }
    function describe(raw) {
        var t = String(raw || ''), m;
        if (/^WIFI:/i.test(t)) {
            var g = function (k) { var r = new RegExp('(?:^|;)' + k + ':((?:\\\\.|[^;])*)', 'i').exec(t.slice(5)); return r ? unesc(r[1]) : ''; };
            return { kind: 'Wi‑Fi', type: 'wifi', rows: [['Сеть', g('S')], ['Пароль', g('P') || '—'], ['Защита', g('T') || '—'], ['Скрытая', /H:true/i.test(t) ? 'да' : 'нет']] };
        }
        if (/^BEGIN:VCARD/i.test(t)) {
            var f = function (k) { var r = new RegExp('^' + k + '[^:\\n]*:(.*)$', 'im').exec(t); return r ? unesc(r[1]).trim() : ''; };
            return { kind: 'Визитка', type: 'vcard', rows: [['Имя', f('FN')], ['Компания', f('ORG')], ['Телефон', f('TEL')], ['Email', f('EMAIL')], ['Сайт', f('URL')]].filter(function (r) { return r[1]; }) };
        }
        if (/^BEGIN:VEVENT/i.test(t)) {
            var e = function (k) { var r = new RegExp('^' + k + '[^:\\n]*:(.*)$', 'im').exec(t); return r ? unesc(r[1]).trim() : ''; };
            return { kind: 'Событие', type: 'event', rows: [['Название', e('SUMMARY')], ['Начало', e('DTSTART')], ['Конец', e('DTEND')], ['Место', e('LOCATION')]].filter(function (r) { return r[1]; }) };
        }
        if (/^ST0001[12]?\|/i.test(t)) {
            var kv = {}; t.split('|').slice(1).forEach(function (p) { var i = p.indexOf('='); if (i > 0) kv[p.slice(0, i)] = p.slice(i + 1); });
            return { kind: 'Банковский платёж (ГОСТ Р 56042)', type: 'sbp', rows: [['Получатель', kv.Name], ['Счёт', kv.PersonalAcc], ['Банк', kv.BankName], ['БИК', kv.BIC], ['Сумма', kv.Sum ? (Number(kv.Sum) / 100).toFixed(2) + ' ₽' : ''], ['Назначение', kv.Purpose]].filter(function (r) { return r[1]; }) };
        }
        if (/^BCD\n/.test(t)) { var p = t.split('\n'); return { kind: 'Перевод SEPA', type: 'epc', rows: [['Получатель', p[5]], ['IBAN', p[6]], ['Сумма', p[7]], ['Назначение', p[10]]].filter(function (r) { return r[1]; }) }; }
        if (/^otpauth:/i.test(t)) return { kind: 'Ключ 2FA', type: 'otp', rows: [['Содержимое', 'секретный ключ, не показываю его целиком']], secret: true };
        if ((m = /^(mailto|tel|smsto|sms|geo):(.*)$/i.exec(t))) return { kind: { mailto: 'Email', tel: 'Телефон', smsto: 'SMS', sms: 'SMS', geo: 'Место на карте' }[m[1].toLowerCase()], type: m[1].toLowerCase(), rows: [['Содержимое', decodeURIComponent(m[2].replace(/%(?![0-9a-f]{2})/gi, '%25'))]] };
        if (/^(bitcoin|litecoin|dogecoin|ethereum|monero):/i.test(t)) return { kind: 'Криптовалюта', type: 'crypto', rows: [['Содержимое', t]] };
        if (/^https?:\/\//i.test(t)) {
            var host = ''; try { host = new URL(t).hostname; } catch (x) { /* пусто */ }
            return { kind: 'Ссылка', type: 'url', rows: [['Сайт', host], ['Адрес', t]], link: t, punycode: /(^|\.)xn--/i.test(host) };
        }
        return { kind: 'Текст', type: 'text', rows: [] };
    }

    window.QRContent = { types: TYPES, byId: byId, defaults: defaults, build: build, check: check, describe: describe, normUrl: normUrl, groups: ['Основное', 'Связь', 'Деньги', 'Прочее'] };
})();
