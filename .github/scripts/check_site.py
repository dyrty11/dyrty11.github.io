#!/usr/bin/env python3
"""Проверки сайта без внешних зависимостей: CSP, ссылки, блокируемые CSP конструкции, секреты."""
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[2]
errors = []

REF = re.compile(r'(?:href|src)="([^"]+)"')
EXTERNAL = re.compile(r'^(https?:|mailto:|tel:|data:|#|//)')

for f in sorted(p for p in root.glob("*.html") if not p.name.startswith("google")):
    t = f.read_text(encoding="utf-8")
    n = f.name
    if 'http-equiv="Content-Security-Policy"' not in t:
        errors.append(f"{n}: нет CSP")
    if re.search(r'\sstyle="', t):
        errors.append(f"{n}: style=\"...\" блокируется CSP, вынеси в CSS-класс")
    if re.search(r'<script(?![^>]*\bsrc=)(?![^>]*type="application/ld\+json")[^>]*>', t):
        errors.append(f"{n}: inline <script> блокируется CSP")
    if re.search(r'\son[a-z]+="', t):
        errors.append(f"{n}: inline-обработчик событий блокируется CSP")
    for m in re.finditer(r'<a\b[^>]*target="_blank"[^>]*>', t):
        if "noopener" not in m.group(0):
            errors.append(f"{n}: target=_blank без rel=noopener")
    for u in REF.findall(t):
        if u.startswith("http://"):
            errors.append(f"{n}: небезопасная ссылка {u}")
        if EXTERNAL.match(u):
            continue
        p = u.split("#")[0].split("?")[0]
        if p.startswith("/dyrty_11.github.io/"):  # абсолютные пути страницы 404
            p = p[len("/dyrty_11.github.io/"):]
        p = p.lstrip("/")
        if p and not (root / p).exists():
            errors.append(f"{n}: не найден файл {u}")

SECRETS = [
    r"gh[pousr]_[A-Za-z0-9]{36,}",
    r"github_pat_[A-Za-z0-9_]{50,}",
    r"AKIA[0-9A-Z]{16}",
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    r"xox[baprs]-[A-Za-z0-9-]{10,}",
]
skip_dirs = {".git", "node_modules", "fonts", "img"}
for p in root.rglob("*"):
    if not p.is_file() or skip_dirs & set(p.relative_to(root).parts) or p.name == "check_site.py":
        continue
    try:
        text = p.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    for pat in SECRETS:
        if re.search(pat, text):
            errors.append(f"{p.relative_to(root)}: похоже на секрет ({pat[:12]}...)")

if errors:
    print("Найдены проблемы:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("OK: проверки пройдены")
