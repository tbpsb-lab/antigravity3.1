/**
 * Türkçe Yapışık Kelime Ayırıcı ve Yazım Denetimi (Post-Processing Word Splitter)
 *
 * PDF ayrıştırma ve tokenizasyon hattının (pipeline) en sonunda çalışır.
 * PDF içindeki boşluksuz kaydedilmiş birleşik kelimeleri hibrit mimariyle ayırır:
 * 1. Sadece Şüphelileri Denetle (>= 10 karakter, noktalama ve rakamlar korunur).
 * 2. Zarf-Fiil (-ıp, -erek, -ınca, -dığında vb.) ve çekim eki sınır tespiti.
 * 3. 14+ harfli kelimelerde Büyük Ünlü Uyumu kırılması ve sözlük/kök doğrulaması.
 */

const KALIN_VOWELS = new Set(['a', 'ı', 'o', 'u', 'A', 'I', 'O', 'U'])
const INCE_VOWELS = new Set(['e', 'i', 'ö', 'ü', 'E', 'İ', 'Ö', 'Ü'])
const ALL_VOWELS = new Set(['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü', 'A', 'E', 'I', 'İ', 'O', 'Ö', 'U', 'Ü'])

export const COMMON_TURKISH_ROOTS = new Set<string>([
  // İsimler / Sıfatlar
  'uygar', 'uygarlık', 'eğitim', 'insan', 'insanlar', 'çocuk', 'çocuklar', 'kadın', 'erkek',
  'kitap', 'kitaplar', 'kütüphane', 'okul', 'sınıf', 'öğrenci', 'öğretmen', 'dünya', 'hayat',
  'zaman', 'fikir', 'tarih', 'bilgi', 'soru', 'cevap', 'sorun', 'akıl', 'göz', 'yüz', 'el',
  'baş', 'gün', 'gece', 'sabah', 'akşam', 'yıl', 'hava', 'su', 'yer', 'yol', 'şehir', 'ülke',
  'devlet', 'millet', 'toplum', 'kültür', 'sanat', 'bilim', 'madde', 'kelime', 'cümle', 'metin',
  'sayfa', 'bölüm', 'parça', 'taraf', 'nokta', 'durum', 'olay', 'sonuç', 'neden', 'sebep',
  'alan', 'konu', 'biçim', 'anlam', 'derece', 'oran', 'sistem', 'yapı', 'özellik', 'ilişki',
  'duygu', 'düşünce', 'davranış', 'hareket', 'başarı', 'kuvvet', 'güç', 'seviye', 'araç',
  'büyük', 'küçük', 'uzun', 'kısa', 'geniş', 'dar', 'yüksek', 'alçak', 'yeni', 'eski',
  'güzel', 'çirkin', 'iyi', 'kötü', 'doğru', 'yanlış', 'kolay', 'zor', 'açık', 'kapalı',
  'sıcak', 'soğuk', 'temiz', 'kirli', 'ağır', 'hafif', 'önemli', 'farklı', 'aynı', 'başka',
  'bütün', 'tüm', 'her', 'hiç', 'bir', 'iki', 'üç', 'dört', 'beş', 'on', 'yüz', 'bin',
  'birçok', 'birkaç', 'birtakım', 'fazla', 'eksik', 'kendi', 'böyle', 'şöyle', 'öyle',
  'şimdi', 'sonra', 'önce', 'erken', 'geç', 'artık', 'hemen', 'daima', 'bazen', 'asla',
  'ancak', 'fakat', 'çünkü', 'belki', 'zaten', 'tabii', 'elbette', 'nasıl', 'neden', 'nerede',
  'program', 'programla', 'programlama', 'değer', 'değerlendir', 'değerlendirme',
  'sorum', 'sorumlu', 'sorumluluk', 'karşı', 'karşılaş', 'karşılaştır', 'karşılaştırma',
  'fark', 'farkında', 'farkındalık', 'geliş', 'geliştir', 'geliştiril',
  'özel', 'özelleş', 'özelleştir', 'özelleştiril', 'gerçek', 'gerçekleş', 'gerçekleştir',
  'etki', 'etkile', 'etkilen', 'belirt', 'belirtil', 'çalış', 'çalışan',
  // Fiil Kökleri
  'bak', 'kaç', 'git', 'gid', 'gel', 'yap', 'et', 'ed', 'al', 'ver', 'çık', 'in',
  'gör', 'bil', 'duy', 'anla', 'iste', 'ara', 'bul', 'oku', 'yaz', 'konuş', 'söyle',
  'düşün', 'çalış', 'yaşa', 'başla', 'bitir', 'dur', 'kalk', 'otur', 'koş', 'yürü',
  'sev', 'kork', 'bekle', 'bırak', 'koy', 'çek', 'aç', 'kapa', 'kal', 'dön', 'düş',
  'gül', 'ağla', 'kazan', 'kaybet', 'öğren', 'öğret', 'tanı', 'anlat', 'göster', 'değiş',
  'koru', 'ilerle', 'başla', 'öde', 'tara', 'ye', 'de'
])

export const VERB_STEMS = new Set<string>([
  'bak', 'kaç', 'git', 'gid', 'gel', 'yap', 'et', 'ed', 'al', 'ver', 'çık', 'in',
  'gör', 'bil', 'duy', 'anla', 'iste', 'ara', 'bul', 'oku', 'yaz', 'konuş', 'söyle',
  'düşün', 'çalış', 'yaşa', 'başla', 'bitir', 'dur', 'kalk', 'otur', 'koş', 'yürü',
  'sev', 'kork', 'bekle', 'bırak', 'koy', 'çek', 'aç', 'kapa', 'kal', 'dön', 'düş',
  'gül', 'ağla', 'kazan', 'kaybet', 'öğren', 'öğret', 'tanı', 'anlat', 'göster', 'değiş',
  'koru', 'ilerle', 'başla', 'öde', 'tara', 'ye', 'de'
])

export const COMMON_SUFFIXES = [
  'da', 'de', 'ta', 'te', 'dan', 'den', 'tan', 'ten', 'nda', 'nde', 'ndan', 'nden',
  'a', 'e', 'ya', 'ye', 'na', 'ne', 'ı', 'i', 'u', 'ü', 'yı', 'yi', 'yu', 'yü', 'nı', 'ni', 'nu', 'nü',
  'ın', 'in', 'un', 'ün', 'nın', 'nin', 'nun', 'nün',
  'lar', 'ler', 'ları', 'leri', 'larda', 'lerde', 'lardan', 'lerden', 'larına', 'lerine', 'ların', 'lerin',
  'ım', 'im', 'um', 'üm', 'ın', 'in', 'un', 'ün', 'sı', 'si', 'su', 'sü',
  'ımız', 'imiz', 'umuz', 'ümüz', 'ınız', 'iniz', 'unuz', 'ünüz',
  'lık', 'lik', 'luk', 'lük', 'lığa', 'liğe', 'luğa', 'lüğe', 'lığı', 'liği', 'lüğü', 'lüğü',
  'lı', 'li', 'lu', 'lü', 'sız', 'siz', 'suz', 'süz', 'sal', 'sel', 'salı', 'seli',
  'la', 'le', 'yla', 'yle', 'ca', 'ce', 'ça', 'çe',
  'mak', 'mek', 'ma', 'me', 'makta', 'mekte', 'maktan', 'mekten',
  'dı', 'di', 'du', 'dü', 'tı', 'ti', 'tu', 'tü', 'dım', 'dim', 'dum', 'düm', 'dık', 'dik', 'duk', 'dük',
  'dılar', 'diler', 'tılar', 'tiler',
  'mış', 'miş', 'muş', 'müş', 'mıştı', 'mişti', 'muştu', 'müştü', 'mıştır', 'miştir', 'muştur', 'müştür',
  'ar', 'er', 'ır', 'ir', 'ur', 'ür', 'ıyor', 'iyor', 'uyor', 'üyor',
  'acak', 'ecek', 'acaktı', 'ecekti', 'acaktır', 'ecektir',
  'an', 'en', 'ıcı', 'ici', 'ucu', 'ücü',
  'ıp', 'ip', 'up', 'üp', 'yıp', 'yip', 'yup', 'yüp',
  'arak', 'erek', 'yarak', 'yerek',
  'ınca', 'ince', 'unca', 'ünce', 'yınca', 'yince', 'yunca', 'yünce',
  'madan', 'meden', 'ken', 'yken',
  'dığında', 'diğinde', 'duğunda', 'düğünde', 'tığında', 'tiğinde', 'tuğunda', 'tüğünde',
  'dığımızda', 'diğimizde', 'duğumuzda', 'düğümüzde', 'tığımızda', 'tiğimizde',
  'dığınızda', 'diğinizde', 'duğunuzda', 'düğünüzde', 'tığınızda', 'tiğinizde',
  'dıklarında', 'diklerinde', 'duklarında', 'düklerinde', 'tıklarında', 'tiklerinde',
  'dıkça', 'dikçe', 'dukça', 'dükçe', 'tıkça', 'tikçe', 'tukça', 'tükçe',
  'dır', 'dir', 'dur', 'dür', 'tır', 'tir', 'tur', 'tür',
  'meye', 'maya', 'mesi', 'ması', 'mesine', 'masına',
  'tir', 'tirici', 'tiril', 'tirilmiş', 'tirilen', 'tirmektedir', 'mektedir', 'maktadır'
]

const GERUND_SUFFIX_PATTERNS = [
  /(.+?)(dıklarında|diklerinde|duklarında|düklerinde|tıklarında|tiklerinde|dığınızda|diğinizde|duğunuzda|düğünüzde|tığınızda|tiğinizde|dığımızda|diğimizde|duğumuzda|düğümüzde|tığımızda|tiğimizde|dığında|diğinde|duğunda|düğünde|tığında|tiğinde|tuğunda|tüğünde)$/i,
  /(.+?)(dıkça|dikçe|dukça|dükçe|tıkça|tikçe|tukça|tükçe)$/i,
  /(.+?)(yarak|yerek|arak|erek)$/i,
  /(.+?)(yınca|yince|yunca|yünce|ınca|ince|unca|ünce)$/i,
  /(.+?)(madan|meden)$/i,
  /(.+?)(yken|ken)$/i,
  /(.+?)(yıp|yip|yup|yüp|ıp|ip|up|üp)$/i,
  /(.+?)(mıştır|miştir|muştur|müştür|mıştı|mişti|muştu|müştü|acaktır|ecektir|saydı|seydi)$/i,
  /(.+?)(dır|dir|dur|dür|tır|tir|tur|tür)$/i,
  /(.+?)(mış|miş|muş|müş)$/i
]

/**
 * Kelimenin bilinen tekil bir Türkçe kelime olup olmadığını doğrular
 */
export function isSingleKnownWord(w: string): boolean {
  const lower = w.toLowerCase()
  if (COMMON_TURKISH_ROOTS.has(lower)) return true

  for (const root of COMMON_TURKISH_ROOTS) {
    if (lower.startsWith(root)) {
      const rest = lower.slice(root.length)
      if (!rest) return true
      if (COMMON_SUFFIXES.includes(rest)) return true
      for (const suf1 of COMMON_SUFFIXES) {
        if (rest.startsWith(suf1)) {
          const rest2 = rest.slice(suf1.length)
          if (!rest2 || COMMON_SUFFIXES.includes(rest2)) return true
        }
      }
    }
  }
  return false
}

/**
 * Kelimenin geçerli bir Türkçe morfoloji veya köke sahip olup olmadığını denetler
 */
export function isLikelyTurkishWord(word: string): boolean {
  if (!word || word.length < 3) return false
  const w = word.toLowerCase()
  if (isSingleKnownWord(w)) return true

  const vowels = [...w].filter((c) => ALL_VOWELS.has(c))
  if (vowels.length === 0) return false
  if (/^[ğ]/.test(w)) return false
  if (/[bcdfghjklmnprstvyz]{4,}/i.test(w)) return false
  if (/[aeıioöuü]{3,}/i.test(w)) return false

  return true
}

/**
 * Kök ve ek arasındaki büyük ünlü uyumunu denetler
 */
export function checkVowelHarmony(stem: string, suffix: string): boolean {
  const stemVowels = [...stem.toLowerCase()].filter((c) => ALL_VOWELS.has(c))
  if (!stemVowels.length) return false
  const lastStemVowel = stemVowels[stemVowels.length - 1]
  const isStemKalin = KALIN_VOWELS.has(lastStemVowel)

  const sufVowels = [...suffix.toLowerCase()].filter((c) => ALL_VOWELS.has(c))
  if (!sufVowels.length) return true
  const firstSufVowel = sufVowels[0]
  const isSufKalin = KALIN_VOWELS.has(firstSufVowel)

  if (suffix.toLowerCase().endsWith('ken')) return true

  return isStemKalin === isSufKalin
}

/**
 * 2. KURAL: Zarf-Fiil ve Çekim Eki Sınır Tespiti (Heuristic Splitter)
 * Kelimenin ortasında zarf-fiil veya bitiş eki geçiyorsa ve ardından en az 4 harfli
 * anlamlı bir kelime başlıyorsa buradan ikiye böler.
 */
function splitByGerundAndEndings(word: string): [string, string] | null {
  const w = word.toLowerCase()
  if (w.length < 10) return null

  for (const rx of GERUND_SUFFIX_PATTERNS) {
    for (let splitIdx = 4; splitIdx <= w.length - 4; splitIdx++) {
      const leftCandidate = w.slice(0, splitIdx)
      const rightCandidate = w.slice(splitIdx)

      const m = leftCandidate.match(rx)
      if (m) {
        const stem = m[1]
        const suffix = m[2]

        const isGerund =
          /^(y?ıp|y?ip|y?up|y?üp|y?arak|y?erek|y?ınca|y?ince|y?unca|y?ünce|madan|meden|y?ken|dıkça|dikçe|dukça|dükçe|tıkça|tikçe|tukça|tükçe|dığında|diğinde|duğunda|düğünde|tığında|tiğinde|tuğunda|tüğünde|dığımızda|diğimizde|duğumuzda|düğümüzde|tığımızda|tiğimizde|dığınızda|diğinizde|duğunuzda|düğünüzde|tığınızda|tiğinizde|dıklarında|diklerinde|duklarında|düklerinde|tıklarında|tiklerinde)$/i.test(
            suffix,
          )

        if (isGerund) {
          const stemCore = stem.replace(/^(.*)(leş|laş|lendir|leşdir|tir|dır|dir|dur|dür|tır|tir|tur|tür)$/, '$1')
          if (!VERB_STEMS.has(stem) && !VERB_STEMS.has(stemCore) && stem.length <= 3) {
            continue
          }
        }

        const stemVowels = [...stem].filter((c) => ALL_VOWELS.has(c))
        if (stemVowels.length >= 1 && checkVowelHarmony(stem, suffix)) {
          const rightIsSuffixOnly =
            /^(mak|mek|ma|me|makta|mekte|maktan|mekten|lar|ler|dan|den|tan|ten|da|de|ta|te|a|e|ya|ye|ı|i|u|ü|ın|in|un|ün|ken|yken|miş|mış|muş|müş|tı|ti|tu|tü|dı|di|du|dü|dır|dir|tır|tir|ilmiş|ilmişti|ilmişler|ilen|ilmişlerdi|ilmek|ilmektedir)$/i.test(
              rightCandidate,
            )

          if (!rightIsSuffixOnly && rightCandidate.length >= 4 && isLikelyTurkishWord(rightCandidate)) {
            if (isLikelyTurkishWord(leftCandidate)) {
              return [word.slice(0, splitIdx), word.slice(splitIdx)]
            }
          }
        }
      }
    }
  }

  return null
}

/**
 * 3. KURAL: Büyük-Küçük Ünlü Uyumu Kırılması ve Sözlük Kontrolü (Word Segmentation)
 * 14+ harfli çok uzun kelimelerde ünlü uyumu sert bir şekilde kırılıyorsa hece sınırından böler.
 */
function splitByVowelHarmonyBreak(word: string): [string, string] | null {
  const w = word.toLowerCase()
  if (w.length < 14) return null

  if (/iyor|ken|ki|daş|taş|leyin|mtırak|gil/.test(w)) return null

  const vowels: Array<{ char: string; idx: number; isKalin: boolean }> = []
  for (let i = 0; i < w.length; i++) {
    if (ALL_VOWELS.has(w[i])) {
      vowels.push({ char: w[i], idx: i, isKalin: KALIN_VOWELS.has(w[i]) })
    }
  }

  if (vowels.length < 4) return null

  for (let v = 1; v < vowels.length; v++) {
    const vPrev = vowels[v - 1]
    const vCurr = vowels[v]

    if (vPrev.isKalin !== vCurr.isKalin) {
      const consonants = w.slice(vPrev.idx + 1, vCurr.idx)
      const splitCandidates: number[] = []

      if (consonants.length === 0) {
        splitCandidates.push(vCurr.idx)
      } else if (consonants.length === 1) {
        splitCandidates.push(vPrev.idx + 2)
        splitCandidates.push(vPrev.idx + 1)
      } else {
        for (let c = 1; c <= consonants.length; c++) {
          splitCandidates.push(vPrev.idx + 1 + c)
        }
      }

      for (const splitIdx of splitCandidates) {
        if (splitIdx >= 4 && splitIdx <= w.length - 4) {
          const left = word.slice(0, splitIdx)
          const right = word.slice(splitIdx)

          const leftVowels = [...left].filter((c) => ALL_VOWELS.has(c.toLowerCase()))
          const rightVowels = [...right].filter((c) => ALL_VOWELS.has(c.toLowerCase()))

          if (leftVowels.length >= 1 && rightVowels.length >= 1) {
            const rightIsSuffixOnly =
              /^(mak|mek|ma|me|makta|mekte|maktan|mekten|lar|ler|dan|den|tan|ten|da|de|ta|te|a|e|ya|ye|ı|i|u|ü|ın|in|un|ün|ken|yken|miş|mış|muş|müş|tı|ti|tu|tü|dı|di|du|dü|dır|dir|tır|tir|ilmiş|ilmişti|ilmişler|ilen|ilmişlerdi|ilmek|ilmektedir)$/i.test(
                right,
              )
            if (!rightIsSuffixOnly && isLikelyTurkishWord(left) && isLikelyTurkishWord(right)) {
              return [left, right]
            }
          }
        }
      }
    }
  }

  return null
}

/**
 * Tek bir token'ı yapışık kelime analizine tabi tutar ve gerekiyorsa parçalar
 */
export function splitGluedTurkishWord(token: string): string[] {
  if (!token || token.length < 10) return [token]

  // Baş ve son noktalama işaretlerini ayır
  const leadMatch = token.match(/^[^\wçğıöşüÇĞİÖŞÜ0-9]+/)
  const leadPunct = leadMatch ? leadMatch[0] : ''
  const trailMatch = token.match(/[^\wçğıöşüÇĞİÖŞÜ0-9]+$/)
  const trailPunct = trailMatch ? trailMatch[0] : ''

  const core = token.slice(leadPunct.length, token.length - trailPunct.length)
  // 1. KURAL: 10 karakterden kısa kelimelere dokunma
  if (core.length < 10) return [token]

  // Rakam, e-posta veya tire içeren kelimeleri koru
  if (/[\d\-]/.test(core)) return [token]

  // Zaten bilinen tekil bir kelime ise bölme
  if (isSingleKnownWord(core)) {
    return [token]
  }

  // 2. KURAL: Zarf-fiil ve çekim eki sınır tespiti
  let splitParts = splitByGerundAndEndings(core)

  // 3. KURAL: 14+ harfli kelimelerde Büyük Ünlü Uyumu kırılması
  if (!splitParts && core.length >= 14) {
    splitParts = splitByVowelHarmonyBreak(core)
  }

  if (splitParts) {
    const [w1, w2] = splitParts
    const restSplit = splitGluedTurkishWord(w2)
    return [`${leadPunct}${w1}`, ...restSplit.slice(0, -1), `${restSplit[restSplit.length - 1]}${trailPunct}`]
  }

  return [token]
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
