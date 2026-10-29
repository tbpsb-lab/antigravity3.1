/**
 * YouTube Video Konuşma Metni ve Altyazı (Transkript) Çekici
 *
 * Kullanıcı bir YouTube video linki yapıştırdığında:
 * 1. Video ID'sini regex ile yakalar.
 * 2. Videonun sayfa verisindeki captionTracks (altyazı akışları) bilgisini CORS proxy üzerinden çeker.
 * 3. Türkçe (veya mevcut dildeki) transkripti XML olarak indirip zaman damgalarını ve [Müzik] gibi gereksiz etiketleri temizler.
 * 4. Akıcı, temiz bir okuma metnine dönüştürür.
 */

export type ExtractedYouTube = {
  title: string
  text: string
  videoId: string
  wordCount: number
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
  )
  return match ? match[1] : null
}

function decodeHtmlEntities(str: string): string {
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

export async function fetchYouTubeTranscript(
  url: string,
  onProgress?: (message: string) => void,
): Promise<ExtractedYouTube> {
  const videoId = extractYouTubeId(url.trim())
  if (!videoId) {
    throw new Error('Geçersiz YouTube video linki. Lütfen geçerli bir video adresi girin.')
  }

  onProgress?.('YouTube video bilgisi sorgulanıyor...')

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(watchUrl)}`
  const fallbackProxyUrl = `https://corsproxy.io/?${encodeURIComponent(watchUrl)}`

  let html = ''
  try {
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) })
    if (res.ok) html = await res.text()
  } catch {}

  if (!html || html.length < 500) {
    try {
      const res = await fetch(fallbackProxyUrl, { signal: AbortSignal.timeout(6000) })
      if (res.ok) html = await res.text()
    } catch {}
  }

  if (!html) {
    throw new Error('YouTube video sayfasına erişilemedi. Lütfen internet bağlantınızı kontrol edin.')
  }

  // Video Başlığı Ayıkla
  let videoTitle = 'YouTube Video Transkripti'
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  if (titleMatch && titleMatch[1]) {
    videoTitle = decodeHtmlEntities(titleMatch[1].replace(/- YouTube$/i, '').trim())
  }

  // Altyazı Akışlarını (captionTracks) Bul
  onProgress?.('Konuşma metni (altyazı akışı) taranıyor...')
  const tracksMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/)

  let captionUrl = ''

  if (tracksMatch && tracksMatch[1]) {
    try {
      const tracks = JSON.parse(tracksMatch[1])
      if (Array.isArray(tracks) && tracks.length > 0) {
        // Öncelik: Türkçe altyazı -> İngilizce altyazı -> İlk altyazı
        const trTrack = tracks.find((t: any) => t.languageCode === 'tr')
        const enTrack = tracks.find((t: any) => t.languageCode === 'en')
        const chosen = trTrack || enTrack || tracks[0]
        if (chosen && chosen.baseUrl) {
          captionUrl = chosen.baseUrl
        }
      }
    } catch {}
  }

  // Fallback: Google timedtext API doğrudan sorgusu
  if (!captionUrl) {
    captionUrl = `https://video.google.com/timedtext?v=${videoId}&lang=tr`
  }

  onProgress?.('Altyazı satırları indiriliyor...')

  // Altyazı XML içeriğini çek
  let xmlText = ''
  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(captionUrl)}`, {
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) xmlText = await res.text()
  } catch {}

  if (!xmlText || !xmlText.includes('<text')) {
    try {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(captionUrl)}`, {
        signal: AbortSignal.timeout(6000),
      })
      if (res.ok) xmlText = await res.text()
    } catch {}
  }

  if (!xmlText || !xmlText.includes('<text')) {
    throw new Error(
      'Bu videoda otomatik veya yüklenmiş bir konuşma transkripti (altyazı) bulunamadı veya video sahibi altyazıyı devre dışı bırakmış.',
    )
  }

  // XML'i Ayrıştır ve Konuşma Cümlelerini Temizle
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
  const textNodes = Array.from(xmlDoc.querySelectorAll('text'))

  const cleanPhrases: string[] = []

  for (const node of textNodes) {
    let raw = node.textContent || ''
    raw = decodeHtmlEntities(raw)
    // Ses efektlerini ve notaları temizle: [Müzik], (Gülüşmeler), [Alkış]
    raw = raw.replace(/\[[^\]]+\]/g, '').replace(/\([^\)]+\)/g, '').trim()
    if (raw) {
      cleanPhrases.push(raw)
    }
  }

  if (cleanPhrases.length === 0) {
    throw new Error('Altyazı metni boş veya okunamadı.')
  }

  // Cümleleri doğal akışa dönüştür
  const fullText = cleanPhrases.join(' ').replace(/\s+/g, ' ').trim()
  const wordCount = fullText.split(/\s+/).filter(Boolean).length

  return {
    title: videoTitle,
    text: fullText,
    videoId,
    wordCount,
  }
}
