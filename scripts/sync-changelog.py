#!/usr/bin/env python3
"""Обновляет в projects.json блок «Что нового» у FilePilot из CHANGELOG.md и CHANGELOG.en.md репозитория программы.
Запуск:  python scripts/sync-changelog.py            (берёт файлы с GitHub)
         python scripts/sync-changelog.py --ru путь --en путь   (локальные файлы)
Даты версий берутся из релизов GitHub, если API доступен. Потом: python scripts/build-project-pages.py
"""
import argparse, json, pathlib, re, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO = 'dyrty11/filepilot'
RAW = 'https://raw.githubusercontent.com/%s/main/' % REPO
KEEP = 5  # сколько последних версий показывать


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'portfolio-sync'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode('utf-8')


def parse(text, dates):
    out = []
    for m in re.finditer(r'(?m)^## (\d+\.\d+\.\d+)[^\n]*\n(.*?)(?=^## |\Z)', text, re.S):
        items = []
        for line in m.group(2).splitlines():
            line = line.strip()
            if line.startswith('- '):
                items.append(line[2:].replace('`', '').strip())
            elif line and items and not line.startswith('#'):
                items[-1] += ' ' + line.replace('`', '')
        if items and (not dates or m.group(1) in dates):  # версии без релиза на сайт не попадают
            e = {'version': m.group(1), 'items': items}
            if m.group(1) in dates:
                e['date'] = dates[m.group(1)]
            out.append(e)
        if len(out) >= KEEP:
            break
    return out


def release_dates():
    try:
        data = json.loads(fetch('https://api.github.com/repos/%s/releases?per_page=30' % REPO))
        return {r['tag_name'].lstrip('v'): r['published_at'][:10] for r in data if r.get('published_at')}
    except Exception:
        return {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ru'); ap.add_argument('--en')
    a = ap.parse_args()
    ru = pathlib.Path(a.ru).read_text(encoding='utf-8') if a.ru else fetch(RAW + 'CHANGELOG.md')
    try:
        en = pathlib.Path(a.en).read_text(encoding='utf-8') if a.en else fetch(RAW + 'CHANGELOG.en.md')
    except Exception:
        en = ''
    dates = release_dates()
    path = ROOT / 'projects.json'
    raw = path.read_bytes().decode('utf-8')
    nl = '\r\n' if '\r\n' in raw else '\n'
    projects = json.loads(raw)
    p = next(x for x in projects if x.get('title') == 'FilePilot')
    old = (p.get('changelog'), p.get('changelogEn'))
    p['changelog'] = parse(ru, dates)
    p['changelogEn'] = parse(en, dates)
    if (p['changelog'], p['changelogEn']) == old:
        print('Без изменений'); return
    text = json.dumps(projects, ensure_ascii=False, indent=2) + '\n'
    path.write_bytes(text.replace('\n', nl).encode('utf-8'))
    print('Обновлено: версии', ', '.join(x['version'] for x in p['changelog']))


if __name__ == '__main__':
    main()
