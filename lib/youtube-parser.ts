/**
 * YouTube Video Konuşma Metni ve Altyazı (Transkript) Çekici
 *
 * Çok katmanlı yedekli strateji (Multi-Strategy Pipeline):
 * 1. Video ID'sini her formatta (watch, youtu.be, shorts, embed, m.youtube) yakalar.
 * 2. noembed.com üzerinden videonun resmi başlığını doğrudan çeker.
 * 3. Çoklu CORS uyumlu Piped ve Invidious API sağlayıcıları üzerinden altyazı akışlarını sorgular.
 * 4. WEBVTT, TTML, XML ve JSON3 formatlarını kusursuz şekilde çözümler.
 * 5. Müzik notaları (♪, ♫), [Müzik], (Alkış) ve tekrarlanan rolling altyazı satırlarını ayıklar.
 */

export type YouTubeChapter = {
  title: string
  start: number
}

export type TranscriptPhrase = {
  text: string
  start?: number
}

export type ExtractedYouTube = {
  title: string
  text: string
  videoId: string
  wordCount: number
  chapters?: YouTubeChapter[]
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const clean = url.trim()
  const match = clean.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
  )
  return match ? match[1] : null
}

function decodeHtmlEntities(str: string): string {
  if (!str) return ''
  if (typeof document === 'undefined') {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
  }
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

/**
 * noembed.com üzerinden video başlığını çeker (CORS koruması yoktur, %100 çalışır).
 */
async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
      signal: AbortSignal.timeout(3500),
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.title) {
        return decodeHtmlEntities(data.title)
      }
    }
  } catch {}
  return 'YouTube Video Transkripti'
}

/**
 * Video açıklamasındaki zaman damgalı bölümleri tespit eder (örn: "00:00 Giriş", "02:15 Kuantum Fiziği").
 */
export function parseChaptersFromDescription(desc: string, durationSec?: number): YouTubeChapter[] {
  if (!desc) return []
  const lines = desc.split(/\r?\n/)
  const chapters: YouTubeChapter[] = []
  const timestampRegex = /(?:^|\s)\[?\(?(?:(\d{1,2}):)?(\d{2}):(\d{2})\)?\]?\s*[-–—:]?\s*(.+)$/

  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(timestampRegex)
    if (match) {
      const hours = match[1] ? parseInt(match[1], 10) : 0
      const minutes = parseInt(match[2], 10)
      const seconds = parseInt(match[3], 10)
      const totalSeconds = hours * 3600 + minutes * 60 + seconds
      const title = match[4].trim().replace(/^[-–—:]\s*/, '')
      if (title && (!durationSec || totalSeconds <= durationSec)) {
        chapters.push({ title, start: totalSeconds })
      }
    }
  }

  if (chapters.length >= 2) {
    return chapters.sort((a, b) => a.start - b.start)
  }
  return []
}

/**
 * WEBVTT, TTML, XML veya JSON3 formatındaki transkript verisini temiz metne çevirir.
 * Hazır video bölümleri varsa metne "# Bölüm Başlığı" şeklinde iliştirir.
 */
export function parseTranscriptData(rawContent: string, chapters: YouTubeChapter[] = []): string {
  if (!rawContent || !rawContent.trim()) return ''

  const raw = rawContent.trim()
  const cleanPhrases: TranscriptPhrase[] = []
  const seenRecent: string[] = []

  const addPhrase = (phrase: string, startSec?: number) => {
    let t = decodeHtmlEntities(phrase)
    // Ses efektlerini ve müzik işaretlerini temizle
    t = t
      .replace(/<[^>]+>/g, ' ')
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/\([^\)]+\)/g, ' ')
      .replace(/[♪♫#\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!t || t.length < 1) return

    // Rolling caption mükerrer satırları filtrele
    const lower = t.toLowerCase()
    if (seenRecent.includes(lower)) return
    seenRecent.push(lower)
    if (seenRecent.length > 5) seenRecent.shift()

    cleanPhrases.push({ text: t, start: startSec })
  }

  // 1. FORMAT: JSON3 (YouTube Innertube Player formatı)
  if (raw.startsWith('{')) {
    try {
      const data = JSON.parse(raw)
      const events = data.events || []
      for (const ev of events) {
        const startSec = typeof ev.tStartMs === 'number' ? ev.tStartMs / 1000 : undefined
        if (ev.segs && Array.isArray(ev.segs)) {
          for (const seg of ev.segs) {
            const segText = seg.utf8 || ''
            if (segText && segText !== '\n') {
              addPhrase(segText, startSec)
            }
          }
        }
      }
      if (cleanPhrases.length > 0) {
        return formatPhrasesIntoParagraphs(cleanPhrases, chapters)
      }
    } catch {}
  }

  // 2. FORMAT: WEBVTT (.vtt formatı)
  if (raw.includes('WEBVTT') || /-->/.test(raw)) {
    const lines = raw.split(/\r?\n/)
    let currentStartSec: number | undefined = undefined

    for (const line of lines) {
      const l = line.trim()
      if (!l) continue
      if (
        l.startsWith('WEBVTT') ||
        l.startsWith('Kind:') ||
        l.startsWith('Language:') ||
        l.startsWith('NOTE') ||
        l.startsWith('Region:') ||
        l.startsWith('Style:')
      ) {
        continue
      }
      // Zaman damgalarını yakala (Örn: "00:00:01.360 --> 00:00:03.040" veya "01:23.450 --> 01:25.000")
      const timeMatch = l.match(/(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->/)
      if (timeMatch) {
        const hours = timeMatch[1] ? parseInt(timeMatch[1], 10) : 0
        const mins = parseInt(timeMatch[2], 10)
        const secs = parseInt(timeMatch[3], 10)
        const ms = parseInt(timeMatch[4], 10)
        currentStartSec = hours * 3600 + mins * 60 + secs + ms / 1000
        continue
      }
      // Cue numaralarını atla (Yalnızca rakamlardan oluşan satırlar)
      if (/^\d+$/.test(l)) {
        continue
      }
      addPhrase(l, currentStartSec)
    }
    if (cleanPhrases.length > 0) {
      return formatPhrasesIntoParagraphs(cleanPhrases, chapters)
    }
  }

  // 3. FORMAT: XML / TTML (<p>, <text>, <s> etiketleri)
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(raw, 'text/xml')
      const nodes = xmlDoc.querySelectorAll('p, text, s')
      nodes.forEach((node) => {
        const startAttr = node.getAttribute('start')
        const startSec = startAttr ? parseFloat(startAttr) : undefined
        addPhrase(node.textContent || '', startSec)
      })
      if (cleanPhrases.length > 0) {
        return formatPhrasesIntoParagraphs(cleanPhrases, chapters)
      }
    } catch {}
  }

  // 4. FORMAT: Regex Fallback (XML etiketlerini doğrudan yakala)
  const xmlMatches = raw.matchAll(/<(?:text|p|s)[^>]*?(?:start=["']([\d\.]+)["'])?[^>]*>(.*?)<\/(?:text|p|s)>/gi)
  for (const m of xmlMatches) {
    const startSec = m[1] ? parseFloat(m[1]) : undefined
    addPhrase(m[2], startSec)
  }

  return formatPhrasesIntoParagraphs(cleanPhrases, chapters)
}

/**
 * Ayrıştırılan konuşma cümlelerini doğal, akıcı paragraflar ve bölüm başlıkları (# ...) haline getirir.
 */
function formatPhrasesIntoParagraphs(phrases: TranscriptPhrase[], chapters: YouTubeChapter[] = []): string {
  if (!phrases.length) return ''

  const sortedChapters = [...chapters].sort((a, b) => a.start - b.start)
  let chIdx = 0
  const resultBlocks: string[] = []
  let currentGroup: string[] = []

  const flushGroup = () => {
    if (currentGroup.length > 0) {
      resultBlocks.push(currentGroup.join(' '))
      currentGroup = []
    }
  }

  for (const phrase of phrases) {
    if (
      sortedChapters.length > 0 &&
      chIdx < sortedChapters.length &&
      typeof phrase.start === 'number' &&
      phrase.start >= sortedChapters[chIdx].start
    ) {
      flushGroup()
      resultBlocks.push(`# ${sortedChapters[chIdx].title}`)
      chIdx++
    }

    currentGroup.push(phrase.text)
    if (currentGroup.length >= 4 || currentGroup.join(' ').split(/\s+/).length >= 60) {
      flushGroup()
    }
  }

  flushGroup()
  return resultBlocks.join('\n\n')
}

/**
 * YouTube videosunun konuşma transkriptini çeker.
 */
export async function fetchYouTubeTranscript(
  url: string,
  onProgress?: (message: string) => void,
): Promise<ExtractedYouTube> {
  const videoId = extractYouTubeId(url)
  if (!videoId) {
    throw new Error('Geçersiz YouTube linki. Lütfen "youtube.com/watch?v=..." veya "youtu.be/..." formatında bir link girin.')
  }

  onProgress?.('Video bilgileri alınıyor...')
  const videoTitle = await fetchVideoTitle(videoId)

  onProgress?.('Konuşma metni (altyazı) taranıyor...')

  let transcriptText = ''
  let detectedChapters: YouTubeChapter[] = []

  // STRATEJİ 1: CORS Uyumlu Piped API Sağlayıcıları
  // YouTube transkriptlerini TTML/XML formatında doğrudan ve yüksek hızda sunar
  const pipedEndpoints = [
    'https://api.piped.private.coffee',
    'https://pipedapi.ducks.party',
  ]

  for (const host of pipedEndpoints) {
    try {
      onProgress?.('Altyazı havuzu sorgulanıyor...')
      const res = await fetch(`${host}/streams/${videoId}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) continue
      const data = await res.json()

      // Hazır YouTube bölümlerini (Chapters) tespit et
      if (Array.isArray(data?.chapters) && data.chapters.length >= 2) {
        detectedChapters = data.chapters
          .map((c: any) => ({
            title: decodeHtmlEntities(String(c.title || '')).trim(),
            start: typeof c.start === 'number' ? c.start : Number(c.start || 0),
          }))
          .filter((c: any) => c.title)
      }
      if (detectedChapters.length < 2 && data?.description) {
        detectedChapters = parseChaptersFromDescription(data.description)
      }

      const subs = data?.subtitles
      if (Array.isArray(subs) && subs.length > 0) {
        // Türkçe altyazıyı önceliklendir (tr veya tr-TR)
        const trSub = subs.find((s: any) => s.code === 'tr' || s.code === 'tr-TR')
        const enSub = subs.find((s: any) => s.code === 'en' || s.code === 'en-US')
        const chosen = trSub || enSub || subs[0]

        if (chosen && chosen.url) {
          onProgress?.(`Konuşma metni indiriliyor (${chosen.name || chosen.code})...`)
          const subRes = await fetch(chosen.url, { signal: AbortSignal.timeout(5000) })
          if (subRes.ok) {
            const body = await subRes.text()
            transcriptText = parseTranscriptData(body, detectedChapters)
            if (transcriptText.split(/\s+/).filter(Boolean).length >= 15) {
              break
            }
          }
        }
      }
    } catch {}
  }

  // STRATEJİ 2: CORS Uyumlu Invidious API Sağlayıcısı
  if (!transcriptText || transcriptText.split(/\s+/).filter(Boolean).length < 15) {
    try {
      onProgress?.('Yedek altyazı motoru taranıyor...')
      const invRes = await fetch(`https://yt.chocolatemoo53.com/api/v1/captions/${videoId}`, {
        signal: AbortSignal.timeout(4500),
      })
      if (invRes.ok) {
        const invData = await invRes.json()

        if (detectedChapters.length < 2 && Array.isArray(invData?.chapters) && invData.chapters.length >= 2) {
          detectedChapters = invData.chapters
            .map((c: any) => ({
              title: decodeHtmlEntities(String(c.title || '')).trim(),
              start: typeof c.start === 'number' ? c.start : Number(c.start || 0),
            }))
            .filter((c: any) => c.title)
        }
        if (detectedChapters.length < 2 && invData?.description) {
          detectedChapters = parseChaptersFromDescription(invData.description)
        }

        const caps = invData?.captions
        if (Array.isArray(caps) && caps.length > 0) {
          const trCap = caps.find((c: any) => c.languageCode === 'tr' || c.languageCode === 'tr-TR')
          const enCap = caps.find((c: any) => c.languageCode === 'en')
          const chosen = trCap || enCap || caps[0]

          if (chosen && chosen.url) {
            onProgress?.(`Konuşma metni indiriliyor (${chosen.label || chosen.languageCode})...`)
            const subRes = await fetch(`https://yt.chocolatemoo53.com${chosen.url}`, {
              signal: AbortSignal.timeout(4500),
            })
            if (subRes.ok) {
              const body = await subRes.text()
              transcriptText = parseTranscriptData(body, detectedChapters)
            }
          }
        }
      }
    } catch {}
  }

  // STRATEJİ 3: YouTube Innertube Android Client (CORS Proxy ile)
  if (!transcriptText || transcriptText.split(/\s+/).filter(Boolean).length < 15) {
    try {
      const payload = {
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
            hl: 'tr',
            gl: 'TR',
          },
        },
        videoId,
      }

      // Android Innertube sorgusu
      const playerUrl = 'https://www.youtube.com/youtubei/v1/player'
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(playerUrl)}`

      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/20.10.38',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      })

      if (res.ok) {
        const data = await res.json()

        if (detectedChapters.length < 2 && data?.videoDetails?.shortDescription) {
          detectedChapters = parseChaptersFromDescription(data.videoDetails.shortDescription)
        }

        const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks
        if (Array.isArray(tracks) && tracks.length > 0) {
          const trTrack = tracks.find((t: any) => t.languageCode === 'tr')
          const enTrack = tracks.find((t: any) => t.languageCode === 'en')
          const chosen = trTrack || enTrack || tracks[0]

          if (chosen && chosen.baseUrl) {
            // timedtext indirmesi için proxy üzerinden fetch
            const subProxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(chosen.baseUrl)}`
            const subRes = await fetch(subProxyUrl, { signal: AbortSignal.timeout(6000) })
            if (subRes.ok) {
              const subBody = await subRes.text()
              transcriptText = parseTranscriptData(subBody, detectedChapters)
            }
          }
        }
      }
    } catch {}
  }

  const wordCount = transcriptText.split(/\s+/).filter(Boolean).length

  if (!transcriptText || wordCount < 15) {
    throw new Error(
      `"${videoTitle}" videosunda konuşma transkripti bulunamadı ya da bu video için konuşanların otomatik altyazısı oluşturulmamış.\n\nPratik İpucu: YouTube'da videonun altındaki "... (Daha fazla) -> Transkripti Göster" butonuna basarak metni kopyalayabilir ve 'Metin' sekmesine yapıştırıp doğrudan okuyabilirsiniz.`,
    )
  }

  return {
    title: videoTitle,
    text: transcriptText,
    videoId,
    wordCount,
    chapters: detectedChapters.length > 0 ? detectedChapters : undefined,
  }
}
