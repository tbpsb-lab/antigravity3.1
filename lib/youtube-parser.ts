/**
 * YouTube Video Konuşma Metni ve Altyazı (Transkript) Çekici
 *
 * Çok katmanlı yedekli strateji (Multi-Strategy Pipeline):
 * 1. Video ID'sini her formatta (watch, youtu.be, shorts, embed, m.youtube) yakalar.
 * 2. noembed.com üzerinden videonun resmi başlığını anında ve güvenle çeker.
 * 3. YouTube altyazı akışlarını (captionTracks, timedtext, mobile Innertube veya Invidious) sorgular.
 * 4. Altyazıdaki zaman kodlarını, [Müzik], (Alkış) gibi ses efektlerini temizleyip
 *    RSVP hızlı okuyucuya hazır akıcı paragraflar üretir.
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
  if (typeof document === 'undefined') {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
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
 * XML veya JSON timedtext formatından temiz konuşma cümleleri üretir.
 */
function parseTranscriptData(rawContent: string): string {
  const cleanPhrases: string[] = []

  // 1. JSON3 formatı kontrolü
  if (rawContent.trim().startsWith('{')) {
    try {
      const data = JSON.parse(rawContent)
      const events = data.events || []
      for (const ev of events) {
        if (ev.segs && Array.isArray(ev.segs)) {
          for (const seg of ev.segs) {
            let t = (seg.utf8 || '').trim()
            t = t.replace(/\[[^\]]+\]/g, '').replace(/\([^\)]+\)/g, '').trim()
            if (t && t !== '\n') {
              cleanPhrases.push(t)
            }
          }
        }
      }
    } catch {}
  }

  // 2. XML formatı kontrolü (DOMParser veya RegExp)
  if (cleanPhrases.length === 0) {
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(rawContent, 'text/xml')
        const nodes = xmlDoc.querySelectorAll('text, s, p')
        nodes.forEach((node) => {
          let text = decodeHtmlEntities(node.textContent || '')
          text = text.replace(/\[[^\]]+\]/g, '').replace(/\([^\)]+\)/g, '').trim()
          if (text) cleanPhrases.push(text)
        })
      } catch {}
    }
  }

  // 3. Regex Fallback (XML taglarını doğrudan eşle)
  if (cleanPhrases.length === 0) {
    const matches = rawContent.matchAll(/<text[^>]*>([^<]+)<\/text>/gi)
    for (const m of matches) {
      let t = decodeHtmlEntities(m[1])
      t = t.replace(/\[[^\]]+\]/g, '').replace(/\([^\)]+\)/g, '').trim()
      if (t) cleanPhrases.push(t)
    }
  }

  return cleanPhrases.join(' ').replace(/\s+/g, ' ').trim()
}

export async function fetchYouTubeTranscript(
  url: string,
  onProgress?: (message: string) => void,
): Promise<ExtractedYouTube> {
  const videoId = extractYouTubeId(url)
  if (!videoId) {
    throw new Error('Geçersiz YouTube linki. Lütfen "youtube.com/watch?v=..." veya "youtu.be/..." formatında bir link girin.')
  }

  onProgress?.('Video başlığı sorgulanıyor...')
  const videoTitle = await fetchVideoTitle(videoId)

  onProgress?.('Konuşma metni (altyazı) taranıyor...')

  let transcriptText = ''

  // STRATEJİ 1: Innertube Android Client Sorgusu
  // YouTube Android istemcisi Web PoToken zorunluluğundan muaftır
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

    const proxyEndpoints = [
      `https://corsproxy.io/?url=${encodeURIComponent('https://www.youtube.com/youtubei/v1/player')}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent('https://www.youtube.com/youtubei/v1/player')}`,
    ]

    for (const ep of proxyEndpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
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
              onProgress?.('Altyazı satırları indiriliyor...')
              const subRes = await fetch(chosen.baseUrl, { signal: AbortSignal.timeout(6000) })
              if (subRes.ok) {
                const subBody = await subRes.text()
                transcriptText = parseTranscriptData(subBody)
                if (transcriptText.length > 40) break
              }
            }
          }
        }
      } catch {}
    }
  } catch {}

  // STRATEJİ 2: YouTube Watch Page HTML Scraper (CORS Proxy ile)
  if (!transcriptText || transcriptText.length < 40) {
    onProgress?.('Yedek altyazı sunucusu taranıyor...')
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
    const htmlProxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(watchUrl)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(watchUrl)}`,
    ]

    for (const proxy of htmlProxies) {
      try {
        const res = await fetch(proxy, { signal: AbortSignal.timeout(6000) })
        if (!res.ok) continue
        const html = await res.text()
        const idx = html.indexOf('captionTracks')
        if (idx !== -1) {
          const start = html.indexOf('[', idx)
          let depth = 0
          let end = -1
          for (let i = start; i < Math.min(start + 30000, html.length); i++) {
            if (html[i] === '[') depth++
            else if (html[i] === ']') {
              depth--
              if (depth === 0) {
                end = i + 1
                break
              }
            }
          }
          if (end !== -1) {
            const tracks = JSON.parse(html.substring(start, end))
            if (Array.isArray(tracks) && tracks.length > 0) {
              const trTrack = tracks.find((t: any) => t.languageCode === 'tr')
              const enTrack = tracks.find((t: any) => t.languageCode === 'en')
              const chosen = trTrack || enTrack || tracks[0]
              if (chosen && chosen.baseUrl) {
                const subRes = await fetch(chosen.baseUrl, { signal: AbortSignal.timeout(6000) })
                if (subRes.ok) {
                  const subBody = await subRes.text()
                  transcriptText = parseTranscriptData(subBody)
                  if (transcriptText.length > 40) break
                }
              }
            }
          }
        }
      } catch {}
    }
  }

  // STRATEJİ 3: Açık Invidious / Piped Altyazı Sunucuları
  if (!transcriptText || transcriptText.length < 40) {
    onProgress?.('Genel altyazı havuzu taranıyor...')
    const invidiousHosts = [
      'https://inv.nadeko.net',
      'https://invidious.nerdvpn.de',
      'https://vid.priv.au',
      'https://yt.artemislena.eu',
    ]

    for (const host of invidiousHosts) {
      try {
        const res = await fetch(`${host}/api/v1/captions/${videoId}`, {
          signal: AbortSignal.timeout(4000),
        })
        if (!res.ok) continue
        const data = await res.json()
        const caps = data?.captions
        if (Array.isArray(caps) && caps.length > 0) {
          const trCap = caps.find((c: any) => c.languageCode === 'tr')
          const enCap = caps.find((c: any) => c.languageCode === 'en')
          const chosen = trCap || enCap || caps[0]
          if (chosen && chosen.url) {
            const capRes = await fetch(`${host}${chosen.url}`, { signal: AbortSignal.timeout(4000) })
            if (capRes.ok) {
              const capText = await capRes.text()
              transcriptText = parseTranscriptData(capText)
              if (transcriptText.length > 40) break
            }
          }
        }
      } catch {}
    }
  }

  if (!transcriptText || transcriptText.length < 30) {
    throw new Error(
      `"${videoTitle}" videosunda otomatik veya yüklenmiş konuşma transkripti bulunamadı ya da YouTube bot koruması (PO token) erişimi kilitledi.\n\nİpucu: YouTube'da videonun altındaki "... -> Transkripti Göster" kısmından konuşmaları kopyalayarak 'Metin' sekmesine yapıştırabilir ve anında okuyabilirsiniz.`,
    )
  }

  const wordCount = transcriptText.split(/\s+/).filter(Boolean).length

  return {
    title: videoTitle,
    text: transcriptText,
    videoId,
    wordCount,
  }
}
