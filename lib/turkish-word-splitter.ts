/**
 * Türkçe Yapışık Kelime Ayırıcı, Sözlük ve Kök Bulucu (Turkish Stemmer & Word Splitter)
 *
 * Çevrimdışı (offline) 195.000+ kelimelik Türkçe sözlük (turkish_words.json),
 * kademeli ek soyma (progressive stemming), ünsüz yumuşaması onarımı (softening reversal)
 * ve kural tabanlı zarf-fiil / ünlü uyumu kırılması analizlerini birleştiren hibrit motor.
 */

import turkishWordsData from './turkish_words.json'

// 1. ADIM: Sözlük Kurulumu - O(1) arama için JavaScript Set nesnesi
export const turkishDictSet: Set<string> = new Set(
  (turkishWordsData as string[]).map((w) => w.toLowerCase()),
)

const KALIN_VOWELS = new Set(['a', 'ı', 'o', 'u', 'A', 'I', 'O', 'U'])
const INCE_VOWELS = new Set(['e', 'i', 'ö', 'ü', 'E', 'İ', 'Ö', 'Ü'])
const ALL_VOWELS = new Set(['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü', 'A', 'E', 'I', 'İ', 'O', 'Ö', 'U', 'Ü'])

// Kademeli ek soyma (stemming) için Türkçe çekim ve yapım ekleri listesi (uzundan kısaya)
export const TURKISH_SUFFIXES = [
  // 5-6 harfli birleşik ekler
  'tığımızda', 'tiğimizde', 'tuğumuzda', 'tüğümüzde',
  'dığımızda', 'diğimizde', 'duğumuzda', 'düğümüzde',
  'tığınızda', 'tiğinizde', 'tuğunuzda', 'tüğünüzde',
  'dığınızda', 'diğinizde', 'duğunuzda', 'düğünüzde',
  'tıklarında', 'tiklerinde', 'tuklarında', 'tüklerinde',
  'dıklarında', 'diklerinde', 'duklarında', 'düklerinde',
  'tığında', 'tiğinde', 'tuğunda', 'tüğünde',
  'dığında', 'diğinde', 'duğunda', 'düğünde',
  'tirmektedir', 'tirmekteler', 'mektedir', 'maktadır',
  'tirilmiş', 'tirilmişti', 'tirilmiştir',
  'laştırılmış', 'leştirilmiş', 'laştırılma', 'leştirilme',
  // 4 harfli ekler
  'tıkça', 'tikçe', 'tukça', 'tükçe',
  'dıkça', 'dikçe', 'dukça', 'dükçe',
  'yarak', 'yerek', 'arak', 'erek',
  'yınca', 'yince', 'yunca', 'yünce', 'ınca', 'ince', 'unca', 'ünce',
  'madan', 'meden', 'yken', 'ken',
  'maktan', 'mekten', 'makta', 'mekte',
  'mışlar', 'mişler', 'muşlar', 'müşler',
  'mıştır', 'miştir', 'muştur', 'müştür',
  'mıştı', 'mişti', 'muştu', 'müştü',
  'acaktır', 'ecektir', 'acaktı', 'ecekti',
  'larımız', 'lerimiz', 'larında', 'lerinde', 'larından', 'lerinden',
  'larına', 'lerine', 'larını', 'lerini', 'larının', 'lerinin',
  'ımızın', 'imizin', 'umuzun', 'ümüzün',
  'ımızda', 'imizde', 'umuzda', 'ümüzde',
  'ımızdan', 'imizden', 'umuzdan', 'ümüzden',
  'ımıza', 'imize', 'umuza', 'ümüze',
  'ımızı', 'imizi', 'umuzu', 'ümüzü',
  'saydı', 'seydi',
  'laşma', 'leşma', 'laştı', 'leşti',
  // 3 harfli ekler
  'dan', 'den', 'tan', 'ten', 'nda', 'nde',
  'lar', 'ler', 'nın', 'nin', 'nun', 'nün',
  'mız', 'miz', 'muz', 'müz', 'nız', 'niz', 'nuz', 'nüz',
  'lık', 'lik', 'luk', 'lük', 'lığ', 'liğ', 'luğ', 'lüğ',
  'sız', 'siz', 'suz', 'süz',
  'mak', 'mek',
  'mış', 'miş', 'muş', 'müş',
  'yor', 'ıyor', 'iyor', 'uyor', 'üyor',
  'aca', 'ece', 'acak', 'ecek',
  'dım', 'dim', 'dum', 'düm', 'tım', 'tim', 'tum', 'tüm',
  'dık', 'dik', 'duk', 'dük', 'tık', 'tik', 'tuk', 'tük',
  'dın', 'din', 'dun', 'dün', 'tın', 'tin', 'tun', 'tün',
  'dır', 'dir', 'dur', 'dür', 'tır', 'tir', 'tur', 'tür',
  'ken', 'yıp', 'yip', 'yup', 'yüp',
  'sal', 'sel',
  'ıcı', 'ici', 'ucu', 'ücü',
  // 2 harfli ekler
  'da', 'de', 'ta', 'te',
  'na', 'ne', 'ya', 'ye', 'yı', 'yi', 'yu', 'yü', 'nı', 'ni', 'nu', 'nü',
  'ın', 'in', 'un', 'ün',
  'ım', 'im', 'um', 'üm',
  'sı', 'si', 'su', 'sü',
  'ma', 'me', 'dı', 'di', 'du', 'dü', 'tı', 'ti', 'tu', 'tü',
  'sa', 'se', 'ca', 'ce', 'ça', 'çe',
  'la', 'le', 'ar', 'er', 'ır', 'ir', 'ur', 'ür',
  'ıp', 'ip', 'up', 'üp',
  'an', 'en', 'al', 'el', 'ul', 'ül',
  'ış', 'iş', 'uş', 'üş', 'il', 'in',
  'lı', 'li', 'lu', 'lü',
  // 1 harfli ekler
  'a', 'e', 'ı', 'i', 'u', 'ü'
]

const GERUND_REGEX = /(y?ıp|y?ip|y?up|y?üp|y?arak|y?erek|y?ınca|y?ince|y?unca|y?ünce|madan|meden|y?ken|ken|dığında|diğinde|duğunda|düğünde|tığında|tiğinde|tuğunda|tüğünde|dığımızda|diğimizde|duğumuzda|düğümüzde|tığımızda|tiğimizde|dıkça|dikçe|dukça|dükçe|tıkça|tikçe|tukça|tükçe)$/i
const SUFFIX_ENDING_REGEX = /(dık|dik|duk|dük|tık|tik|tuk|tük|mış|miş|muş|müş|mıştı|mişti|muştu|müştü|mıştır|miştir|muştur|müştür|dır|dir|dur|dür|tır|tir|tur|tür|nın|nin|nun|nün|ın|in|un|ün|dan|den|tan|ten|da|de|ta|te|na|ne|ya|ye|a|e|yı|yi|yu|yü|ı|i|u|ü|la|le|yla|yle)$/i

/**
 * 2. c) Türkçe ünsüz yumuşamasını (ünsüz değişimi) tersine çevirerek olası kök varyantlarını üretir:
 * sonu 'ğ' ise 'k' yap ('uygarlığ' -> 'uygarlık')
 * sonu 'b' ise 'p' yap ('kitab' -> 'kitap')
 * sonu 'c' ise 'ç' yap ('ağac' -> 'ağaç')
 * sonu 'd' ise 't' yap ('kanad' -> 'kanat')
 */
export function getSofteningVariants(stem: string): string[] {
  const variants = [stem]
  if (stem.endsWith('ğ')) {
    variants.push(stem.slice(0, -1) + 'k')
  } else if (stem.endsWith('b')) {
    variants.push(stem.slice(0, -1) + 'p')
  } else if (stem.endsWith('c')) {
    variants.push(stem.slice(0, -1) + 'ç')
  } else if (stem.endsWith('d')) {
    variants.push(stem.slice(0, -1) + 't')
  }
  return variants
}

/**
 * Bir kök adayının (ünsüz değişimi varyantları ile birlikte) sözlükte olup olmadığını denetler
 */
export function checkStemInDict(stem: string): boolean {
  if (stem.length < 3) return false
  const variants = getSofteningVariants(stem)
  for (const v of variants) {
    if (turkishDictSet.has(v)) {
      return true
    }
  }
  return false
}

/**
 * 2. ADIM: Türkçe Kök Doğrulayıcı (isValidTurkishWord)
 * a) Kelime doğrudan turkishDictSet içinde varsa true döner.
 * b) Yoksa sonundaki çekim/yapım eklerini kademeli olarak soyarak kalan kökü sözlükte arar.
 * c) Ek soyarken ünsüz yumuşamasını tersine çevirerek arar.
 */
export function isValidTurkishWord(word: string): boolean {
  if (!word || word.length < 2) return false
  const w = word.toLowerCase()

  // a) Doğrudan sözlükte var mı?
  if (turkishDictSet.has(w)) return true

  // Yumuşama tersiyle doğrudan kontrol (örn: kitab -> kitap)
  if (checkStemInDict(w)) return true

  // b) Çekim/yapım eklerini kademeli olarak soy (Stemming)
  for (const s1 of TURKISH_SUFFIXES) {
    if (w.endsWith(s1) && w.length - s1.length >= 3) {
      const stem1 = w.slice(0, w.length - s1.length)
      if (checkStemInDict(stem1)) return true

      // 2. kademe ek soyma (örn: yapılandır-ıl-ması -> yapılandır)
      for (const s2 of TURKISH_SUFFIXES) {
        if (stem1.endsWith(s2) && stem1.length - s2.length >= 3) {
          const stem2 = stem1.slice(0, stem1.length - s2.length)
          if (checkStemInDict(stem2)) return true

          // 3. kademe ek soyma (uzun türetilmiş kelimeler için)
          for (const s3 of TURKISH_SUFFIXES) {
            if (stem2.endsWith(s3) && stem2.length - s3.length >= 3) {
              const stem3 = stem2.slice(0, stem2.length - s3.length)
              if (checkStemInDict(stem3)) return true
            }
          }
        }
      }
    }
  }

  return false
}

/**
 * 3. ADIM: Sözlük Tabanlı Yapışık Kelime Bölücü (splitWithDictionary)
 * - 9 harften uzun kelimelerde önce isValidTurkishWord kontrolü yapılır.
 *   Kelime tek başına geçerliyse (örn. "yapılandırılması") ASLA bölünmez!
 * - Geçerli değilse olası tüm bölünme noktalarından (i = 3 ... word.length - 3) ikiye ayrılır.
 * - Hem sol hem sağ parça geçerliyse en uygun noktadan ikiye böler.
 */
export function splitWithDictionary(word: string): string[] {
  if (!word || word.length < 10) return [word]

  // Baş ve son noktalama işaretlerini ayıkla
  const leadMatch = word.match(/^[^\wçğıöşüÇĞİÖŞÜ0-9]+/)
  const leadPunct = leadMatch ? leadMatch[0] : ''
  const trailMatch = word.match(/[^\wçğıöşüÇĞİÖŞÜ0-9]+$/)
  const trailPunct = trailMatch ? trailMatch[0] : ''

  const core = word.slice(leadPunct.length, word.length - trailPunct.length)
  if (core.length < 10) return [word]
  if (/[\d\-]/.test(core)) return [word]

  const lowerCore = core.toLowerCase()

  // 1. Kural: Kelime zaten tek başına geçerli bir Türkçe kelimeyse ASLA BÖLME!
  if (isValidTurkishWord(lowerCore)) {
    return [word]
  }

  // 2. Kural: i = 3 ... core.length - 3 noktalarından ikiye ayır
  const candidateMatches: Array<{
    splitIdx: number
    left: string
    right: string
    score: number
  }> = []

  for (let i = 3; i <= lowerCore.length - 3; i++) {
    const leftPart = lowerCore.slice(0, i)
    const rightPart = lowerCore.slice(i)

    // Sağ parça 'ğ' ile başlayamaz
    if (rightPart.startsWith('ğ')) continue

    if (isValidTurkishWord(leftPart) && isValidTurkishWord(rightPart)) {
      let score = 0

      // Sol parça zarf-fiil ile bitiyorsa en yüksek öncelik
      if (GERUND_REGEX.test(leftPart)) {
        score += 500
      } else if (SUFFIX_ENDING_REGEX.test(leftPart)) {
        score += 100
      }

      // Kök uzunluklarının dengesi
      score += Math.min(leftPart.length, rightPart.length)

      candidateMatches.push({
        splitIdx: i,
        left: core.slice(0, i),
        right: core.slice(i),
        score,
      })
    }
  }

  if (candidateMatches.length > 0) {
    candidateMatches.sort((a, b) => b.score - a.score)
    const best = candidateMatches[0]

    // Sağ parça da yapışık bir parça içeriyorsa özyinelemeli olarak kontrol et
    const restSplit = splitWithDictionary(best.right)
    return [
      `${leadPunct}${best.left}`,
      ...restSplit.slice(0, -1),
      `${restSplit[restSplit.length - 1]}${trailPunct}`,
    ]
  }

  return [word]
}

/**
 * Tek bir token'ı yapışık kelime süzgecinden geçirir (Sözlük + Stemmer)
 */
export function splitGluedTurkishWord(token: string): string[] {
  return splitWithDictionary(token)
}

/**
 * Token dizisini (kelimeler dizisi) yapışık kelime süzgecinden geçirir
 */
export function splitGluedTokens(tokens: string[]): string[] {
  if (!tokens || !tokens.length) return []
  const result: string[] = []
  for (const token of tokens) {
    if (!token) continue
    const parts = splitGluedTurkishWord(token)
    for (const p of parts) {
      if (p) result.push(p)
    }
  }
  return result
}

/**
 * Metin gövdesindeki satırları tokenize edip yapışık kelimeleri ayırarak metni yeniden oluşturur
 */
export function splitGluedText(text: string): string {
  if (!text) return ''
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return line
      const isHeading = /^#{1,6}\s+/.test(line)
      const prefix = isHeading ? line.match(/^#{1,6}\s+/)?.[0] || '' : ''
      const content = isHeading ? line.slice(prefix.length) : line
      const tokens = content.split(/\s+/).filter(Boolean)
      const split = splitGluedTokens(tokens)
      return `${prefix}${split.join(' ')}`
    })
    .join('\n')
}
