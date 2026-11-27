import { ESPLoader, Transport } from "./esptool-js.js";

const $ = (id) => document.getElementById(id);
const root = $("root");
const logEl = $("log");

if (!("serial" in navigator)) root.classList.add("nosupport");

// Идентификатор чипа в заголовке образа (байты 12-13) -> имя
const CHIP_IDS = { 0: "ESP32", 2: "ESP32-S2", 5: "ESP32-C3", 9: "ESP32-S3", 12: "ESP32-C2", 13: "ESP32-C6", 16: "ESP32-H2", 18: "ESP32-P4", 20: "ESP32-C61", 23: "ESP32-C5" };
const KIND = { full: "полный образ", app: "приложение", boot: "загрузчик", parttable: "таблица разделов", other: "данные" };

let transport = null, loader = null, busy = false;
let chipName = "";            // например "ESP32-S3"
let bootOffset = 0;           // где у этого чипа лежит загрузчик
let files = [];               // { name, bytes, kind, chip, suggest, addrText, auto }
let eraseTouched = false;

// ---------- журнал и статус ----------
function log(s) { logEl.hidden = false; logEl.textContent += s + "\n"; logEl.scrollTop = logEl.scrollHeight; }
function logPart(s) { logEl.hidden = false; logEl.textContent += s; logEl.scrollTop = logEl.scrollHeight; }
const terminal = { clean() { logEl.textContent = ""; }, writeLine(d) { log(d); }, write(d) { logPart(d); } };
function setStatus(t) { $("status").textContent = t; }
function setBar(frac, indeterminate) {
  $("bar").classList.toggle("busy", !!indeterminate);
  $("barFill").style.width = indeterminate ? "" : Math.round(Math.max(0, Math.min(1, frac)) * 100) + "%";
}
function note(el, cls, html) { el.innerHTML = html ? `<div class="note ${cls}">${html}</div>` : ""; }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function fmtSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(2) + " МБ" : (n / 1024).toFixed(1) + " КБ"; }
function hex(n) { return "0x" + n.toString(16).toUpperCase(); }
function errText(e) { return e && e.message ? e.message : String(e); }
function el(tag, cls, text) { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }

function setConn(state, text) {
  const p = $("pillConn");
  p.className = "pill" + (state === "ok" ? " ok" : state === "bad" ? " bad" : "");
  $("pillText").textContent = text;
}

function family(name) { const m = /ESP32(-[A-Z0-9]+)?/i.exec(name || ""); return m ? m[0].toUpperCase() : ""; }

// ---------- разбор файла ----------
function classify(b) {
  const r = { kind: "other", chip: null, suggest: null };
  if (b.length >= 2 && b[0] === 0xAA && b[1] === 0x50) { r.kind = "parttable"; r.suggest = 0x8000; return r; }
  if (b.length < 32 || b[0] !== 0xE9) return r;
  r.chip = CHIP_IDS[b[12] | (b[13] << 8)] || null;
  if (b.length > 0x8002 && b[0x8000] === 0xAA && b[0x8001] === 0x50) { r.kind = "full"; r.suggest = 0x0; return r; }
  if (b.length > 0x7002 && b[0x7000] === 0xAA && b[0x7001] === 0x50) { r.kind = "full"; r.suggest = 0x1000; return r; }
  if (b.length < 0x10000) { r.kind = "boot"; r.suggest = bootOffset; return r; }
  r.kind = "app"; r.suggest = 0x10000;
  return r;
}

function parseAddr(t) {
  t = String(t).trim();
  if (!/^(0x)?[0-9a-fA-F]+$/.test(t)) return NaN;
  return parseInt(t.replace(/^0x/i, ""), 16);
}

function bootable() {
  if (files.some((f) => f.kind === "full")) return true;
  return files.some((f) => f.kind === "boot") && files.some((f) => f.kind === "parttable");
}

// ---------- проверка и состояние кнопок ----------
function refresh() {
  let block = false;
  const globalMsgs = [];
  const ranges = [];

  for (const f of files) {
    let msg = "", cls = "";
    const a = parseAddr(f.addrText);
    if (Number.isNaN(a)) { msg = f.addrText.trim() ? "Адрес указан неверно. Пример: 0x10000." : "Укажите адрес, по которому записать файл. Пример: 0x10000."; cls = "bad"; block = true; }
    else {
      ranges.push({ f, a, end: a + f.bytes.length });
      if (loader && f.chip && family(f.chip) !== family(chipName)) { msg = `Файл для ${f.chip}, а подключён ${chipName}. Запись отключена.`; cls = "bad"; block = true; }
      else if (f.kind === "full" && a !== f.suggest) { msg = `Полный образ этого файла нужно писать с ${hex(f.suggest)}.`; cls = "bad"; block = true; }
      else if (f.kind === "other") { msg = "Не похоже на образ ESP. Подойдёт для данных (например, файловой системы) по известному адресу."; cls = "warn"; }
      else if (f.kind === "app" && a === 0) { msg = "Приложение по адресу 0x0 затрёт загрузчик. Обычно приложение пишут с 0x10000."; cls = "warn"; }
    }
    if (f.msgEl) { f.msgEl.textContent = msg; f.msgEl.className = "rowmsg" + (cls ? " " + cls : ""); }
  }

  ranges.sort((x, y) => x.a - y.a);
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].a < ranges[i - 1].end) { globalMsgs.push({ cls: "bad", t: `Файлы «${esc(ranges[i - 1].f.name)}» и «${esc(ranges[i].f.name)}» пересекаются по адресам.` }); block = true; break; }
  }
  const erase = $("chkErase").checked;
  if (files.length && erase && !bootable()) { globalMsgs.push({ cls: "bad", t: "После полного стирания плата не запустится без загрузчика и таблицы разделов. Возьмите полный образ или добавьте оба файла, либо снимите галочку стирания." }); block = true; }
  else if (files.length && bootable()) { globalMsgs.push({ cls: "ok", t: "Есть всё нужное для запуска: загрузчик, таблица разделов и программа." }); }
  const noteEl = $("fileNote");
  noteEl.innerHTML = globalMsgs.map((m) => `<div class="note ${m.cls}">${m.t}</div>`).join("");

  $("btnFlash").disabled = busy || !loader || !files.length || block;
  $("btnErase").disabled = busy || !loader;
  $("btnBackup").disabled = busy || !loader;
  $("btnConnect").disabled = busy || !!loader;
  $("btnDisconnect").hidden = !loader;
  $("btnDisconnect").disabled = busy;
}

// ---------- список файлов ----------
function renderFiles() {
  const box = $("files");
  box.textContent = "";
  $("fileinfo").textContent = files.length ? `Файлов: ${files.length}, всего ${fmtSize(files.reduce((s, f) => s + f.bytes.length, 0))}.` : "Файлы не выбраны.";
  for (const f of files) {
    const row = el("div", "frow");
    const info = el("div", "finfo");
    info.append(el("b", "fname", f.name), el("span", "fmeta", `${fmtSize(f.bytes.length)} · ${KIND[f.kind]}${f.chip ? " · " + f.chip : ""}`));
    const addr = el("input", "faddr");
    addr.type = "text"; addr.value = f.addrText; addr.setAttribute("list", "addrs"); addr.spellcheck = false; addr.autocomplete = "off";
    addr.setAttribute("aria-label", "Адрес для " + f.name);
    addr.addEventListener("input", () => { f.addrText = addr.value; f.auto = false; refresh(); });
    const rem = el("button", "b frem", "Убрать");
    rem.type = "button";
    rem.addEventListener("click", () => { files = files.filter((x) => x !== f); afterFilesChange(); });
    const msg = el("div", "rowmsg");
    f.msgEl = msg;
    row.append(info, addr, rem, msg);
    box.append(row);
  }
}

function afterFilesChange() {
  if (!eraseTouched) $("chkErase").checked = bootable();
  renderFiles();
  refresh();
}

function applySuggestions() {   // после подключения известно, где у чипа загрузчик
  for (const f of files) if (f.auto && f.kind === "boot") f.addrText = hex(bootOffset);
}

const drop = $("drop"), fileInput = $("file");
drop.addEventListener("click", () => fileInput.click());
drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => { if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files)); });
fileInput.addEventListener("change", () => { const picked = Array.from(fileInput.files); fileInput.value = ""; if (picked.length) addFiles(picked); });
$("chkErase").addEventListener("input", () => { eraseTouched = true; refresh(); });

async function addFiles(list) {
  const skipped = [];
  for (const f of list) {
    if (f.size === 0 || f.size > 32 * 1024 * 1024) { skipped.push(f.name); continue; }
    const bytes = new Uint8Array(await f.arrayBuffer());
    const c = classify(bytes);
    files.push({ name: f.name, bytes, kind: c.kind, chip: c.chip, suggest: c.suggest, addrText: c.suggest == null ? "" : hex(c.suggest), auto: true });
  }
  afterFilesChange();
  if (skipped.length) $("fileinfo").textContent += ` Пропущены (пустые или больше 32 МБ): ${skipped.join(", ")}.`;
}

// ---------- подключение ----------
async function connect() {
  if (loader || busy) return;
  busy = true; refresh();
  setStatus("Выберите порт в окне браузера…");
  setConn("", "Подключение…");
  let port;
  try {
    const opts = $("chkEspOnly").checked ? { filters: [{ usbVendorId: 0x303a }] } : {};
    port = await navigator.serial.requestPort(opts);
  } catch (e) {
    busy = false; setConn("", "Не подключено");
    setStatus(e && e.name === "NotFoundError" ? "Порт не выбран. Если нужного устройства нет в списке, снимите галочку «только Espressif» или включите режим загрузки." : "Не удалось открыть выбор порта: " + errText(e));
    refresh();
    return;
  }
  try {
    setStatus("Подключаюсь… Это занимает несколько секунд.");
    transport = new Transport(port, false);
    if (transport.setDeviceLostCallback) transport.setDeviceLostCallback(onLost);
    loader = new ESPLoader({ transport, baudrate: Number($("selBaud").value), romBaudrate: 115200, terminal });
    const desc = await loader.main();
    chipName = (loader.chip && loader.chip.CHIP_NAME) || family(desc) || desc;
    bootOffset = loader.chip && typeof loader.chip.BOOTLOADER_FLASH_OFFSET === "number" ? loader.chip.BOOTLOADER_FLASH_OFFSET : 0;
    log("Чип: " + desc);
    let flash = "";
    try { const sz = await loader.detectFlashSize(); if (sz) { flash = " · flash " + sz; log("Flash: " + sz); } } catch (_) {}
    setConn("ok", chipName + flash);
    setStatus("Подключено. Добавьте файлы и нажмите «Прошить» или сохраните копию памяти.");
    note($("connHint"), "ok", `Устройство на связи: ${esc(chipName)}. Загрузчик у этого чипа по адресу ${hex(bootOffset)}.`);
    applySuggestions();
    renderFiles();
  } catch (e) {
    log("Ошибка подключения: " + errText(e));
    await dropConn();
    setConn("bad", "Не удалось подключиться");
    setStatus("Не получилось подключиться.");
    note($("connHint"), "bad", "Включите режим загрузки (подсказка ниже), закройте другие программы, которые держат порт, и попробуйте снова.");
  }
  busy = false; refresh();
}

function onLost() {
  loader = null; transport = null;
  setConn("bad", "Устройство отключилось");
  if (!busy) setStatus("Связь потеряна. Подключите заново.");
  refresh();
}

async function dropConn() {
  try { if (transport) await transport.disconnect(); } catch (_) {}
  transport = null; loader = null; chipName = "";
}

$("btnConnect").addEventListener("click", connect);
$("btnDisconnect").addEventListener("click", async () => {
  await dropConn();
  setConn("", "Не подключено"); setStatus("Отключено.");
  note($("connHint"), "", ""); refresh();
});

// ---------- стирание ----------
async function doErase() {
  setStatus("Стираю всю память. Это от 10 секунд до минуты, не отключайте кабель…");
  setBar(0, true);
  log("Стирание flash…");
  await loader.eraseFlash();
  log("Готово: память стёрта.");
  setBar(0, false);
}

$("btnErase").addEventListener("click", async () => {
  if (!loader || busy) return;
  if (!confirm("Стереть всю память платы? Пропадут все программы и данные.")) return;
  busy = true; refresh(); note($("doneNote"), "", "");
  try {
    await doErase();
    setStatus("Память стёрта.");
    note($("doneNote"), "ok", "Память стёрта. Без прошивки плата не запустится: добавьте файлы и нажмите «Прошить».");
    $("chkErase").checked = false; eraseTouched = true;
  } catch (e) {
    setBar(0, false);
    log("Ошибка: " + errText(e));
    setStatus("Не удалось стереть память.");
    note($("doneNote"), "bad", "Не удалось стереть: " + esc(errText(e)));
  }
  busy = false; refresh();
});

// ---------- копия памяти ----------
function flashBytes(sz) {
  const m = /^(\d+)\s*(MB|KB)$/i.exec(sz || "");
  if (!m) return 0;
  return Number(m[1]) * (m[2].toUpperCase() === "MB" ? 1048576 : 1024);
}

$("btnBackup").addEventListener("click", async () => {
  if (!loader || busy) return;
  busy = true; refresh(); note($("doneNote"), "", "");
  try {
    const sz = await loader.detectFlashSize();
    const total = flashBytes(sz);
    if (!total) throw new Error("Не удалось определить размер flash");
    if (!confirm(`Прочитать весь flash (${sz}) и сохранить в файл? Это займёт от нескольких секунд до нескольких минут. В копии будут и сохранённые пароли Wi‑Fi, не публикуйте её.`)) { busy = false; refresh(); return; }
    logEl.textContent = "";
    log(`Чтение ${sz}…`);
    setStatus("Читаю flash… 0%");
    setBar(0, false);
    const data = await loader.readFlash(0, total, (pkt, got, all) => {
      setBar(got / all, false);
      setStatus(`Читаю flash… ${Math.round((got / all) * 100)}%`);
    });
    setBar(1, false);
    const name = `flash-backup-${(chipName || "esp").toLowerCase()}-${sz}.bin`;
    const url = URL.createObjectURL(new Blob([data], { type: "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 20000);
    log("Сохранено: " + name);
    setStatus("Копия сохранена.");
    note($("doneNote"), "ok", `<b>Копия сохранена</b> как ${esc(name)}. Вернуть её на плату можно как один файл по адресу 0x0.`);
  } catch (e) {
    setBar(0, false);
    log("Ошибка: " + errText(e));
    setStatus("Не удалось сохранить копию.");
    note($("doneNote"), "bad", "Не удалось прочитать flash: " + esc(errText(e)) + "<br>Попробуйте скорость 115200 в «Дополнительно».");
  }
  busy = false; refresh();
});

// ---------- прошивка ----------
$("btnFlash").addEventListener("click", async () => {
  if (!loader || busy || !files.length) return;
  const list = files.map((f) => ({ f, a: parseAddr(f.addrText) }));
  if (list.some((x) => Number.isNaN(x.a))) return;
  const erase = $("chkErase").checked;
  const names = list.map((x) => `${x.f.name} → ${hex(x.a)}`).join("\n");
  if (!confirm((erase ? "Стереть всю память и записать:\n" : "Записать:\n") + names + "\n\nПродолжить?")) return;

  busy = true; refresh(); note($("doneNote"), "", "");
  logEl.textContent = "";
  try {
    if (erase) await doErase();
    setStatus("Записываю…");
    setBar(0, false);
    const sizes = list.map((x) => x.f.bytes.length);
    const sum = sizes.reduce((s, n) => s + n, 0);
    log(`Запись ${list.length} ф., ${fmtSize(sum)}…`);
    await loader.writeFlash({
      fileArray: list.map((x) => ({ data: x.f.bytes, address: x.a })),
      flashSize: $("selSize").value,
      flashMode: "keep",
      flashFreq: "keep",
      eraseAll: false,
      compress: true,
      reportProgress: (i, written, total) => {
        let done = 0;
        for (let k = 0; k < i; k++) done += sizes[k];
        done += sizes[i] * (total ? written / total : 0);
        setBar(done / sum, false);
        setStatus(`Записываю… ${Math.round((done / sum) * 100)}%`);
      },
    });
    setBar(1, false);
    log("Запись завершена.");
    setStatus("Перезагружаю плату…");
    try { await loader.after("hard_reset"); } catch (e) { log("Перезагрузка: " + errText(e)); }
    await dropConn();
    setConn("", "Не подключено");
    setStatus("Готово.");
    note($("doneNote"), "ok", "<b>Прошито.</b> Выключите и включите плату. Если плата не стартует, проверьте адреса файлов.");
  } catch (e) {
    setBar(0, false);
    const m = errText(e);
    log("Ошибка: " + m);
    setStatus("Не удалось прошить.");
    note($("doneNote"), "bad", "Не удалось прошить: " + esc(m) + "<br>Попробуйте скорость 115200 в «Дополнительно», другой кабель или режим загрузки. Журнал выше можно скопировать и отправить автору.");
  }
  busy = false; refresh();
});

refresh();
