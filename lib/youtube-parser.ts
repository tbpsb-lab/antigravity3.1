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

export type ExtractedYouTube = {
  title: string
  text: string
  videoId: string
  wordCount: number
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
 * WEBVTT, TTML, XML veya JSON3 formatındaki transkript verisini temiz metne çevirir.
 */
export function parseTranscriptData(rawContent: string): string {
  if (!rawContent || !rawContent.trim()) return ''

  const raw = rawContent.trim()
  const cleanPhrases: string[] = []
  const seenRecent: string[] = []

  const addPhrase = (phrase: string) => {
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

    cleanPhrases.push(t)
  }

  // 1. FORMAT: JSON3 (YouTube Innertube Player formatı)
  if (raw.startsWith('{')) {
    try {
      const data = JSON.parse(raw)
      const events = data.events || []
      for (const ev of events) {
        if (ev.segs && Array.isArray(ev.segs)) {
          for (const seg of ev.segs) {
            const segText = seg.utf8 || ''
            if (segText && segText !== '\n') {
              addPhrase(segText)
            }
          }
        }
      }
      if (cleanPhrases.length > 0) {
        return formatPhrasesIntoParagraphs(cleanPhrases)
      }
    } catch {}
  }

  // 2. FORMAT: WEBVTT (.vtt formatı)
  if (raw.includes('WEBVTT') || /-->/.test(raw)) {
    const lines = raw.split(/\r?\n/)
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
      // Zaman damgalarını atla (Örn: "00:00:01.360 --> 00:00:03.040")
      if (/\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3}\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3}/.test(l)) {
        continue
      }
      // Cue numaralarını atla (Yalnızca rakamlardan oluşan satırlar)
      if (/^\d+$/.test(l)) {
        continue
      }
      addPhrase(l)
    }
    if (cleanPhrases.length > 0) {
      return formatPhrasesIntoParagraphs(cleanPhrases)
    }
  }

  // 3. FORMAT: XML / TTML (<p>, <text>, <s> etiketleri)
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(raw, 'text/xml')
      const nodes = xmlDoc.querySelectorAll('p, text, s')
      nodes.forEach((node) => {
        addPhrase(node.textContent || '')
      })
      if (cleanPhrases.length > 0) {
        return formatPhrasesIntoParagraphs(cleanPhrases)
      }
    } catch {}
  }

  // 4. FORMAT: Regex Fallback (XML etiketlerini doğrudan yakala)
  const xmlMatches = raw.matchAll(/<(?:text|p|s)[^>]*>(.*?)<\/(?:text|p|s)>/gi)
  for (const m of xmlMatches) {
    addPhrase(m[1])
  }

  return formatPhrasesIntoParagraphs(cleanPhrases)
}

/**
 * Ayrıştırılan konuşma cümlelerini doğal, akıcı paragraflar haline getirir.
 */
function formatPhrasesIntoParagraphs(phrases: string[]): string {
  if (!phrases.length) return ''
  const full = phrases.join(' ').replace(/\s+/g, ' ').trim()

  // Cümle sonlarına göre (nokta, ünlem, soru işareti) 3-4 cümlede bir paragraf oluştur
  const sentences = full.match(/[^.!?]+[.!?]+["”’»)]*|\S+$/g) || [full]
  const paragraphs: string[] = []
  let currentGroup: string[] = []

  for (const sentence of sentences) {
    currentGroup.push(sentence.trim())
    if (currentGroup.length >= 4 || currentGroup.join(' ').split(/\s+/).length >= 60) {
      paragraphs.push(currentGroup.join(' '))
      currentGroup = []
    }
  }

  if (currentGroup.length > 0) {
    paragraphs.push(currentGroup.join(' '))
  }

  return paragraphs.join('\n\n')
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
            transcriptText = parseTranscriptData(body)
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
              transcriptText = parseTranscriptData(body)
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
              transcriptText = parseTranscriptData(subBody)
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
  }
}
