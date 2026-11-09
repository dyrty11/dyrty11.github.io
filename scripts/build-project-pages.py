#!/usr/bin/env python3
"""Генерирует статические страницы проектов (project-<slug>.html) и sitemap.xml из projects.json.
У каждой страницы свои title/description/og:image, потому что Telegram и соцсети не выполняют JavaScript.
Запуск из корня сайта:  python scripts/build-project-pages.py
"""
import json, re, html, datetime, pathlib

SITE = 'https://dyrty11.github.io'
ROOT = pathlib.Path(__file__).resolve().parent.parent
TR = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя', ['a','b','v','g','d','e','e','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','h','ts','ch','sh','sch','','y','','e','yu','ya']))

def ascii_slug(p):
    link = str(p.get('link') or '')
    m = re.fullmatch(r'([a-z0-9_-]+)\.html', link)
    if m:
        return m.group(1)
    s = ''.join(TR.get(c, c) for c in str(p.get('title', '')).lower())
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-') or 'project'

def e(s):
    return html.escape(str(s), quote=True)

def main():
    projects = json.loads((ROOT / 'projects.json').read_text(encoding='utf-8'))
    tpl = (ROOT / 'project.html').read_bytes().decode('utf-8')
    nl = '\r\n' if '\r\n' in tpl else '\n'
    today = datetime.date.today().isoformat()
    urls = [('/', 1.0), ('/projects.html', 0.8), ('/services.html', 0.6), ('/contacts.html', 0.6), ('/privacy.html', 0.3), ('/voidforge.html', 0.7), ('/cheatsheets.html', 0.7)]
    changed = False
    for p in projects:
        slug = ascii_slug(p)
        page = 'project-%s.html' % slug
        title = str(p.get('title', 'Проект'))
        desc = str(p.get('description') or 'Проект из портфолио разработчика.')[:200]
        url = '%s/%s' % (SITE, page)
        og_img = '%s/img/og-%s.png' % (SITE, slug)
        if not (ROOT / 'img' / ('og-%s.png' % slug)).exists():
            og_img = SITE + '/og-image.png'
        full = '%s — Portfolio' % title
        t = tpl
        def sub(pat, rep):
            nonlocal t
            t, n = re.subn(pat, lambda m: rep, t, count=1)
            assert n == 1, pat
        sub(r'<title>.*?</title>', '<title>%s</title>' % e(full))
        sub(r'<meta name="description" content=".*?">', '<meta name="description" content="%s">' % e(desc))
        sub(r'<meta property="og:title" content=".*?">', '<meta property="og:title" content="%s">' % e(full))
        sub(r'<meta property="og:description" content=".*?">', '<meta property="og:description" content="%s">' % e(desc))
        sub(r'<meta property="og:image" content=".*?">', '<meta property="og:image" content="%s">' % og_img)
        sub(r'<meta property="og:image:alt" content=".*?">', '<meta property="og:image:alt" content="%s">' % e('Превью проекта ' + title))
        sub(r'<meta name="twitter:title" content=".*?">', '<meta name="twitter:title" content="%s">' % e(full))
        sub(r'<meta name="twitter:description" content=".*?">', '<meta name="twitter:description" content="%s">' % e(desc))
        sub(r'<meta name="twitter:image" content=".*?">', '<meta name="twitter:image" content="%s">' % og_img)
        ld = json.dumps({'@context': 'https://schema.org', '@graph': [
            {'@type': 'CreativeWork', '@id': url + '#project', 'name': title, 'description': desc, 'url': url, 'image': og_img, 'inLanguage': 'ru',
             'author': {'@type': 'Person', 'name': 'dyrty11', 'url': 'https://github.com/dyrty11'}},
            {'@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Главная', 'item': SITE + '/'},
                {'@type': 'ListItem', 'position': 2, 'name': 'Проекты', 'item': SITE + '/projects.html'},
                {'@type': 'ListItem', 'position': 3, 'name': title, 'item': url}]}]}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
        extra = nl.join([
            '    <link rel="canonical" href="%s">' % url,
            '    <meta property="og:url" content="%s">' % url,
            '    <meta name="project-slug" content="%s">' % e(re.sub(r'[^a-z0-9а-яё]+', '-', title.lower()).strip('-')),
            '    <script type="application/ld+json">%s</script>' % ld, ''])
        sub(r'    <meta name="twitter:card"', extra + '    <meta name="twitter:card"')
        sub(r'<noscript><p class="detail-msg">.*?</p></noscript>', '<noscript><h1>%s</h1><p class="detail-msg">%s <a href="projects.html">Все проекты</a>.</p></noscript>' % (e(title), e(desc)))
        (ROOT / page).write_bytes(t.encode('utf-8'))
        urls.append(('/' + page, 0.7))
        if p.get('page') != page:
            p['page'] = page
            changed = True
        print('OK', page)
    if changed:
        (ROOT / 'projects.json').write_text(json.dumps(projects, ensure_ascii=False, indent=2), encoding='utf-8')
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, prio in urls:
        sm.append('  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>' % (SITE, path, today))
    sm.append('</urlset>')
    (ROOT / 'sitemap.xml').write_text('\n'.join(sm) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
