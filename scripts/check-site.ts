import { resolve, sep } from 'node:path'

const root = resolve('storage/site')
const paths = await Array.fromAsync(new Bun.Glob('**/*.html').scan(root))
const pages = new Map<string, { ids: Set<string>, links: string[] }>()
const failures: string[] = []

for (const path of paths) {
  const html = await Bun.file(resolve(root, path)).text()
  const ids = new Set<string>()
  const links: string[] = []
  const collect = new HTMLRewriter()
    .on('[id]', { element: element => { ids.add(element.getAttribute('id')!) } })
    .on('[href]', { element: element => { links.push(element.getAttribute('href')!) } })
    .on('[src]', { element: element => { links.push(element.getAttribute('src')!) } })
  await collect.transform(new Response(html)).text()
  if (!/<title>[^<]+<\/title>/.test(html) || !/<main\b/.test(html))
    failures.push(`${path}: missing document title or main landmark`)
  if (/<!--\s*\[(?:SEO|Include|Layout|stx)[^\]]*(?:Error|not found)/i.test(html))
    failures.push(`${path}: template error in built output`)
  pages.set(path, { ids, links })
}

for (const required of ['index.html', '404.html', 'docs/index.html', 'docs/intro/index.html', 'docs/config/index.html', 'docs/updates/index.html', 'docs/releasing/index.html', 'docs/site/index.html']) {
  if (!pages.has(required)) failures.push(`Missing page: ${required}`)
}

for (const [path, { links }] of pages) {
  const pageUrl = `http://site.test/${path}`
  for (const link of links) {
    if (!link || /^(?:https?:|mailto:|tel:|data:|\/\/)/.test(link)) continue
    if (/\{\{|@(?:include|layout)/.test(link)) {
      failures.push(`${path}: unresolved template URL ${link}`)
      continue
    }
    const url = new URL(link, pageUrl)
    const target = resolve(root, `.${decodeURIComponent(url.pathname)}`)
    if (target !== root && !target.startsWith(root + sep)) {
      failures.push(`${path}: link leaves the output tree: ${link}`)
      continue
    }
    let found: string | undefined
    for (const candidate of [target, `${target}.html`, resolve(target, 'index.html')]) {
      const file = Bun.file(candidate)
      if (await file.exists() && (await file.stat()).isFile()) { found = candidate; break }
    }
    if (!found) { failures.push(`${path}: missing local target ${link}`); continue }
    const fragment = decodeURIComponent(url.hash.slice(1))
    if (fragment && found.endsWith('.html') && !pages.get(found.slice(root.length + 1))?.ids.has(fragment))
      failures.push(`${path}: missing fragment ${link}`)
  }
}

if (failures.length)
  throw new Error(`Site verification failed:\n${[...new Set(failures)].join('\n')}`)
console.log(`Site verified: ${pages.size} pages, local links, fragments and referenced assets.`)
