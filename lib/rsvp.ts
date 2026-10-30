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

export function tokenize(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !/^#{1,6}$/.test(w))
    .map((w) => w.replace(/^#{1,6}(?=\S)/, ''))
}

export function pivotIndex(word: string): number {
  const len = word.length
  if (len <= 1) return 0
  if (len <= 5) return 1
  if (len <= 9) return 2
  if (len <= 13) return 3
  return 4
}

export function splitAtPivot(word: string): [string, string, string] {
  const i = pivotIndex(word)
  return [word.slice(0, i), word.charAt(i), word.slice(i + 1)]
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
    // Fail-safe: satır sonunda tire ile bitip alt satırda devam eden bölünmüş kelimeleri önceden birleştir
    const sanitizedInput = input.replace(
      /([a-zA-ZçğıöşüÇĞİÖŞÜ0-9])[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\r?\n\s*([a-zçğıöşü])/g,
      '$1$2',
    )
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
        const hWords = cleanLine.split(/\s+/).filter(Boolean)
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

      const lineWords = line.split(/\s+/).filter(Boolean)
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
  const words = input
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
