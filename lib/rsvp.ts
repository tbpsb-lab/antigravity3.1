import { splitGluedTokens } from './turkish-word-splitter'

export type ThemeId = 'ios' | 'linear' | 'kindle'

export type ChunkItem = {
  text: string
  words: string[]
  startIndex: number
  isSentenceEnd: boolean
  isHeading?: boolean
  isFootnote?: boolean
  footnoteLabel?: string
}

export const THEMES: { id: ThemeId; key: string; label: string; hint: string }[] = [
  { id: 'ios', key: 'A', label: 'Cam', hint: 'Apple / iOS minimalizmi' },
  { id: 'linear', key: 'B', label: 'Neon', hint: 'Linear / Raycast estetiği' },
  { id: 'kindle', key: 'C', label: 'Kağıt', hint: 'Kindle / e-kitap dokusu' },
]

export const MIN_WPM = 100
export const MAX_WPM = 1000
export const WPM_STEP = 25

export const SAMPLE_TEXT = `Okumak, zihnin sessizce yürüdüğü bir yoldur. Gözlerimiz satırların üzerinde ileri geri sıçrarken aslında zamanımızın büyük kısmını kelimeleri aramakla geçiririz. Hızlı seri görsel sunum, yani RSVP, bu yolculuğu tersine çevirir: kelimeler size gelir, siz yalnızca durursunuz.

Ekranın ortasındaki tek bir nokta, odağınızın çapasıdır. Her kelimenin en uygun tanıma noktası renkle işaretlenir ve tam olarak aynı yere hizalanır. Böylece göz kasları dinlenir, dikkat dağılmaz ve anlama doğal bir ritme kavuşur.

Başlangıçta dakikada iki yüz elli kelime yeterlidir. Rahatladıkça hızı yavaşça artırın. Noktalama işaretlerinde kısa duraklamalar, cümlelerin nefes almasını sağlar. Bir yeri kaçırdığınızı hissederseniz durun; bağlam görünümü, okuduğunuz cümleyi yeniden önünüze serer.

Unutmayın, amaç yalnızca hız değil, berraklıktır. Zihniniz sakin, gözünüz tek bir noktada ve metin akıp giderken, okumak yeniden keyifli bir sessizliğe dönüşür.`

/**
 * Satır sonu ve boşluklu tireleme onarım motoru (De-hyphenation Engine).
 * 1. Satır sonunda tire ("-" veya "\u00AD") + satır sonu (\r?\n) + küçük harf ([a-zçğıöşü]) örüntüsünü birleştirir
 *    Örnek: "prog-\nramlama" -> "programlama", "uygu-\r\nlama" -> "uygulama", "uygu\u00AD\nlama" -> "uygulama"
 * 2. Tire + boşluk + küçük harf ([a-zçğıöşü]) örüntüsünü birleştirir ("uygu- lama" -> "uygulama")
 * 3. İstisna olarak: Rakamlar arasındaki tireleri ("2025-2026") ve aralarında boşluk olmayan
 *    gerçek birleşik kelimeleri ("e-posta", "check-up") asla bozmaz.
 */
export function dehyphenateText(text: string): string {
  if (!text) return ''
  return text
    // 1. Satır sonunda tire + satır sonu (\r?\n) + küçük harf ([a-zçğıöşü])
    .replace(
      /([a-zA-ZçğıöşüÇĞİÖŞÜ0-9])[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s*[\r\n]+\s*([a-zçğıöşü])/g,
      '$1$2',
    )
    // 2. Tire + boşluk + küçük harf ([a-zçğıöşü])
    // İstisna: Rakamlar arasındaki tireleri ("2025-2026") ve aralarında boşluk olmayan birleşik kelimeleri ("e-posta", "check-up") korur
    .replace(
      /(?<!\d)([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s+([a-zçğıöşü]{1,15})(?!\d)/g,
      '$1$2',
    )
}

/**
 * 3. KURAL: Noktalama ve camelCase Temizliği
 * - Noktalama işaretlerinden sonra boşluk unutulmuşsa ayır:
 *   ([.,!?;:])([a-zA-ZÇĞİÖŞÜçğıöşü]) -> $1 $2 (Rakamları bozma, örn: 3.14).
 * - Küçük harften hemen sonra büyük harf geliyorsa ayır:
 *   ([a-zçğıöşü])([A-ZÇĞİÖŞÜ]) -> $1 $2.
 */
export function cleanPunctuationAndCamelCase(text: string): string {
  if (!text) return ''
  let t = text

  // URL ve e-posta adreslerini koru
  const urls: string[] = []
  t = t.replace(
    /\b(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    (m) => {
      urls.push(m)
      return `___URL_${urls.length - 1}___`
    },
  )

  // 1. Noktalama işaretlerinden sonra boşluk unutulmuşsa ayır (3.14 veya 12,5 gibi sayıları bozmadan):
  t = t.replace(/([.,!?;:])([a-zA-ZÇĞİÖŞÜçğıöşü])/g, '$1 $2')

  // 2. Küçük harften hemen sonra büyük harf geliyorsa ayır:
  t = t.replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2')

  // URL ve e-postaları geri yükle
  t = t.replace(/___URL_(\d+)___/g, (_, idx) => urls[Number(idx)])

  return t
}

export function tokenize(text: string): string[] {
  const dehyphenated = dehyphenateText(text)
  const cleaned = cleanPunctuationAndCamelCase(dehyphenated)
  const rawTokens = cleaned
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !/^#{1,6}$/.test(w))
    .map((w) => w.replace(/^#{1,6}(?=\S)/, ''))

  // Kelimeler dizilere (tokens) ayrıldıktan hemen sonra çalışan
  // Türkçe Yapışık Kelime Ayırıcı ve Yazım Denetimi (Post-Processing Word Splitter)
  return splitGluedTokens(rawTokens)
}

export interface TurkishORPResult {
  leftPart: string
  focusChar: string
  rightPart: string
  orpIndex: number
  cleanLength: number
  leadingOffset: number
}

/**
 * 1. KURAL: Noktalamadan Arındırılmış Türkçe ORP Algoritması (calculateTurkishORP)
 *
 * Türkçe'nin sondan eklemeli yapısına göre kelime kökünü merkeze alır:
 * - Kelime başındaki ("('«[ vb.) ve sonundaki (.,!?;:")'»] vb.) noktalama işaretlerini uzunluk hesabından hariç tutar (cleanLength).
 * - Baştaki noktalama sayısını leadingOffset olarak kaydeder.
 * - cleanLength değerine göre 0-tabanlı coreOrpIndex tablosu:
 *   * 1 harf -> 0
 *   * 2 - 5 harf -> 1
 *   * 6 - 9 harf -> 2
 *   * 10 - 13 harf -> 3
 *   * 14 ve üzeri harf -> 4 (Türkçe'de kök başta olduğu için asla 4'ten büyük indeks verilmez)
 * - Gerçek ORP indeksi: const orpIndex = leadingOffset + coreOrpIndex
 * - 3 parçaya ayırır: leftPart, focusChar, rightPart
 */
export function calculateTurkishORP(word: string): TurkishORPResult {
  if (!word) {
    return {
      leftPart: '',
      focusChar: '',
      rightPart: '',
      orpIndex: 0,
      cleanLength: 0,
      leadingOffset: 0,
    }
  }

  // Başındaki noktalama işaretlerini tespit et: " ( ' « [ “ ‘ vb.
  const leadMatch = word.match(/^[^\wçğıöşüÇĞİÖŞÜ0-9]+/)
  const leadingPunct = leadMatch ? leadMatch[0] : ''
  const leadingOffset = leadingPunct.length

  // Sonundaki noktalama işaretlerini tespit et: .,!?;:")'»] ” ’ vb.
  const trailMatch = word.match(/[^\wçğıöşüÇĞİÖŞÜ0-9]+$/)
  const trailingPunct = trailMatch ? trailMatch[0] : ''
  const trailingOffset = trailingPunct.length

  // Noktalamalardan arındırılmış temiz kelime uzunluğu
  const cleanLength = Math.max(0, word.length - leadingOffset - trailingOffset)

  let coreOrpIndex = 0
  if (cleanLength <= 1) {
    coreOrpIndex = 0
  } else if (cleanLength <= 5) {
    coreOrpIndex = 1
  } else if (cleanLength <= 9) {
    coreOrpIndex = 2
  } else if (cleanLength <= 13) {
    coreOrpIndex = 3
  } else {
    coreOrpIndex = 4
  }

  const rawOrpIndex = cleanLength > 0 ? leadingOffset + coreOrpIndex : Math.floor((word.length - 1) / 2)
  const orpIndex = Math.min(Math.max(0, rawOrpIndex), Math.max(0, word.length - 1))

  const leftPart = word.slice(0, orpIndex)
  const focusChar = word[orpIndex] || ''
  const rightPart = word.slice(orpIndex + 1)

  return {
    leftPart,
    focusChar,
    rightPart,
    orpIndex,
    cleanLength,
    leadingOffset,
  }
}

export function pivotIndex(word: string): number {
  return calculateTurkishORP(word).orpIndex
}

export function splitAtPivot(word: string): [string, string, string] {
  const { leftPart, focusChar, rightPart } = calculateTurkishORP(word)
  return [leftPart, focusChar, rightPart]
}

/**
 * Cümle ve başlık sınırlarına duyarlı akıllı kelime öbekleme (Chunking).
 * Cümle veya başlık bittiğinde sonraki cümlenin kelimeleri mevcut öbeğe karıştırılmaz.
 * Başlık satırları (# ile başlayanlar) ayrı, bütünlüklü bir öbek olarak sunulur.
 */
export function createChunks(
  input: string | string[],
  chunkSize: number = 1,
  options: { enableFootnotes?: boolean } = {},
): ChunkItem[] {
  if (!input) return []
  const { enableFootnotes = true } = options

  // Eğer metin string olarak verildiyse satır ve başlık duyarlı ayrıştırma uygula
  if (typeof input === 'string') {
    // Kelimeleri bölmeden ÖNCE de-hyphenation ve noktalama/camelCase kurallarını uygula
    const sanitizedInput = cleanPunctuationAndCamelCase(dehyphenateText(input))
    const lines = sanitizedInput.split(/\r?\n/)
    const chunks: ChunkItem[] = []
    let curWords: string[] = []
    let curStart = 0
    let globalWordIdx = 0
    let inFootnote = false

    const flush = (isSentenceEnd: boolean, isHeading: boolean = false, isFootnote: boolean = false) => {
      if (curWords.length === 0) return
      chunks.push({
        text: curWords.join(' '),
        words: [...curWords],
        startIndex: curStart,
        isSentenceEnd,
        isHeading,
        isFootnote,
      })
      curWords = []
    }

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) {
        if (curWords.length > 0) {
          flush(true, false, inFootnote)
        }
        continue
      }

      const isHeading = /^#{1,6}\s+\S+/.test(line)

      if (isHeading) {
        if (curWords.length > 0) {
          flush(true, false, inFootnote)
        }
        const cleanLine = line.replace(/^#{1,6}\s+/, '')
        const hWords = splitGluedTokens(cleanLine.split(/\s+/).filter(Boolean))
        if (hWords.length > 0) {
          const hStart = globalWordIdx
          globalWordIdx += hWords.length
          chunks.push({
            text: hWords.join(' '),
            words: hWords,
            startIndex: hStart,
            isSentenceEnd: true,
            isHeading: true,
            isFootnote: false,
          })
        }
        continue
      }

      const lineWords = splitGluedTokens(line.split(/\s+/).filter(Boolean))
      for (let i = 0; i < lineWords.length; i++) {
        const w = lineWords[i]
        if (/^\[dipnot/i.test(w)) inFootnote = true

        if (!enableFootnotes && inFootnote) {
          if (w.includes(']')) inFootnote = false
          continue
        }

        const wIdx = globalWordIdx++
        if (curWords.length === 0) {
          curStart = wIdx
        }
        curWords.push(w)

        const isFootnoteEnd = inFootnote && w.includes(']')
        const isSentenceEnd = /[.!?…]["”’»)]*$/.test(w) || isFootnoteEnd
        if (isFootnoteEnd) inFootnote = false

        if (curWords.length >= Math.max(1, chunkSize) || isSentenceEnd) {
          flush(isSentenceEnd, false, inFootnote || /^\[dipnot/i.test(curWords[0]))
        }
      }
    }

    if (curWords.length > 0) {
      flush(true, false, inFootnote)
    }

    return chunks
  }

  // Fallback: dizi girdisi için kelime bazlı ayrıştırma
  const words = splitGluedTokens(input)
  const chunks: ChunkItem[] = []
  let currentWords: string[] = []
  let currentStartIndex = 0
  let isCurrentHeading = false
  let isCurrentFootnote = false
  let currentFootnoteLabel: string | undefined = undefined
  let inFootnoteSpan = false

  const flush = (isEnd: boolean) => {
    if (currentWords.length === 0) return
    chunks.push({
      text: currentWords.join(' '),
      words: [...currentWords],
      startIndex: currentStartIndex,
      isSentenceEnd: isEnd,
      isHeading: isCurrentHeading,
      isFootnote: isCurrentFootnote,
      footnoteLabel: currentFootnoteLabel,
    })
    currentWords = []
    isCurrentHeading = false
    isCurrentFootnote = false
    currentFootnoteLabel = undefined
  }

  for (let i = 0; i < words.length; i++) {
    const rawWord = words[i]
    if (!rawWord) continue

    const startsFootnote = /^\[dipnot[\:\s]/i.test(rawWord)
    if (startsFootnote) {
      inFootnoteSpan = true
    }

    // Eğer dipnotlar devre dışı bırakılmışsa dipnot bloğunun tüm kelimelerini atla
    if (!enableFootnotes && inFootnoteSpan) {
      if (rawWord.includes(']')) {
        inFootnoteSpan = false
      }
      continue
    }

    const startsHeading = rawWord.startsWith('#')
    const isFootnoteTag = startsFootnote || inFootnoteSpan

    // Başlık veya dipnot başlangıcında önceki öbeği hemen kapat
    if (startsHeading || (startsFootnote && currentWords.length > 0)) {
      flush(false)
      currentStartIndex = i
    }

    if (currentWords.length === 0) {
      currentStartIndex = i
      if (startsHeading) isCurrentHeading = true
      if (isFootnoteTag) {
        isCurrentFootnote = true
        currentFootnoteLabel = 'Dipnot'
      }
    }

    const cleanWord = startsHeading ? rawWord.replace(/^#+\s*/, '') : rawWord
    if (cleanWord) {
      currentWords.push(cleanWord)
    }

    if (inFootnoteSpan && rawWord.includes(']')) {
      inFootnoteSpan = false
      flush(true)
      continue
    }

    const isSentenceEnd = /[.!?…]["”’»)]*$/.test(rawWord)
    const isHeadingEnd =
      isCurrentHeading &&
      (isSentenceEnd || currentWords.length >= 8 || i + 1 >= words.length || Boolean(words[i + 1]?.startsWith('#')))

    const nextStartsSpecial =
      i + 1 < words.length && (Boolean(words[i + 1]?.startsWith('#')) || /^\[dipnot/i.test(words[i + 1]))

    if (
      currentWords.length >= Math.max(1, chunkSize) ||
      isSentenceEnd ||
      isHeadingEnd ||
      nextStartsSpecial ||
      i === words.length - 1
    ) {
      flush(isSentenceEnd || isHeadingEnd)
    }
  }

  return chunks
}

/**
 * Dinamik süre hesaplayıcı (Speed Variability, Başlık Beklemesi, Noktalama Nefes Payı)
 */
export function chunkDelay(chunk: ChunkItem | string, wpm: number, chunkSize: number = 1): number {
  const base = 60000 / wpm
  const text = typeof chunk === 'string' ? chunk : chunk.text
  const words = typeof chunk === 'string' ? text.split(/\s+/).filter(Boolean) : chunk.words
  const wordCount = Math.max(1, words.length)
  const isHeading = typeof chunk === 'object' ? chunk.isHeading : text.startsWith('#')
  const isSentenceEnd = typeof chunk === 'object' ? chunk.isSentenceEnd : /[.!?…]["”’»)]*$/.test(text)
  const isFootnote = typeof chunk === 'object' ? chunk.isFootnote : /^\[dipnot/i.test(text)

  // 1. Chunk boyutuna göre süre: Ortalama WPM sabit kalır, çoklu kelimede algılama payı verilir
  let duration = base * (wordCount > 1 ? Math.pow(wordCount, 0.72) : 1)

  // 2. Başlık beklemesi ve nefes payı:
  // "Bölüm Başlığı" metin rozeti yerine; başlık daha yavaş geçer (~3.5x) ve ardından nefes payı (+450ms) verilir (~1.25s)
  if (isHeading) {
    return Math.max(duration * 3.5 + 450, 1250)
  }

  // 3. Dipnot başlangıç payı
  if (isFootnote) {
    duration *= 1.25
  }

  // 4. Noktalama nefes payı
  if (isSentenceEnd) {
    duration *= 2.1
  } else if (/[,;:–—]["”’»)]*$/.test(text)) {
    duration *= 1.4
  }

  // 5. Kelime uzunluğu esnemesi (uzun kelimelerde yavaşla, kısa kelimelerde hızlan)
  const totalChars = text.replace(/\s+/g, '').length
  if (totalChars > 11 * wordCount) {
    duration *= 1.18
  } else if (totalChars < 4 * wordCount && !isSentenceEnd) {
    duration *= 0.92
  }

  return duration
}

export function wordDelay(word: string, wpm: number): number {
  return chunkDelay(word, wpm, 1)
}

export function formatRemaining(chunksLeft: number, wpm: number, chunkSize: number = 1): string {
  const estimatedWords = chunksLeft * Math.max(1, chunkSize)
  const seconds = Math.max(0, Math.round((estimatedWords / wpm) * 60))
  if (seconds < 60) return `${seconds} sn`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes} dk` : `${minutes} dk ${rest} sn`
}
