/**
 * Akıllı Okuma Konumu Hafızası (Automatic Reading Position Memory)
 *
 * Her doküman için (PDF kitap, haber, YouTube transkripti, metin) parmak izi (fingerprint)
 * üretir ve kullanıcının son kaldığı konumu (kelime indeksi, öbek indeksi, yüzde, tarih)
 * localStorage'da otomatik saklar.
 *
 * Kullanıcı başka bir PDF açıp daha sonra ilk PDF'e geri dönse dahi, ayraç koymaya gerek
 * kalmadan son kaldığı konuma otomatik olarak geri gider.
 */

export type SavedProgress = {
  key: string
  title: string
  index: number // Öbek (chunk) indeksi
  wordIndex: number // Mutlak kelime indeksi
  total: number // Toplam öbek sayısı
  totalWords: number // Toplam kelime sayısı
  progressPercent: number
  chunkSize: number
  wpm: number
  updatedAt: number
}

const STORAGE_PREFIX = 'hizlioku_prog_'
const LAST_DOC_KEY = 'hizlioku_last_document'
const MAX_SAVED_DOCS = 50

export function getDocumentFingerprints(title: string, text: string): { docKey: string; contentKey: string } {
  const cleanTitle = (title || 'belge')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü]/gi, '_')
    .slice(0, 40)
  const len = text.length

  // Metin boyunca 24 noktadan örneklem alarak içerik özeti üret
  let hash = 0
  const step = Math.max(1, Math.floor(len / 24))
  for (let i = 0; i < len; i += step) {
    const char = text.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  const hashAbs = Math.abs(hash)

  return {
    docKey: `${cleanTitle}_${len}_${hashAbs}`,
    contentKey: `content_${len}_${hashAbs}`,
  }
}

export function saveReadingProgress(
  title: string,
  text: string,
  index: number,
  wordIndex: number,
  total: number,
  totalWords: number,
  chunkSize: number,
  wpm: number,
): void {
  if (typeof window === 'undefined' || !text || total <= 1) return

  try {
    const { docKey, contentKey } = getDocumentFingerprints(title, text)
    const percent = totalWords > 0 ? Math.round((wordIndex / totalWords) * 100) : total > 0 ? Math.round((index / total) * 100) : 0

    const record: SavedProgress = {
      key: docKey,
      title: title || 'Okunan Belge',
      index,
      wordIndex,
      total,
      totalWords,
      progressPercent: percent,
      chunkSize,
      wpm,
      updatedAt: Date.now(),
    }

    const payload = JSON.stringify(record)
    localStorage.setItem(STORAGE_PREFIX + docKey, payload)
    localStorage.setItem(STORAGE_PREFIX + contentKey, payload)

    // Son okunan doküman indeks listesini güncelle (en fazla 50 doküman sakla)
    const listKey = 'hizlioku_docs_index'
    const rawList = localStorage.getItem(listKey)
    let list: string[] = rawList ? JSON.parse(rawList) : []
    list = list.filter((k) => k !== docKey)
    list.unshift(docKey)
    if (list.length > MAX_SAVED_DOCS) {
      const removed = list.slice(MAX_SAVED_DOCS)
      removed.forEach((oldKey) => {
        localStorage.removeItem(STORAGE_PREFIX + oldKey)
      })
      list = list.slice(0, MAX_SAVED_DOCS)
    }
    localStorage.setItem(listKey, JSON.stringify(list))

    // Tarayıcı yenilendiğinde tekrar yüklemek için son aktif dokümanı kaydet (1.5MB altı)
    if (text.length < 1500000) {
      localStorage.setItem(
        LAST_DOC_KEY,
        JSON.stringify({
          title,
          text,
          updatedAt: Date.now(),
        }),
      )
    }
  } catch {
    // LocalStorage kotalarını sessizce yut
  }
}

export function loadReadingProgress(title: string, text: string): SavedProgress | null {
  if (typeof window === 'undefined' || !text) return null

  try {
    const { docKey, contentKey } = getDocumentFingerprints(title, text)
    const raw = localStorage.getItem(STORAGE_PREFIX + docKey) || localStorage.getItem(STORAGE_PREFIX + contentKey)
    if (!raw) return null
    return JSON.parse(raw) as SavedProgress
  } catch {
    return null
  }
}

export function loadLastActiveDoc(): { title: string; text: string } | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(LAST_DOC_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { title: string; text: string }
  } catch {
    return null
  }
}

/**
 * Kaydedilen kelime indeksine karşılık gelen chunk indeksini bulur.
 */
export function findChunkIndexForWord(
  chunks: { startIndex: number }[],
  wordIndex: number,
): number {
  if (!chunks || chunks.length === 0 || wordIndex <= 0) return 0
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (wordIndex >= chunks[i].startIndex) {
      return i
    }
  }
  return 0
}
