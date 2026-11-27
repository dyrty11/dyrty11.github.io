import { ESPLoader, Transport } from "./esptool-js.js";

const $ = (id) => document.getElementById(id);
const root = $("root");
const logEl = $("log");

if (!("serial" in navigator)) root.classList.add("nosupport");

let transport = null, loader = null, busy = false;
let fileBytes = null, fileName = "", fileKind = "none"; // none | full | app | other
let chipOk = false;

// ---------- журнал и статус ----------
function log(s) {
  logEl.hidden = false;
  logEl.textContent += s + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}
function logPart(s) {
  logEl.hidden = false;
  logEl.textContent += s;
  logEl.scrollTop = logEl.scrollHeight;
}
const terminal = {
  clean() { logEl.textContent = ""; },
  writeLine(d) { log(d); },
  write(d) { logPart(d); },
};
function setStatus(t) { $("status").textContent = t; }
function setBar(frac, indeterminate) {
  const b = $("bar");
  b.classList.toggle("busy", !!indeterminate);
  $("barFill").style.width = indeterminate ? "" : Math.round(Math.max(0, Math.min(1, frac)) * 100) + "%";
}
function note(el, cls, html) { el.innerHTML = html ? `<div class="note ${cls}">${html}</div>` : ""; }
function esc(s) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function fmtSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(2) + " МБ" : (n / 1024).toFixed(1) + " КБ"; }

function setConn(state, text) {
  const p = $("pillConn");
  p.className = "pill" + (state === "ok" ? " ok" : state === "bad" ? " bad" : "");
  $("pillText").textContent = text;
}

function currentAddr() {
  const v = $("selAddr").value;
  if (v !== "custom") return parseInt(v, 16);
  const t = $("customAddr").value.trim();
  if (!/^(0x)?[0-9a-fA-F]+$/.test(t)) return NaN;
  return parseInt(t.replace(/^0x/i, ""), 16);
}

// ---------- проверка файла ----------
function classify(b) {
  if (b.length < 32 || b[0] !== 0xE9) return "other";
  // полный образ: таблица разделов на 0x8000 (AA 50)
  if (b.length > 0x8002 && b[0x8000] === 0xAA && b[0x8001] === 0x50) return "full";
  return "app";
}

function refresh() {
  const addr = currentAddr();
  const erase = $("chkErase").checked;
  let block = false;
  const el = $("fileNote");
  $("customWrap").hidden = $("selAddr").value !== "custom";

  if (!fileBytes) {
    note(el, "", "");
  } else if (Number.isNaN(addr)) {
    note(el, "bad", "Адрес указан неверно. Пример: 0x10000.");
    block = true;
  } else if (fileKind === "other") {
    note(el, "warn", "Файл не похож на образ ESP32 (нет байта 0xE9 в начале). Прошивать его можно только на свой риск.");
  } else if (addr === 0 && fileKind === "app") {
    note(el, "bad", "Это только приложение (например, cardputer_kit.bin). По адресу 0x0 нужен полный образ <b>cardputer_kit_full.bin</b>. Выберите «Только приложение (0x10000)» либо возьмите другой файл.");
    block = true;
  } else if (addr !== 0 && fileKind === "full") {
    note(el, "bad", "Это полный образ, его место по адресу 0x0. Иначе прошивка не загрузится.");
    block = true;
  } else if (addr === 0x10000 && fileKind === "app" && erase) {
    note(el, "bad", "После полного стирания приложение без загрузчика не запустится. Снимите галочку стирания или возьмите полный образ.");
    block = true;
  } else if (fileKind === "full") {
    note(el, "ok", "Полный образ: загрузчик, таблица разделов и программа. Подходит для адреса 0x0.");
  } else if (fileKind === "app") {
    note(el, "warn", "Только приложение. Сработает, если загрузчик и разделы уже есть на устройстве.");
  }

  $("btnFlash").disabled = busy || !loader || !chipOk || !fileBytes || block;
  $("btnErase").disabled = busy || !loader || !chipOk;
  $("btnConnect").disabled = busy || !!loader;
  $("btnDisconnect").hidden = !loader;
  $("btnDisconnect").disabled = busy;
}

// ---------- выбор файла ----------
const drop = $("drop"), fileInput = $("file");
drop.addEventListener("click", () => fileInput.click());
drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => { if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
fileInput.addEventListener("change", () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

async function loadFile(f) {
  if (f.size === 0 || f.size > 16 * 1024 * 1024) {
    fileBytes = null; fileName = ""; fileKind = "none";
    $("fileinfo").textContent = "Файл пустой или больше 16 МБ.";
    refresh();
    return;
  }
  fileBytes = new Uint8Array(await f.arrayBuffer());
  fileName = f.name;
  fileKind = classify(fileBytes);
  $("fileinfo").innerHTML = `<b>${esc(f.name)}</b> · ${fmtSize(f.size)}`;
  // подсказка по умолчанию: полный образ -> 0x0, приложение -> 0x10000
  if (fileKind === "full") { $("selAddr").value = "0x0"; $("chkErase").checked = true; }
  else if (fileKind === "app") {
    $("selAddr").value = /full/i.test(f.name) ? "0x0" : "0x10000";
    if ($("selAddr").value === "0x10000") $("chkErase").checked = false;
  }
  refresh();
}

["selAddr", "customAddr", "chkErase"].forEach((id) => $(id).addEventListener("input", refresh));

// ---------- подключение ----------
async function connect() {
  if (loader || busy) return;
  busy = true; refresh();
  setStatus("Выберите порт в окне браузера…");
  setConn("", "Подключение…");
  let port;
  try {
    const opts = $("chkAllPorts").checked ? {} : { filters: [{ usbVendorId: 0x303a }] };
    port = await navigator.serial.requestPort(opts);
  } catch (e) {
    busy = false; setConn("", "Не подключено");
    setStatus(e && e.name === "NotFoundError" ? "Порт не выбран. Если устройства нет в списке, включите «Показать все порты» или режим загрузки." : "Не удалось открыть выбор порта: " + (e && e.message));
    refresh();
    return;
  }
  try {
    setStatus("Подключаюсь… Это занимает несколько секунд.");
    transport = new Transport(port, false);
    transport.setDeviceLostCallback && transport.setDeviceLostCallback(onLost);
    loader = new ESPLoader({ transport, baudrate: Number($("selBaud").value), romBaudrate: 115200, terminal });
    const chip = await loader.main();
    chipOk = /ESP32-S3/i.test(chip);
    log("Чип: " + chip);
    let flash = "";
    try { const sz = await loader.detectFlashSize(); if (sz) { flash = " · flash " + sz; log("Flash: " + sz); } } catch (_) {}
    setConn(chipOk ? "ok" : "bad", chip + flash);
    if (chipOk) {
      setStatus("Подключено. Выберите файл и нажмите «Прошить».");
      note($("connHint"), "ok", "Устройство на связи.");
    } else {
      setStatus("Это не ESP32-S3. Прошивка Cardputer на этот чип не подойдёт, запись отключена.");
      note($("connHint"), "bad", "Подключён " + esc(chip) + ". Для Cardputer нужен ESP32-S3.");
    }
  } catch (e) {
    log("Ошибка подключения: " + (e && e.message ? e.message : e));
    await dropConn();
    setConn("bad", "Не удалось подключиться");
    setStatus("Не получилось подключиться.");
    note($("connHint"), "bad", "Включите режим загрузки (подсказка ниже), закройте другие программы, которые держат порт, и попробуйте снова.");
  }
  busy = false; refresh();
}

function onLost() {
  loader = null; transport = null; chipOk = false;
  setConn("bad", "Устройство отключилось");
  if (!busy) setStatus("Связь потеряна. Подключите заново.");
  refresh();
}

async function dropConn() {
  try { if (transport) await transport.disconnect(); } catch (_) {}
  transport = null; loader = null; chipOk = false;
}

$("btnConnect").addEventListener("click", connect);
$("btnDisconnect").addEventListener("click", async () => {
  await dropConn();
  setConn("", "Не подключено"); setStatus("Отключено.");
  note($("connHint"), "", ""); refresh();
});

// ---------- стирание и запись ----------
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
  if (!confirm("Стереть всю память устройства? Пропадут все программы, включая M5 Launcher.")) return;
  busy = true; refresh(); note($("doneNote"), "", "");
  try {
    await doErase();
    setStatus("Память стёрта. Теперь выберите файл и нажмите «Прошить».");
    note($("doneNote"), "ok", "Память стёрта. Без прошивки устройство не запустится: прошейте полный образ.");
    $("chkErase").checked = false; // повторное стирание не нужно
  } catch (e) {
    setBar(0, false);
    log("Ошибка: " + (e && e.message ? e.message : e));
    setStatus("Не удалось стереть память.");
    note($("doneNote"), "bad", "Не удалось стереть: " + esc(String(e && e.message ? e.message : e)));
  }
  busy = false; refresh();
});

$("btnFlash").addEventListener("click", async () => {
  if (!loader || busy || !fileBytes) return;
  const addr = currentAddr();
  if (Number.isNaN(addr)) return;
  const erase = $("chkErase").checked;
  const msg = erase
    ? `Стереть всю память и прошить «${fileName}»? Все данные на устройстве пропадут.`
    : `Прошить «${fileName}» по адресу 0x${addr.toString(16).toUpperCase()}?`;
  if (!confirm(msg)) return;

  busy = true; refresh(); note($("doneNote"), "", "");
  logEl.textContent = "";
  try {
    if (erase) await doErase();
    setStatus("Записываю…");
    setBar(0, false);
    log(`Запись ${fmtSize(fileBytes.length)} по адресу 0x${addr.toString(16)}…`);
    await loader.writeFlash({
      fileArray: [{ data: fileBytes, address: addr }],
      flashSize: $("selSize").value,
      flashMode: "keep",
      flashFreq: "keep",
      eraseAll: false,
      compress: true,
      reportProgress: (i, written, total) => {
        setBar(written / total, false);
        setStatus(`Записываю… ${Math.round((written / total) * 100)}%`);
      },
    });
    setBar(1, false);
    log("Запись завершена.");
    setStatus("Перезагружаю устройство…");
    try { await loader.after("hard_reset"); } catch (e) { log("Перезагрузка: " + (e && e.message ? e.message : e)); }
    await dropConn();
    setConn("", "Не подключено");
    setStatus("Готово.");
    note($("doneNote"), "ok", "<b>Прошито.</b> Выключите и включите устройство выключателем. Если появилась картинка, всё в порядке.");
    $("chkErase").checked = true;
  } catch (e) {
    setBar(0, false);
    const m = e && e.message ? e.message : String(e);
    log("Ошибка: " + m);
    setStatus("Не удалось прошить.");
    note($("doneNote"), "bad", "Не удалось прошить: " + esc(m) + "<br>Попробуйте скорость 115200 в «Дополнительно», другой кабель, режим загрузки. Журнал выше можно скопировать и отправить автору.");
  }
  busy = false; refresh();
});

refresh();
