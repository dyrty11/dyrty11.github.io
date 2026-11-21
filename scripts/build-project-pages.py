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
    urls = [('/', 1.0), ('/projects.html', 0.8), ('/contacts.html', 0.6), ('/privacy.html', 0.3), ('/voidforge.html', 0.7), ('/cheatsheets.html', 0.7), ('/qr.html', 0.7)]
    changed = False
    for p in projects:
        slug = ascii_slug(p)
        page = 'project-%s.html' % slug
        title = str(p.get('title', 'Проект'))
        desc = str(p.get('description') or 'Проект из портфолио разработчика.')[:200]
        url = '%s/%s' % (SITE, page)
        og_img = '%s/img/og-%s.jpg' % (SITE, slug)
        if not (ROOT / 'img' / ('og-%s.jpg' % slug)).exists():
            og_img = SITE + '/og-image.jpg'
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
        if p.get('downloads'):  # программа: описание для поисковиков (версия берётся из «Что нового»)
            app = {'@type': 'SoftwareApplication', '@id': url + '#app', 'name': title, 'description': desc, 'url': url,
                   'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Windows 10, Windows 11',
                   'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}, 'image': og_img}
            if p.get('license'):
                app['license'] = 'https://opensource.org/licenses/%s' % p['license']
            if p.get('source'):
                app['codeRepository'] = p['source']
            if p.get('link'):
                app['downloadUrl'] = p['link']
            if p.get('changelog'):
                app['softwareVersion'] = p['changelog'][0]['version']
            ld = ld[:-2] + ',' + json.dumps(app, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ']}'
        extra = nl.join([
            '    <link rel="canonical" href="%s">' % url,
            '    <meta property="og:url" content="%s">' % url,
            *(['    <link rel="alternate" type="application/atom+xml" title="%s: что нового" href="%s/%s.atom">' % (e(title), SITE, slug)] if p.get('changelog') else []),
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
    for p in projects:  # лента Atom «что нового» для программ с журналом изменений
        if not p.get('changelog'):
            continue
        slug = ascii_slug(p)
        page_url = '%s/project-%s.html' % (SITE, slug)
        entries = []
        for v in p['changelog']:
            when = v.get('date') or today
            body = '<ul>' + ''.join('<li>%s</li>' % e(i) for i in v['items']) + '</ul>'
            entries.append('  <entry><title>%s %s</title><id>%s#v%s</id><link href="%s"/><updated>%sT00:00:00Z</updated>'
                           '<content type="html">%s</content></entry>' % (e(p['title']), v['version'], page_url, v['version'], page_url, when, e(body)))
        newest = (p['changelog'][0].get('date') or today)
        feed = ['<?xml version="1.0" encoding="UTF-8"?>', '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ru">',
                '  <title>%s: что нового</title>' % e(p['title']), '  <id>%s/%s.atom</id>' % (SITE, slug),
                '  <link rel="self" href="%s/%s.atom"/>' % (SITE, slug), '  <link href="%s"/>' % page_url,
                '  <updated>%sT00:00:00Z</updated>' % newest, '  <author><name>dyrty11</name></author>'] + entries + ['</feed>']
        (ROOT / ('%s.atom' % slug)).write_text('\n'.join(feed) + '\n', encoding='utf-8')
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, prio in urls:
        sm.append('  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>' % (SITE, path, today))
    sm.append('</urlset>')
    (ROOT / 'sitemap.xml').write_text('\n'.join(sm) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
