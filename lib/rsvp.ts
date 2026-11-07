import { splitGluedTokens } from './turkish-word-splitter'

export type ThemeId = 'ios' | 'linear' | 'kindle'

export type BookPageInfo = {
  totalBookPages: number
  /** Her sayfa için [başlangıçSatırİndeksi, basılıSayfaNumarası] çiftleri (0-tabanlı satır indeksi) */
  pageStartLines: [number, number][]
}

export type ChunkItem = {
  text: string
  words: string[]
  startIndex: number
  pageNumber?: number
  isSentenceEnd: boolean
  isParagraphEnd?: boolean
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
    // Görünmez sıfır genişlikli boşlukları (ZWSP, ZWNJ, ZWJ, BOM, Word Joiner) temizle
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
    // 1. Satır sonunda tire + satır sonu (\r?\n) + küçük harf
    .replace(
      /([\p{L}\p{N}])[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s*[\r\n]+\s*([\p{Ll}])/gu,
      '$1$2',
    )
    // 2. Tire + boşluk + küçük harf
    // İstisna: Rakamlar arasındaki tireleri ("2025-2026") ve aralarında boşluk olmayan birleşik kelimeleri ("e-posta", "check-up") korur
    .replace(
      /(?<!\d)([\p{L}]{2,})[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s+([\p{Ll}]{1,15})(?!\d)/gu,
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
  let t = text.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')

  // URL ve e-posta adreslerini koru (sondaki noktalama hariç tüm URL'yi yakala)
  const urls: string[] = []
  t = t.replace(
    /(?:https?:\/\/[^\s)”"'>\]]+|www\.[^\s)”"'>\]]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (m) => {
      const cleanUrl = m.replace(/[.,!?;:]+$/, '')
      const trailing = m.slice(cleanUrl.length)
      urls.push(cleanUrl)
      return `___URL_${urls.length - 1}___${trailing}`
    },
  )

  // Kelimeler arasındaki bitişik em-dash (—), en-dash (–) ve elipsleri (…) ayır
  t = t.replace(/([\p{L}\p{N}])([—–…]+|\.{3,})([\p{L}\p{N}])/gu, '$1$2 $3')

  // 1. Noktalama işaretlerinden ve kapanış tırnaklarından sonra boşluk unutulmuşsa ayır (3.14 veya 12,5 gibi sayıları bozmadan):
  t = t.replace(/([.,!?;:…]["”’»]+|["”’»]+[.,!?;:…])([\p{L}])/gu, '$1 $2')
  t = t.replace(/(?<!feng şui)(?<=\p{L})(["”»])(?=\p{L})/gu, '$1 ')
  t = t.replace(/([.,!?;:…])([\p{L}])/gu, '$1 $2')

  // 2. Küçük harften hemen sonra büyük harf geliyorsa ayır:
  t = t.replace(/([\p{Ll}])([\p{Lu}])/gu, '$1 $2')

  // URL ve e-postaları geri yükle
  t = t.replace(/___URL_(\d+)___/g, (_, idx) => urls[Number(idx)] ?? '')

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

  // Grapheme / Code-point güvenli dizi (surrogate pair bölünmesini ve şapkalı harf kaybını önler)
  const chars = Array.from(word)
  const isWordChar = (ch: string) => /[\p{L}\p{N}]/u.test(ch)

  let leadingOffset = 0
  while (leadingOffset < chars.length && !isWordChar(chars[leadingOffset])) {
    leadingOffset++
  }

  let trailingOffset = 0
  while (
    trailingOffset < chars.length - leadingOffset &&
    !isWordChar(chars[chars.length - 1 - trailingOffset])
  ) {
    trailingOffset++
  }

  // Noktalamalardan arındırılmış temiz kelime uzunluğu
  const cleanLength = Math.max(0, chars.length - leadingOffset - trailingOffset)

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

  const rawOrpIndex = cleanLength > 0 ? leadingOffset + coreOrpIndex : Math.floor((chars.length - 1) / 2)
  const orpIndex = Math.min(Math.max(0, rawOrpIndex), Math.max(0, chars.length - 1))

  const leftPart = chars.slice(0, orpIndex).join('')
  const focusChar = chars[orpIndex] || ''
  const rightPart = chars.slice(orpIndex + 1).join('')

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
  options: { enableFootnotes?: boolean; pageInfo?: BookPageInfo | null } = {},
): ChunkItem[] {
  if (!input) return []
  const { enableFootnotes = true, pageInfo = null } = options

  // Eğer metin string olarak verildiyse satır ve başlık duyarlı ayrıştırma uygula
  if (typeof input === 'string') {
    // Kelimeleri bölmeden ÖNCE de-hyphenation ve noktalama/camelCase kurallarını uygula
    const sanitizedInput = cleanPunctuationAndCamelCase(dehyphenateText(input))
    const lines = sanitizedInput.split(/\r?\n/)
    const chunks: ChunkItem[] = []
    let curWords: string[] = []
    let curStart = 0
    let curPageNumber: number | undefined = undefined
    let globalWordIdx = 0
    let inFootnote = false
    const pageStarts = pageInfo?.pageStartLines
    let pagePtr = 0

    const flush = (
      isSentenceEnd: boolean,
      isFootnote: boolean = false,
      isParagraphEnd: boolean = false,
    ) => {
      if (curWords.length === 0) return
      chunks.push({
        text: curWords.join(' '),
        words: [...curWords],
        startIndex: curStart,
        pageNumber: curPageNumber,
        isSentenceEnd,
        isParagraphEnd,
        isFootnote,
      })
      curWords = []
    }

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const rawLine = lines[lineIdx]
      let linePageNum: number | undefined = undefined
      if (pageStarts && pageStarts.length > 0) {
        while (pagePtr + 1 < pageStarts.length && pageStarts[pagePtr + 1][0] <= lineIdx) {
          pagePtr++
        }
        linePageNum = pageStarts[pagePtr][1]
      }
      // Başlık saptama kaldırıldı: Varsa Markdown # işaretleri sessizce ayıklanır, tüm kelimeler standart akışa dahil edilir
      const line = rawLine.replace(/^#{1,6}\s*/, '').trim()
      if (!line) {
        if (curWords.length > 0) {
          flush(true, inFootnote, true)
        } else if (chunks.length > 0) {
          chunks[chunks.length - 1].isParagraphEnd = true
        }
        continue
      }

      const lineWords = splitGluedTokens(line.split(/\s+/).filter(Boolean))
      for (let i = 0; i < lineWords.length; i++) {
        const w = lineWords[i]
        const startsFootnote = /^\[dipnot/i.test(w)

        if (startsFootnote) {
          // Dipnot başlamadan önce bekleyen ana metin öbeğini kapat
          if (curWords.length > 0) {
            flush(false, inFootnote, false)
          }
          inFootnote = true
        }

        if (!enableFootnotes && inFootnote) {
          if (w.includes(']')) inFootnote = false
          continue
        }

        // Çoklu kelime modunda açılış tırnağı veya parantezi varsa önceki öbeği kapat
        if (curWords.length > 0 && /^[“"«(\[]/.test(w) && !inFootnote) {
          flush(false, false, false)
        }

        const wIdx = globalWordIdx++
        if (curWords.length === 0) {
          curStart = wIdx
          curPageNumber = linePageNum
        }
        curWords.push(w)

        const isFootnoteEnd = inFootnote && w.includes(']')
        const hasSentencePunct = /[.!?…]["”’»)\]]*$/.test(w) && !isAbbreviation(w)
        const isSentenceEnd = hasSentencePunct || isFootnoteEnd
        const isClauseBoundary = /[,;:—–]["”’»)\]]*$/.test(w)

        if (
          curWords.length >= Math.max(1, chunkSize) ||
          isSentenceEnd ||
          (chunkSize > 1 && isClauseBoundary)
        ) {
          flush(isSentenceEnd, inFootnote || startsFootnote)
        }

        if (isFootnoteEnd) {
          inFootnote = false
        }
      }
    }

    if (curWords.length > 0) {
      flush(true, inFootnote, true)
    } else if (chunks.length > 0) {
      chunks[chunks.length - 1].isParagraphEnd = true
    }

    return chunks
  }

  // Fallback: dizi girdisi için kelime bazlı ayrıştırma
  const words = splitGluedTokens(input)
  const chunks: ChunkItem[] = []
  let currentWords: string[] = []
  let currentStartIndex = 0
  let isCurrentFootnote = false
  let currentFootnoteLabel: string | undefined = undefined
  let inFootnoteSpan = false

  const flush = (isEnd: boolean, isParaEnd: boolean = false) => {
    if (currentWords.length === 0) return
    chunks.push({
      text: currentWords.join(' '),
      words: [...currentWords],
      startIndex: currentStartIndex,
      isSentenceEnd: isEnd,
      isParagraphEnd: isParaEnd,
      isFootnote: isCurrentFootnote,
      footnoteLabel: currentFootnoteLabel,
    })
    currentWords = []
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

    const isFootnoteTag = startsFootnote || inFootnoteSpan

    // Dipnot başlangıcında önceki öbeği hemen kapat
    if (startsFootnote && currentWords.length > 0) {
      flush(false)
      currentStartIndex = i
    }

    if (currentWords.length === 0) {
      currentStartIndex = i
      if (isFootnoteTag) {
        isCurrentFootnote = true
        currentFootnoteLabel = 'Dipnot'
      }
    }

    const cleanWord = rawWord.replace(/^#+\s*/, '')
    if (cleanWord) {
      currentWords.push(cleanWord)
    }

    if (inFootnoteSpan && rawWord.includes(']')) {
      inFootnoteSpan = false
      flush(true)
      continue
    }

    const isSentenceEnd = /[.!?…]["”’»)\]]*$/.test(rawWord) && !isAbbreviation(rawWord)
    const isClauseBoundary = /[,;:—–]["”’»)\]]*$/.test(rawWord)

    const nextStartsSpecial =
      i + 1 < words.length && /^\[dipnot/i.test(words[i + 1])

    if (
      currentWords.length >= Math.max(1, chunkSize) ||
      isSentenceEnd ||
      (chunkSize > 1 && isClauseBoundary) ||
      nextStartsSpecial ||
      i === words.length - 1
    ) {
      flush(isSentenceEnd, i === words.length - 1)
    }
  }

  return chunks
}

export const TURKISH_ABBREVIATIONS = new Set([
  'dr.',
  'prof.',
  'doç.',
  'av.',
  'vb.',
  'yy.',
  'bkz.',
  'hz.',
  'cad.',
  'sok.',
  'apt.',
  'no.',
  'sf.',
  'vs.',
  'alm.',
  'ing.',
  'fr.',
  'mad.',
  'böl.',
  'ç.',
  'e.',
  'n.',
])

export function isAbbreviation(word: string): boolean {
  const normalized = word
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/\u0307/g, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
  if (TURKISH_ABBREVIATIONS.has(normalized)) return true
  // Tek harfli isim kısaltmaları: örn. "M.", "A."
  if (/^[\p{L}]\.$/u.test(normalized)) return true
  return false
}

/**
 * 2. KURAL: Dynamic WPM Pacing Engine (calculateWordDelay)
 *
 * Her kelimenin uzunluğuna, harf yapısına ve noktalama işaretlerine göre
 * ekranda kalma süresini (delay ms) dinamik hesaplar:
 *
 * 1. Baz süre: baseDelay = 60000 / baseWpm
 * 2. Noktalamasız harf sayısı (cleanLength) ve başlangıç çarpanı (multiplier):
 *    - 1 - 3 harf: 0.9 (kısa bağlaçlarda hafif hızlan)
 *    - 4 - 8 harf: 1.0 (standart hız)
 *    - 9 - 11 harf: 1.25
 *    - 12 - 14 harf: 1.5
 *    - 15 ve üzeri harf: 1.75
 * 3. Noktalama Gecikmeleri (Üzerine Ekle):
 *    - Cümle bitiren noktalama (. ! ? … ." .”): +1.0 (Kısaltmalar hariç: Dr. Prof. vb. yy.)
 *    - Virgül, noktalı virgül, iki nokta veya tire (, ; : —): +0.5
 *    - Kelime içinde rakam varsa (/\d/): +0.3
 *    - Paragraf sonu: +1.4
 * 4. Üst sınır: Math.min(multiplier, 3.0) -> Math.round(baseDelay * multiplier)
 */
export function calculateWordDelay(
  word: string | ChunkItem,
  baseWpm: number,
  options: { isParagraphEnd?: boolean } = {},
): number {
  const text = typeof word === 'string' ? word : word.text
  const baseDelay = 60000 / Math.max(1, baseWpm)

  // 1. Kelimenin noktalamasız harf sayısını (cleanLength) bul
  const cleanWord = text.replace(/[^\p{L}\p{N}]/gu, '')
  const cleanLength = cleanWord.length

  // Başlangıç çarpanını (multiplier) belirle:
  let multiplier = 1.0
  if (cleanLength <= 3) {
    multiplier = 0.9 // 1 - 3 harf: kısa bağlaçlarda hafif hızlan
  } else if (cleanLength <= 8) {
    multiplier = 1.0 // 4 - 8 harf: standart hız
  } else if (cleanLength <= 11) {
    multiplier = 1.25 // 9 - 11 harf
  } else if (cleanLength <= 14) {
    multiplier = 1.5 // 12 - 14 harf
  } else if (cleanLength <= 18) {
    multiplier = 1.85 // 15 - 18 harf: Türkçe bitişken ekler
  } else {
    multiplier = 2.15 // 19 ve üzeri harf: Aşırı uzun bitişken kelimelerde bilişsel algılama payı
  }

  // Çoklu kelime öbeği (chunk > 1) modu için kelime sayısına göre algılama payı
  if (typeof word === 'object' && word.words && word.words.length > 1) {
    multiplier *= Math.pow(word.words.length, 0.72)
  }

  // 2. Noktalama Gecikmeleri (Üzerine Ekle)
  const isSentenceEndPunct = /[.!?…][”"’')\]]*$/.test(text)
  const isSentenceEnd = (typeof word === 'object' && word.isSentenceEnd) || isSentenceEndPunct
  const isAbbr = isAbbreviation(text)

  // a) Kelime cümle bitiren bir noktalama ile bitiyorsa: +1.0 artır (Kısaltmalar hariç)
  if (isSentenceEndPunct || isSentenceEnd) {
    if (!isAbbr) {
      multiplier += 1.0
    }
  } else if (/[,;:—–-][”"’')\]]*$/.test(text)) {
    // b) Kelime virgül, noktalı virgül, iki nokta veya tire ile bitiyorsa: +0.5 artır
    multiplier += 0.5
  }

  // c) Kelime içinde rakam varsa (/\d/): +0.3 artır
  if (/\d/.test(text)) {
    multiplier += 0.3
  }

  // d) Eğer kelime paragraf sonuysa: +1.4 artır
  const isParagraphEnd = options.isParagraphEnd || (typeof word === 'object' && word.isParagraphEnd)
  if (isParagraphEnd) {
    multiplier += 1.4
  }

  // Dipnot rozeti ek payı
  if (typeof word === 'object' && word.isFootnote) {
    multiplier += 0.25
  }

  // Toplam çarpanın çok aşırı uzamaması için üst sınır 3.0
  const cappedMultiplier = Math.min(multiplier, 3.0)
  return Math.round(baseDelay * cappedMultiplier)
}

export function chunkDelay(chunk: ChunkItem | string, wpm: number, chunkSize: number = 1): number {
  return calculateWordDelay(chunk, wpm, {
    isParagraphEnd: typeof chunk === 'object' ? chunk.isParagraphEnd : false,
  })
}

export function wordDelay(word: string, wpm: number): number {
  return calculateWordDelay(word, wpm)
}

export function formatRemaining(chunksLeft: number, wpm: number, chunkSize: number = 1): string {
  const estimatedWords = chunksLeft * Math.max(1, chunkSize)
  const seconds = Math.max(0, Math.round((estimatedWords / wpm) * 60))
  if (seconds < 60) return `${seconds} sn`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes} dk` : `${minutes} dk ${rest} sn`
}

function isSentenceBoundaryItem(item: ChunkItem | string | undefined): boolean {
  if (!item) return false
  if (typeof item === 'object') {
    if (item.isSentenceEnd || item.isParagraphEnd) return true
    const t = item.text.trim()
    return /[.!?…]["”’»)\u201D\u2019\]]*$/.test(t) && !isAbbreviation(t)
  }
  const s = String(item).trim()
  return /[.!?…]["”’»)\u201D\u2019\]]*$/.test(s) && !isAbbreviation(s)
}

/**
 * Akıllı Cümle Başı Bulma Algoritması (Sentence-Boundary Rewind Engine)
 */
export function findCurrentSentenceStartIndex(
  chunks: (ChunkItem | string)[],
  currentIndex: number,
): number {
  if (!chunks || chunks.length === 0 || currentIndex <= 0) {
    return 0
  }

  const isBoundary = (idx: number): boolean => {
    if (idx < 0 || idx >= chunks.length) return false
    return isSentenceBoundaryItem(chunks[idx])
  }

  for (let i = currentIndex - 1; i >= 0; i--) {
    if (isBoundary(i)) {
      return i + 1
    }
  }

  return 0
}

/**
 * Akıllı Cümle Başı Geri Sarma Algoritması:
 * Geri sarma tetiklendiğinde (← tuşu veya sol dokunma alanı) sadece 1 kelime değil,
 * tam olarak önceki cümlenin ilk kelimesine konumlanmayı sağlar.
 */
export function findPreviousSentenceIndex(
  chunks: (ChunkItem | string)[],
  currentIndex: number,
  thresholdWords: number = 3,
): number {
  if (!chunks || chunks.length === 0 || currentIndex <= 0) {
    return 0
  }

  const isBoundary = (idx: number): boolean => {
    if (idx < 0 || idx >= chunks.length) return false
    return isSentenceBoundaryItem(chunks[idx])
  }

  // 1. Mevcut cümlenin bittiği önceki sınırı geriye doğru ara
  let currentSentenceEndBefore = -1
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (isBoundary(i)) {
      currentSentenceEndBefore = i
      break
    }
  }

  const currentSentenceStart = currentSentenceEndBefore + 1

  const getWordStart = (idx: number): number => {
    if (idx < 0 || idx >= chunks.length) return idx
    const item = chunks[idx]
    if (item && typeof item === 'object' && typeof (item as ChunkItem).startIndex === 'number') {
      return (item as ChunkItem).startIndex
    }
    return idx
  }

  const distanceWords = getWordStart(currentIndex) - getWordStart(currentSentenceStart)
  const distanceChunks = currentIndex - currentSentenceStart
  const distance = Math.max(distanceWords, distanceChunks)

  // 2. Çok Yakın Durum Eşiği: 3 kelimeden yakınsak bir önceki cümlenin ilk kelimesine zıpla
  if (distance < thresholdWords) {
    if (currentSentenceStart <= 0) {
      // Zaten ilk cümle içindeyiz, metin başına dön
      return 0
    }

    // Bir önceki cümlenin bittiği sınırı ara (currentSentenceStart - 1'in de öncesi)
    let prevSentenceEndBefore = -1
    for (let i = currentSentenceStart - 2; i >= 0; i--) {
      if (isBoundary(i)) {
        prevSentenceEndBefore = i
        break
      }
    }

    const prevSentenceStart = prevSentenceEndBefore + 1
    return Math.max(0, prevSentenceStart)
  }

  // 3. Cümle içinde yeterince ilerideyiz, mevcut cümlenin başına zıpla
  return Math.max(0, currentSentenceStart)
}

/**
 * Akıllı Sonraki Cümle Başı Atlama Algoritması:
 * İleri atlama tetiklendiğinde (sağ %25 dokunma alanı veya sağ ok tuşu)
 * doğrudan bir sonraki cümlenin ilk kelimesine zıplar.
 */
export function findNextSentenceIndex(
  chunks: (ChunkItem | string)[],
  currentIndex: number,
): number {
  if (!chunks || chunks.length === 0 || currentIndex >= chunks.length - 1) {
    return Math.max(0, (chunks?.length || 1) - 1)
  }

  const isBoundary = (idx: number): boolean => {
    if (idx < 0 || idx >= chunks.length) return false
    return isSentenceBoundaryItem(chunks[idx])
  }

  for (let i = currentIndex; i < chunks.length - 1; i++) {
    if (isBoundary(i)) {
      return i + 1
    }
  }

  return chunks.length - 1
}

const TURKISH_STOP_CONNECTORS = new Set([
  've',
  'de',
  'da',
  'ki',
  'mi',
  'mı',
  'mu',
  'mü',
  'ya',
  'o',
  'bu',
  'şu',
  'ne',
  'ile',
  'ama',
  'için',
  'gibi',
  'veya',
  'hem',
  'ise',
])

export type BionicWordParts = {
  leading: string
  anchor: string
  tail: string
  isConnector: boolean
}

/**
 * 2K / 3K / 4K Çoklu Kelime Öbekleri İçin Akıllı Bionic Katmanı:
 * - Kısa bağlaçları/edatları ("ve", "de", "için", "ile" vb.) gölgede bırakarak gözün
 *   yalnızca anlam taşıyan kelimelerin köklerine (bilişsel çıpalara) tutunmasını sağlar.
 * - Kelime başındaki tırnak/parantez gibi noktalama işaretlerini ayırır, tipografiyi bozmaz.
 */
export function formatBionicChunk(words: string[]): BionicWordParts[] {
  if (!words || words.length === 0) return []

  const cleanNormalized = words.map((w) =>
    w
      .replace(/[^\p{L}\p{N}]/gu, '')
      .toLocaleLowerCase('tr-TR'),
  )

  // Öbekte en az bir tane içerik kelimesi (bağlaç olmayan) var mı kontrol et
  const hasContentWord = cleanNormalized.some(
    (c) => c.length > 1 && !TURKISH_STOP_CONNECTORS.has(c),
  )

  return words.map((rawWord, idx) => {
    const clean = cleanNormalized[idx]
    if (hasContentWord && (clean.length <= 1 || TURKISH_STOP_CONNECTORS.has(clean))) {
      return {
        leading: '',
        anchor: '',
        tail: rawWord,
        isConnector: true,
      }
    }

    const match = rawWord.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}]+)([\s\S]*)$/u)
    if (!match) {
      return {
        leading: '',
        anchor: '',
        tail: rawWord,
        isConnector: false,
      }
    }

    const [, leading, core, trailing] = match
    const chars = Array.from(core)
    const len = chars.length

    let boldCount = 1
    if (len <= 3) {
      boldCount = 1
    } else if (len <= 5) {
      boldCount = 2
    } else if (len <= 8) {
      boldCount = 3
    } else if (len <= 11) {
      boldCount = 4
    } else {
      boldCount = 5
    }

    const anchor = chars.slice(0, boldCount).join('')
    const restCore = chars.slice(boldCount).join('')

    return {
      leading,
      anchor,
      tail: restCore + trailing,
      isConnector: false,
    }
  })
}



