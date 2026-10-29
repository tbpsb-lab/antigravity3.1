/**
 * Web & Haber Linki Çekici ve Akıllı Ana Metin Ayıklayıcı (Smart Article Distiller)
 *
 * HizliOku Pro Heuristics Engine:
 * 1. JSON-LD (NewsArticle / Article / BlogPosting) yapısal veri analizi.
 * 2. DOM Puanlayıcı (DOM Scorer): Paragraf uzunluğu, noktalama sıklığı ve düşük link yoğunluğu analizi.
 * 3. Mozilla Readability uyumlu makale ayıklama.
 * 4. Haberin spotunu (Lead / Description) ana metnin başına akıllıca ekleme.
 * 5. Alt başlıkları (h2, h3, h4) '# ' formatında koruma.
 * 6. Paragraf aralarına serpiştirilmiş reklam, "İlgili Haber", "Google News'te takip et" kırıntılarını temizleme.
 * 7. Asla ekonomi, dünya, eğitim gibi kelimeleri içeren gerçek haber paragraflarını veya köşe yazılarını kesmez!
 */

export type ExtractedArticle = {
  title: string
  text: string
  sourceUrl: string
  wordCount: number
}

// DOM ağacından silinecek gürültü ve reklam elementleri
const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'canvas',
  'form',
  'nav',
  'footer',
  'aside',
  'button',
  'input',
  'select',
  'textarea',
  'dialog',
  'menu',
  'figcaption',
  'header:not(article header)',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
  '[aria-hidden="true"]',
  '.ad',
  '.ads',
  '.advert',
  '.advertisement',
  '.reklam',
  '.sponsor',
  '.sponsored',
  '.related',
  '.related-news',
  '.related-posts',
  '.related-articles',
  '.ilgili-haber',
  '.ilgili-haberler',
  '.benzer-haberler',
  '.cok-okunanlar',
  '.populer-haberler',
  '.recommended',
  '.more-stories',
  '.comments',
  '.comment-section',
  '.yorumlar',
  '#comments',
  '#disqus_thread',
  '.share',
  '.social',
  '.social-share',
  '.paylas',
  '.etiketler',
  '.tags',
  '.tag-list',
  '.breadcrumb',
  '.breadcrumbs',
  '.pagination',
  '.newsletter',
  '.abone',
  '.cookie',
  '.consent',
  '.popup',
  '.modal',
  '.sidebar',
  '.widget',
  '.doviz',
  '.piyasa',
  '.finance',
  '.ticker',
  '.market-data',
  '.author-bio',
  '.author-box',
  '.yazar-kutusu',
  '.yazar-footer',
  '.yazar-diger',
  '.read-more',
  '.devami',
  '.outbrain',
  '.taboola',
  '.criteo',
  '.gallery-thumbs',
  '.next-prev',
  '.post-navigation',
]

function normalizeWhitespace(str: string): string {
  return (str || '').replace(/\s+/g, ' ').trim()
}

/**
 * Haber başlıklarının sonundaki site adı uzantılarını (" - Son Dakika Haberleri | Habertürk" vb.) temizler.
 */
export function cleanArticleTitle(rawTitle: string): string {
  let t = normalizeWhitespace(rawTitle)
  if (!t) return ''
  const parts = t.split(/\s+[\|\-\–\—]\s+/)
  if (parts.length > 1 && parts[0].split(/\s+/).length >= 2) {
    t = parts[0].trim()
  }
  return t
}

/**
 * HTML karakter kodlamalarını çözer ve <br>, <p> etiketlerini satır sonuna çevirir.
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return ''
  if (typeof document === 'undefined') {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }
  const txt = document.createElement('textarea')
  const withBreaks = String(str)
    .replace(/<\s*(?:br|\/p|\/div|\/h[1-6]|\/li)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  txt.innerHTML = withBreaks
  return txt.value
}

/**
 * Yapışık markdown kalınlaştırmalarını, bozuk tırnakları ve link artıklarını çözer.
 */
export function sanitizeTypographyAndMarkdown(raw: string): string {
  let s = raw

  // 1. Yapışık markdown kalınlaştırmalarını çöz: "**Yarın**Cumhuriyet" -> "Yarın Cumhuriyet"
  s = s.replace(/\*\*([^*]+)\*\*([a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/g, '$1 $2')
  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ0-9])\*\*([^*]+)\*\*/g, '$1 $2')
  s = s.replace(/;[*_]{2,6}/g, '; ')

  // 2. Tırnak ve parantez yapışıklıklarını çöz
  s = s.replace(/([”"»)])([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, '$1 $2')
  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])([“"«(])/g, '$1 $2')

  // 3. Boş ve buton/takip linklerini yok et
  s = s.replace(/\[\s*\]\([^\)]*\)/g, '')
  s = s.replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
  s = s.replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1')

  // 4. Kalan markdown yıldız/altçizgi işaretlerini temizle
  s = s.replace(/(^|[^\*])\*{1,3}([^\*]+)\*{1,3}([^\*]|$)/g, '$1$2$3')
  s = s.replace(/(^|[^_])_{1,3}([^_]+)_{1,3}([^_]|$)/g, '$1$2$3')
  s = s.replace(/^[\*\-\•]\s+/gm, '')

  return s
}

/**
 * DOM ağacındaki gürültü ve reklam elementlerini ayıklar
 */
function stripNoiseFromDom(doc: Document) {
  try {
    doc.querySelectorAll(REMOVE_SELECTORS.join(',')).forEach((el) => el.remove())
  } catch {}

  const noiseRegex =
    /(^|[\-_\s])(nav|navbar|menu|sidebar|footer|breadcrumb|comment|yorum|share|paylas|social|related|ilgili|benzer|reklam|advert|sponsor|banner|popup|modal|cookie|consent|newsletter|abone|tags|etiket|widget|doviz|piyasa|finance|ticker|outbrain|taboola|most-read|cok-okunan|read-more|haberi-goruntule)($|[\-_\s])/i

  const containers = Array.from(doc.querySelectorAll('div, section, ul, ol, aside'))
  for (const el of containers) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'body' || tag === 'main' || tag === 'article') continue
    if (el.querySelector('article, [itemprop="articleBody"]')) continue

    const attrStr = `${el.className || ''} ${el.id || ''}`
    if (noiseRegex.test(attrStr)) {
      el.remove()
    }
  }
}

function calculateLinkDensity(el: Element): number {
  const totalLen = (el.textContent || '').replace(/\s+/g, '').length
  if (totalLen === 0) return 0
  let linkLen = 0
  el.querySelectorAll('a').forEach((a) => {
    linkLen += (a.textContent || '').replace(/\s+/g, '').length
  })
  return linkLen / totalLen
}

/**
 * Sayfadaki <script type="application/ld+json"> etiketlerinden NewsArticle verilerini toplar
 */
function extractJsonLdData(doc: Document): { headline: string; description: string; articleBody: string } {
  const result = { headline: '', description: '', articleBody: '' }
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')

  const inspectObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
      obj.forEach(inspectObject)
      return
    }
    if (obj['@graph'] && Array.isArray(obj['@graph'])) {
      obj['@graph'].forEach(inspectObject)
    }

    const typeVal = Array.isArray(obj['@type'])
      ? obj['@type'].join(' ')
      : String(obj['@type'] || '')
    const isArticle =
      /Article|NewsArticle|BlogPosting|Reportage|Analysis|Opinion|WebPage/i.test(typeVal) ||
      Boolean(obj.articleBody)

    if (isArticle) {
      if (!result.headline && typeof obj.headline === 'string') {
        result.headline = decodeHtmlEntities(obj.headline)
      }
      if (!result.description && typeof obj.description === 'string') {
        result.description = decodeHtmlEntities(obj.description)
      }
      if (typeof obj.articleBody === 'string') {
        const decoded = decodeHtmlEntities(obj.articleBody)
        if (decoded.length > result.articleBody.length) {
          result.articleBody = decoded
        }
      }
    }
  }

  scripts.forEach((scr) => {
    const raw = (scr.textContent || '').trim()
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      inspectObject(parsed)
    } catch {
      // Bozuk JSON-LD içinden regex ile articleBody yakala
      const bodyMatch = raw.match(/"articleBody"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      if (bodyMatch) {
        try {
          const unescaped = JSON.parse(`"${bodyMatch[1]}"`)
          const decoded = decodeHtmlEntities(unescaped)
          if (decoded.length > result.articleBody.length) {
            result.articleBody = decoded
          }
        } catch {}
      }
    }
  })

  return result
}

/**
 * Bir elementin alt başlık ve paragraflarını hiyerarşik satırlara ayıklar.
 */
function extractStructuredLinesFromElement(rootEl: Element): string[] {
  if (!rootEl) return []
  const lines: string[] = []
  const seen = new Set<string>()

  const blocks = Array.from(rootEl.querySelectorAll('h2, h3, h4, p, blockquote, li'))
  if (blocks.length === 0) {
    return (rootEl.textContent || '')
      .split(/\r?\n+/)
      .map(normalizeWhitespace)
      .filter((l) => l.length > 0)
  }

  for (const block of blocks) {
    if (block.tagName !== 'LI' && block.querySelector('p, h2, h3')) continue

    const linkDensity = calculateLinkDensity(block)
    const text = normalizeWhitespace(block.textContent || '')
    if (!text) continue

    const tag = block.tagName.toLowerCase()
    const isSubheading = tag === 'h2' || tag === 'h3' || tag === 'h4'

    if (tag === 'li' && (text.length < 35 || linkDensity > 0.35 || !/[.!?…]$/.test(text))) {
      continue
    }
    if (!isSubheading && linkDensity > 0.45 && text.length < 180) {
      continue
    }
    if (isSubheading && (text.length < 3 || text.length > 140 || linkDensity > 0.35)) {
      continue
    }

    const normKey = text.toLowerCase()
    if (seen.has(normKey)) continue
    seen.add(normKey)

    if (isSubheading) {
      lines.push(`# ${text.replace(/^#+\s*/, '')}`)
    } else {
      lines.push(text)
    }
  }

  return lines
}

/**
 * DOM içindeki paragraf yoğunluğu ve noktalama puanına göre en iyi içerik konteynerini bulur.
 */
function extractLinesViaDomScorer(doc: Document): string[] {
  if (!doc || !doc.body) return []

  const semanticSelectors = [
    '[itemprop="articleBody"]',
    'article .article-body',
    'article .news-body',
    'article .haber-metni',
    'article .detay-metin',
    '.article-body',
    '.article-content',
    '.news-content',
    '.news-body',
    '.haber-detay',
    '.haber-metni',
    '.detay-icerik',
    '.author-content',
    '.yazar-detay',
    '.content-text',
    '.post-content',
    '.entry-content',
    '.story-body',
    'article',
    'main',
  ]

  const candidates = new Map<Element, number>()
  const addScore = (node: Element | null, pts: number) => {
    if (!node || node.nodeType !== 1) return
    candidates.set(node, (candidates.get(node) || 0) + pts)
  }

  semanticSelectors.forEach((sel, idx) => {
    doc.querySelectorAll(sel).forEach((el) => {
      addScore(el, Math.max(30, 95 - idx * 4))
    })
  })

  const paragraphs = Array.from(doc.querySelectorAll('p, div.paragraph, .text-block'))
  for (const p of paragraphs) {
    const text = normalizeWhitespace(p.textContent || '')
    if (text.length < 35) continue

    const linkDensity = calculateLinkDensity(p)
    if (linkDensity > 0.4) continue

    const commaCount = (text.match(/[,;:]/g) || []).length
    const wordCount = text.split(/\s+/).length
    const score = 10 + Math.min(35, Math.floor(wordCount / 4)) + commaCount * 3

    const parent = p.parentElement
    const grandParent = parent ? parent.parentElement : null
    if (parent) addScore(parent, score)
    if (grandParent) addScore(grandParent, Math.floor(score * 0.55))
  }

  let bestContainer: Element = doc.querySelector('article, [itemprop="articleBody"], main') || doc.body
  let bestScore = -1

  for (const [container, rawScore] of candidates.entries()) {
    const linkDensity = calculateLinkDensity(container)
    const finalScore = rawScore * (1 - Math.min(0.85, linkDensity))
    if (finalScore > bestScore) {
      bestScore = finalScore
      bestContainer = container
    }
  }

  return extractStructuredLinesFromElement(bestContainer)
}

/**
 * Haber sitelerinin paragraf aralarına koyduğu gerçek reklam/yönlendirme kalıplarını temizler.
 * Kesinlikle "dünya", "ekonomi", "eğitim", "hayat" gibi kelimeleri içeren gerçek haber metnini silmez!
 */
export function filterNewsBoilerplateLines(rawLines: string[], articleTitle = ''): string[] {
  if (!Array.isArray(rawLines)) return []
  const out: string[] = []
  const seen = new Set<string>()
  const titleLower = (articleTitle || '').toLowerCase().trim()

  for (const raw of rawLines) {
    const line = normalizeWhitespace(raw)
    if (!line) continue

    const isHeading = /^#{1,4}\s+/.test(line)
    const cleanContent = line.replace(/^#{1,4}\s+/, '').trim()
    const lower = cleanContent
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/\u0307/g, '')

    if (cleanContent.length < 3) continue
    if (titleLower && (lower === titleLower || lower.replace(/[^a-z0-9çğıöşü]/gi, '') === titleLower.replace(/[^a-z0-9çğıöşü]/gi, ''))) {
      continue
    }

    // Haber içi yönlendirme ve reklam kalıpları (Yalnızca satır başlangıcında veya kısa bloklarda!)
    if (
      /^(haber[iı]?\s*g[oö]r[uü]nt[uü]le|haberin\s*devam[ıi]|devam[ıi]\s*i[cç]in\s*t[ıi]kla|ilgili\s*haber|benzer\s*haber|bizi\s*google\s*news|google\s*news['’]?te\s*takip|abone\s*ol|yorum\s*yaz|payla[sş]|etiketler\s*:|kaynak\s*:|foto[gğ]raf\s*:|t[uü]m\s*haklar[ıi]|copyright|son\s*g[uü]ncelleme|yay[ıi]nlanma\s*tarihi|okuma\s*s[uü]resi|reklam|advertisement|sponsored)\b/i.test(
        lower,
      )
    ) {
      continue
    }

    if (
      cleanContent.length < 140 &&
      /(haber[iı]?\s*g[oö]r[uü]nt[uü]le|haberin\s*devam[ıi]|ilgili\s*haber|google\s*news|whatsapp\s*kanal|b[uü]ltenimize\s*abone|[cç]erez\s*politikas[ıi]|ayd[ıi]nlatma\s*metni|t[ıi]klay[ıi]n[ıi]z)/i.test(
        lower,
      )
    ) {
      continue
    }

    // Başlık olmayan çok kısa ve cümle niteliği taşımayan kırıntıları (tarih, saat, kategori adı vb.) atla
    if (!isHeading && cleanContent.split(/\s+/).length <= 3 && !/[.!?…:;]["”’»)]*$/.test(cleanContent)) {
      continue
    }

    if (seen.has(lower)) continue
    seen.add(lower)

    out.push(isHeading ? `# ${cleanContent}` : cleanContent)
  }

  return out
}

/**
 * Jina Reader veya Markdown çıktısını temizler
 */
export function cleanArticleMarkdown(rawMarkdown: string, pageUrl = ''): { title: string; text: string } {
  if (!rawMarkdown) return { title: '', text: '' }

  let workingText = rawMarkdown

  // Jina AI başlığı
  let detectedTitle = ''
  const mTitle = workingText.match(/^Title:\s*(.+)$/m)
  if (mTitle) {
    detectedTitle = cleanArticleTitle(mTitle[1].trim())
  }

  // Jina Content başlığı öncesini kes
  const mdIdx = workingText.indexOf('Markdown Content:')
  if (mdIdx >= 0) {
    workingText = workingText.substring(mdIdx + 17)
  }

  // H1 Başlığını bul
  const h1Match = workingText.match(/(?:^|\n)#\s+([^\n]+)/)
  if (h1Match && h1Match[1]) {
    const candidate = cleanArticleTitle(h1Match[1].trim())
    if (candidate.length > 3 && !/^(sözcü|haberler|anasayfa|son\s+dakika)$/i.test(candidate)) {
      detectedTitle = candidate
    }
  }

  // Markdown tipografisini temizle
  const sanitized = sanitizeTypographyAndMarkdown(workingText)

  const rawLines = sanitized
    .split(/\r?\n+/)
    .map(normalizeWhitespace)
    .filter((l) => l.length > 0)

  if (!detectedTitle && rawLines.length > 0) {
    detectedTitle = cleanArticleTitle(rawLines[0].replace(/^#+\s*/, ''))
  }

  const cleanLines = filterNewsBoilerplateLines(rawLines, detectedTitle)

  const finalOutput: string[] = []
  if (detectedTitle) {
    finalOutput.push(`# ${detectedTitle}`)
  }
  for (const line of cleanLines) {
    if (detectedTitle && line.replace(/^#+\s*/, '').toLowerCase() === detectedTitle.toLowerCase()) {
      continue
    }
    finalOutput.push(line)
  }

  return {
    title: detectedTitle,
    text: finalOutput.join('\n\n'),
  }
}

/**
 * Bir haber veya web sayfasının HTML içeriğini analiz edip en temiz ana metni damıtır.
 */
export function extractArticleFromHtml(html: string, pageUrl = ''): { title: string; text: string } {
  if (typeof window === 'undefined' && typeof DOMParser === 'undefined') {
    return cleanArticleMarkdown(html, pageUrl)
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  if (pageUrl && doc.head && !doc.querySelector('base')) {
    try {
      const baseEl = doc.createElement('base')
      baseEl.setAttribute('href', pageUrl)
      doc.head.insertBefore(baseEl, doc.head.firstChild)
    } catch {}
  }

  // 1. JSON-LD Analizi
  const jsonLdData = extractJsonLdData(doc)

  // 2. Başlık ve Spot Tespiti
  const rawTitle =
    jsonLdData.headline ||
    doc.querySelector('article h1, main h1, h1.title, h1.news-title, h1.author-title, h1.haber-baslik, h1')?.textContent ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
    doc.title ||
    ''
  const cleanTitle = cleanArticleTitle(rawTitle)

  const rawLead =
    jsonLdData.description ||
    doc.querySelector('[itemprop="description"], .article-lead, .news-spot, .haber-spot, .spot, .lead, h2.spot')
      ?.textContent ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    ''
  const cleanLead = normalizeWhitespace(rawLead)

  // 3. DOM Gürültüsünü Temizle
  stripNoiseFromDom(doc)

  // 4. İçerik Adayları (JSON-LD vs DOM Scorer)
  const jsonLdLines = jsonLdData.articleBody
    ? filterNewsBoilerplateLines(
        jsonLdData.articleBody.split(/\r?\n+/).map(normalizeWhitespace).filter(Boolean),
        cleanTitle,
      )
    : []

  const domScoredLines = filterNewsBoilerplateLines(extractLinesViaDomScorer(doc), cleanTitle)

  const countWords = (arr: string[]) => arr.join(' ').split(/\s+/).filter(Boolean).length
  const wJson = countWords(jsonLdLines)
  const wDom = countWords(domScoredLines)

  let chosenLines: string[] = []
  if (wDom >= 45 && wDom >= wJson * 0.75) {
    chosenLines = domScoredLines
  } else if (wJson >= 25) {
    chosenLines = jsonLdLines
  } else {
    chosenLines = wDom > wJson ? domScoredLines : jsonLdLines
  }

  // Eğer haberin spotu (özeti) ana metnin ilk paragrafında yoksa en başa ekle
  if (
    cleanLead &&
    cleanLead.split(/\s+/).length >= 5 &&
    cleanLead.length <= 420 &&
    chosenLines.length > 0
  ) {
    const firstParaLower = chosenLines[0].toLowerCase()
    const leadLower = cleanLead.toLowerCase()
    if (
      !firstParaLower.includes(leadLower.slice(0, 30)) &&
      !leadLower.includes(firstParaLower.slice(0, 30)) &&
      (!cleanTitle || leadLower !== cleanTitle.toLowerCase())
    ) {
      chosenLines.unshift(cleanLead)
    }
  }

  const finalOutputLines: string[] = []
  if (cleanTitle) {
    finalOutputLines.push(`# ${cleanTitle}`)
  }
  for (const line of chosenLines) {
    if (cleanTitle && line.replace(/^#+\s*/, '').toLowerCase() === cleanTitle.toLowerCase()) {
      continue
    }
    finalOutputLines.push(line)
  }

  return {
    title: cleanTitle,
    text: finalOutputLines.join('\n\n'),
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 8000, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Çok katmanlı paralel yarıştırma motoru (Fast-Race Engine).
 * Tüm proxy'leri (Jina, CodeTabs, CorsProxy, AllOrigins ve Direct) paralel çalıştırır.
 */
export async function fetchArticleFromUrl(
  urlInput: string,
  onStatus?: (status: string) => void,
): Promise<ExtractedArticle> {
  const cleanUrl = urlInput.trim()
  if (!cleanUrl) {
    throw new Error('Lütfen geçerli bir web sitesi veya haber linki girin.')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`)
  } catch {
    throw new Error('Geçersiz URL formatı. Lütfen "https://" ile başlayan tam linki girin.')
  }

  const targetUrl = parsedUrl.toString()
  onStatus?.('En hızlı sunucu taranıyor ve ana metin çekiliyor...')

  const globalAbort = new AbortController()
  const encoded = encodeURIComponent(targetUrl)

  const racers: Array<{ name: string; run: () => Promise<{ title: string; text: string }> }> = [
    // 1. Jina AI Reader (Headless render ile dinamik SPA ve korumalı siteler)
    {
      name: 'Jina Reader',
      run: async () => {
        const res = await fetchWithTimeout(`https://r.jina.ai/${targetUrl}`, 7000, {
          headers: {
            Accept: 'text/plain',
            'X-Remove-Selector':
              'header, footer, nav, aside, .doviz, .finance, .share, .social, .related, .author-footer, .outbrain, .taboola, .reklam',
          },
          signal: globalAbort.signal,
        })
        if (!res.ok) throw new Error('Jina HTTP ' + res.status)
        const raw = await res.text()
        if (!raw || raw.length < 80) throw new Error('Jina boş içerik')
        const cleaned = cleanArticleMarkdown(raw, targetUrl)
        const wCount = cleaned.text.split(/\s+/).filter(Boolean).length
        if (wCount < 40) throw new Error('Jina yetersiz metin')
        return cleaned
      },
    },
    // 2. CodeTabs CORS Proxy
    {
      name: 'CodeTabs',
      run: async () => {
        const res = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encoded}`, 6000, {
          signal: globalAbort.signal,
        })
        if (!res.ok) throw new Error('CodeTabs HTTP ' + res.status)
        const html = await res.text()
        if (!html || html.length < 200) throw new Error('CodeTabs boş içerik')
        const cleaned = extractArticleFromHtml(html, targetUrl)
        const wCount = cleaned.text.split(/\s+/).filter(Boolean).length
        if (wCount < 40) throw new Error('CodeTabs yetersiz metin')
        return cleaned
      },
    },
    // 3. CorsProxy.io
    {
      name: 'CorsProxy',
      run: async () => {
        const res = await fetchWithTimeout(`https://corsproxy.io/?url=${encoded}`, 6000, {
          signal: globalAbort.signal,
        })
        if (!res.ok) throw new Error('CorsProxy HTTP ' + res.status)
        const html = await res.text()
        if (!html || html.length < 200) throw new Error('CorsProxy boş içerik')
        const cleaned = extractArticleFromHtml(html, targetUrl)
        const wCount = cleaned.text.split(/\s+/).filter(Boolean).length
        if (wCount < 40) throw new Error('CorsProxy yetersiz metin')
        return cleaned
      },
    },
    // 4. AllOrigins Raw
    {
      name: 'AllOrigins',
      run: async () => {
        const res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encoded}`, 6500, {
          signal: globalAbort.signal,
        })
        if (!res.ok) throw new Error('AllOrigins HTTP ' + res.status)
        const html = await res.text()
        if (!html || html.length < 200) throw new Error('AllOrigins boş içerik')
        const cleaned = extractArticleFromHtml(html, targetUrl)
        const wCount = cleaned.text.split(/\s+/).filter(Boolean).length
        if (wCount < 40) throw new Error('AllOrigins yetersiz metin')
        return cleaned
      },
    },
    // 5. Doğrudan Tarayıcı İsteği (Direct Fetch)
    {
      name: 'Direct',
      run: async () => {
        const res = await fetchWithTimeout(targetUrl, 2500, {
          signal: globalAbort.signal,
        })
        if (!res.ok) throw new Error('Direct HTTP ' + res.status)
        const html = await res.text()
        if (!html || html.length < 200) throw new Error('Direct boş içerik')
        const cleaned = extractArticleFromHtml(html, targetUrl)
        const wCount = cleaned.text.split(/\s+/).filter(Boolean).length
        if (wCount < 40) throw new Error('Direct yetersiz metin')
        return cleaned
      },
    },
  ]

  try {
    const winner = await Promise.any(
      racers.map(async (racer) => {
        try {
          const res = await racer.run()
          return { ...res, source: racer.name }
        } catch (err) {
          throw err
        }
      }),
    )

    try {
      globalAbort.abort()
    } catch {}

    const finalWordCount = winner.text.split(/\s+/).filter(Boolean).length

    return {
      title: winner.title,
      text: winner.text,
      sourceUrl: targetUrl,
      wordCount: finalWordCount,
    }
  } catch {
    throw new Error(
      'Bu linkten okunabilir bir makale veya haber metni çekilemedi. Site erişim engeli koymuş olabilir veya sayfa metin içermiyor olabilir.',
    )
  }
}
