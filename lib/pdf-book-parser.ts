/**
 * Akıllı PDF, Kitap ve OCR Ayrıştırıcı (Smart PDF & Book Parser)
 *
 * HizliOku Pro Heuristics Engine:
 * 1. PDF.js metin parçalarını Y ve X koordinatlarına göre satırlara gruplar.
 * 2. Glifler arası boşlukları (kerning/gap) hesaplayarak kelime içi yapay boşlukları engeller.
 * 3. Üst simge dipnotları ([1], *, †) satır hizasında tespit eder ve gövde metninden ayrıştırır.
 * 4. Satır içi ve sayfa sınırlarındaki tireleme (-), koşullu tire (\u00AD), bozuk UTF-8 (\uFFFD)
 *    ve Türkçe ek kopmalarını (BROKEN_SUFFIX_SET) onarır (De-hyphenation).
 * 5. Sayfa başlarında/sonlarında tekrar eden üst/alt bilgi (running headers/footers, sayfa no) satırlarını eler.
 * 6. Künye (ISBN, sertifika no, yayınevi), içindekiler ve arka kaynakçayı otomatik sınıflandırıp atlar.
 * 7. Taranmış (resimli) PDF sayfaları için Tesseract OCR motoruna otomatik geçiş yapar.
 */

import {
  splitGluedText,
  isValidTurkishWord,
  toTurkishLower,
  turkishDictSet,
  TURKISH_SUFFIXES,
  ALL_VOWELS,
  BOUND_CONTINUATION_REGEX,
  NEVER_BOUND_SUFFIX_RIGHT,
} from './turkish-word-splitter'

export type ExtractedBook = {
  title: string
  text: string
  totalPages: number
  wordCount: number
  skippedPagesCount: number
  isOcrUsed: boolean
}

export type PdfLine = {
  text: string
  fontSize: number
  yRatio: number
  pageNumber: number
  isHeading?: boolean
}

export type ExtractedFootnote = {
  marker: string
  text: string
}

export type PreparedPage = {
  pageNumber: number
  lines: PdfLine[]
  bodyLines: PdfLine[]
  footnotes?: ExtractedFootnote[]
  isBoilerplate: boolean
  skipReason?: string
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁰': '0',
}

// Türkçe'de tek başına kelime olmayan, kerning/OCR hatasıyla kelimeden kopmuş ek parçaları
const BROKEN_SUFFIX_SET = new Set([
  // Şahıs, ek fiil ve zaman ekleri
  'iyorsunuz',
  'iyorum',
  'iyorsun',
  'iyoruz',
  'iyorlar',
  'ıyorsunuz',
  'ıyorum',
  'ıyorsun',
  'ıyoruz',
  'ıyorlar',
  'uyorsunuz',
  'uyorum',
  'uyorsun',
  'uyoruz',
  'uyorlar',
  'üyorsunuz',
  'üyorum',
  'üyorsun',
  'üyoruz',
  'üyorlar',
  'diyor',
  'diyordu',
  'diyormuş',
  'diyelim',
  'yordu',
  'yormuş',
  'yorduk',
  'yordun',
  'yordunuz',
  'cekti',
  'caktı',
  'cekler',
  'caklar',
  'ceksin',
  'caksın',
  'cektim',
  'caktım',
  'cektik',
  'caktık',
  'mişti',
  'mıştı',
  'muştu',
  'müştü',
  'miştir',
  'mıştır',
  'muştur',
  'müştür',
  'mişler',
  'mışlar',
  'muşlar',
  'müşler',
  'eceği',
  'acağı',
  'ecek',
  'acak',
  'ecektir',
  'acaktır',
  'eceğim',
  'acağım',
  'eceksin',
  'acaksın',
  'eceğiz',
  'acağız',
  'eceksiniz',
  'acaksınız',
  'ecekler',
  'acaklar',
  'acağımız',
  'eceğimiz',
  'ebilir',
  'abilir',
  'ebilirdi',
  'abilirdi',
  'ebilirsin',
  'abilirsin',
  'ebilirse',
  'abilirse',
  'ebilecek',
  'abilecek',
  'ebileceği',
  'abileceği',
  'ebilmek',
  'abilmek',
  'irsin',
  'ırsın',
  'ursun',
  'ürsün',
  'ilirsin',
  'ılırsın',
  'ulursun',
  'ülürsün',
  'siniz',
  'sınız',
  'sunuz',
  'sünüz',
  'ışacağım',
  'işeceğim',
  'ışmış',
  'işmiş',
  'uşmuş',
  'üşmüş',
  'iştirmiş',
  'ıştırmış',
  'uşturmuş',
  'üştürmüş',
  'lmamış',
  'lmemiş',
  'lmış',
  'lmiş',
  'lmuş',
  'lmüş',
  'kmayı',
  'kmeyi',
  'kması',
  'kmesi',
  'kmak',
  'kmek',
  // Hal, aitlik, çoğul ve bağlaç ekleri
  'ndaki',
  'ndeki',
  'ndakiler',
  'ndekiler',
  'ndeydi',
  'ndaydı',
  'ndeymiş',
  'ndaymış',
  'ndadır',
  'ndedir',
  'ndakine',
  'ndekine',
  'ndığında',
  'ndiğinde',
  'nduğunda',
  'ndüğünde',
  'yle',
  'yla',
  'yleydi',
  'ylaydı',
  'daki',
  'deki',
  'takı',
  'teki',
  'ller',
  'llar',
  'lleri',
  'lları',
  'nları',
  'nleri',
  'nların',
  'nlerin',
  'nlarına',
  'nlerine',
  'nlarında',
  'nlerinde',
  'nlarından',
  'nlerinden',
  'ları',
  'leri',
  'ların',
  'lerin',
  'larına',
  'lerine',
  'larında',
  'lerinde',
  'larından',
  'lerinden',
  'vlar',
  'vler',
  'vları',
  'vleri',
  'larını',
  'lerini',
  'lerinin',
  'lerinin',
  'sında',
  'sinde',
  'sından',
  'sinden',
  'sına',
  'sine',
  'sını',
  'sini',
  'sının',
  'sinin',
  'sı',
  'si',
  'sü',
  'lir',
  'lirim',
  'lirsin',
  'liriz',
  'lirler',
  'lirdi',
  'lığı',
  'liği',
  'luğu',
  'lüğü',
  'lığım',
  'liğim',
  'lığın',
  'liğin',
  'lığına',
  'liğine',
  'lığında',
  'liğinde',
  'lığından',
  'liğinden',
  'luğundan',
  'lüğünden',
  'luğunu',
  'lüğünü',
  'lıkları',
  'likleri',
  'lukları',
  'lükleri',
  'ığı',
  'iği',
  'uğu',
  'üğü',
  'ığım',
  'uğum',
  'üğüm',
  'ığın',
  'iğin',
  'uğun',
  'üğün',
  'ığını',
  'iğini',
  'uğunu',
  'üğünü',
  'ğım',
  'ğim',
  'ğum',
  'ğüm',
  'ğın',
  'ğin',
  'ğun',
  'ğün',
  'ğı',
  'ği',
  'ğu',
  'ğü',
  'ğını',
  'ğini',
  'ğunu',
  'ğünü',
  'ğımız',
  'ğimiz',
  'ğumuz',
  'ğümüz',
  'ım',
  'im',
  'um',
  'üm',
  'ımız',
  'imiz',
  'umuz',
  'ümüz',
  'ımızın',
  'imizin',
  'umuzun',
  'ümüzün',
  'ımıza',
  'imize',
  'umuza',
  'ümüze',
  'ımızda',
  'imizde',
  'umuzda',
  'ümüzde',
  'ımızdan',
  'imizden',
  'umuzdan',
  'ümüzden',
  'ımızı',
  'imizi',
  'umuzu',
  'ümüzü',
  'ıyız',
  'iyiz',
  'uyuz',
  'üyüz',
  'ırım',
  'irim',
  'urum',
  'ürüm',
  'ında',
  'inde',
  'unda',
  'ünde',
  'undan',
  'ünden',
  'ından',
  'inden',
  'ına',
  'ine',
  'una',
  'üne',
  'ını',
  'ini',
  'unu',
  'ünü',
  'ının',
  'inin',
  'unun',
  'ünün',
  'ıyla',
  'iyle',
  'uyla',
  'üyle',
  'ıkları',
  'ikleri',
  'ukları',
  'ükleri',
  'kları',
  'kleri',
  'mdan',
  'mden',
  'ndan',
  'nden',
  'dan',
  'den',
  'tan',
  'ten',
  'madan',
  'meden',
  'meksizin',
  'maksızın',
  'yken',
  'ken',
  'ip',
  'ıp',
  'up',
  'üp',
  'yip',
  'yıp',
  'yup',
  'yüp',
  'yerek',
  'yarak',
  'meyip',
  'mayıp',
  'meyerek',
  'mayarak',
  'meye',
  'maya',
  'meyi',
  'mayı',
  'mek',
  'mak',
  'mekte',
  'makta',
  'mekten',
  'maktan',
  'mişken',
  'mışken',
  'ız',
  'üz',
  'diğinde',
  'dığında',
  'duğunda',
  'düğünde',
  'diğinden',
  'dığından',
  'duğundan',
  'düğünden',
  'diğine',
  'dığına',
  'duğuna',
  'düğüne',
  'diğini',
  'dığını',
  'duğunu',
  'düğünü',
  'diğimiz',
  'dığımız',
  'duğumuz',
  'düğümüz',
  'diğiniz',
  'dığınız',
  'duğunuz',
  'düğünüz',
  'dikleri',
  'dıkları',
  'dukları',
  'dükleri',
  'füsleri',
  'füsü',
  'füse',
  'lerini',
  'lerinin',
  'lerinde',
  'lerinden',
  'larına',
  'larında',
  'larından',
  'rebileceği',
  'rebilecek',
  'rebilir',
  'rebilirdi',
  'ri',
  'si',
  'sine',
  'sinde',
  'sinden',
  'linçli',
  'pabilir',
  'racağı',
  'şımıza',
  'nna',
  'nyla',
])

// Standalone Turkish function words, short nouns, verbs, pronouns and adverbs
// These words MUST NOT be merged into a continuation word across lines
export const VALID_STANDALONE_TURKISH_WORDS = new Set<string>([
  've', 'de', 'da', 'bu', 'şu', 'o', 'ne', 'en', 'az', 'çok', 'bir', 'her', 'hiç',
  'iyi', 'yol', 'su', 'gün', 'yıl', 'ay', 'ak', 'ev', 'el', 'et', 'ek', 'ot', 'ok',
  'un', 'uç', 'ye', 'ya', 'ha', 'ah', 'ey', 'oy', 'öz', 'ön', 'iç', 'ip', 'iş', 'iz',
  'il', 'in', 'aç', 'at', 'av', 'al', 'an', 'as', 'ad', 'aş', 'var', 'yok', 'son', 'ilk',
  'ben', 'sen', 'biz', 'siz', 'kim', 'tek', 'zor', 'dar', 'boş', 'sağ', 'sol', 'üst', 'alt',
  'geç', 'ara', 'art', 'dün', 'ses', 'söz', 'göz', 'yüz', 'baş', 'yer', 'kan', 'can', 'hak',
  'hal', 'düş', 'göl', 'dağ', 'taş', 'kış', 'yaz', 'kar', 'zar', 'kol', 'pul', 'çöp', 'çam',
  'bal', 'bel', 'böl', 'bük', 'çal', 'çek', 'çık', 'çiz', 'çöz', 'del', 'dik', 'diz', 'doy',
  'dök', 'dön', 'dur', 'duy', 'gel', 'git', 'gör', 'gül', 'kaç', 'kal', 'kes', 'kır', 'kız',
  'koş', 'koy', 'öl', 'öv', 'sat', 'sev', 'seç', 'sil', 'sor', 'soy', 'sun', 'sür', 'tut',
  'ver', 'vur', 'yap', 'yat', 'yık', 'yit', 'yut', 'yürü', 'biri', 'kimi', 'bunu', 'şunu',
  'onun', 'buna', 'şuna', 'ona', 'yani', 'gibi', 'için', 'kadar', 'sonra', 'önce', 'göre',
  'karşı', 'doğru', 'üzere', 'ancak', 'fakat', 'çünkü', 'belki', 'zaten', 'bile', 'daha',
  'nasıl', 'neden', 'nerede', 'şimdi', 'böyle', 'şöyle', 'öyle', 'kendi', 'artık', 'hemen',
  'bazen', 'asla', 'yine', 'hala', 'hâlâ', 'elbette', 'tabii', 'ayrıca', 'nereden', 'burada',
  'orada', 'şurada', 'hepsi', 'bütün', 'hep', 'pek', 'tam', 'biraz', 'biriyle',
  'biriydi', 'birisi', 'birkaç', 'birçok', 'birtakım', 'başka', 'diğer', 'öteki', 'hangisi',
  'neresi', 'kimse', 'şey', 'şeyler', 'şeyleri', 'şeylerin', 'şeyde', 'şeyden'
])

// Non-word continuation fragments that CANNOT be standalone Turkish words
export const NON_STANDALONE_WORD_B_PATTERNS: RegExp[] = [
  /^(sabasındaki|zelce|ranan|bekken|zünü|nunu|rinin|lediği|bette|füsleri|ginlik|larken)/i,
  /^(ndan|nden|nda|nde|na|nı|ni|nın|nin|nun|nün|nu|nü)$/i,
  /^(sından|sinden|sında|sinde|sına|sine|sını|sini|sının|sinin|sunun|sünün|sunu|sünü)$/i,
  /^(larıyla|leriyle|larında|lerinde|larından|lerinden|larına|lerine|larını|lerini|larının|lerinin)$/i,
  /^(lık|lik|luk|lük|lığa|liğe|luğa|lüğe|lığı|liği|luğu|lüğü|lığın|liğin|luğun|lüğün)$/i,
  /^(mış|miş|muş|müş|mıştı|mişti|muştu|müştü|mışsa|mişse|muşsa|müşse|dığı|diği|duğu|düğü|dığında|diğinde|duğunda|düğünde)$/i,
  /^(ırken|irken|urken|ürken|arken|erken)$/i,
  /^(arak|erek|yarak|yerek|ıp|ip|up|üp|yıp|yip|yup|yüp|ınca|ince|unca|ünce|yınca|yince|yunca|yünce)$/i,
  /^(acak|ecek|acaktı|ecekti|acağımı|eceğimi|acağını|eceğini|acağımız|eceğimiz|acaklar|ecekler)$/i,
  /^(abil|ebil|abilir|ebilir|abilirdi|ebilirdi|abiliyor|ebiliyor|amaz|emez|amazdı|emezdi)$/i,
  /^(laş|leş|laştır|leştir|laştırma|leştirme|lan|len|landır|lendir|landırma|lendirme)$/i,
  /^(mekten|maktan|meye|maya|meyi|mayı|menin|manın|mek|mak)$/i,
  /^(dir|dır|dur|dür|tir|tır|tur|tür|dirler|dırlar|durlar|dürler|tirler|tırlar|turlar|türler)$/i,
  /^(daki|deki|taki|teki)$/i,
  /^(sel|sal|cil|cıl|cul|cül)$/i,
]

// Non-word Turkish syllables / prefix fragments resulting from soft-hyphen drops
export const KNOWN_SPLIT_PREFIXES = new Set<string>([
  'ka', 'ba', 'gü', 'dav', 'sö', 'bur', 'söy', 'el', 'parmağıy', 'rağ', 'ça', 'ger',
  'tenef', 'uygar', 'müm', 'ola', 'öğ', 'bü', 'kü', 'sol', 'yaş',
  'ko', 'dü', 'or', 'fa', 'me', 'ge', 'te', 'se', 'he', 'de', 'be', 'ke', 'le', 're',
  've', 'ne', 'ze', 'pe', 'şe', 'çe', 'bo', 'to', 'do', 'go', 'mo', 'no', 'ro',
  'so', 'zo', 'lo', 'po', 'yo', 'ku', 'tu', 'du', 'gu', 'mu', 'nu', 'ru', 'zu',
  'lu', 'pu', 'yu', 'bı', 'tı', 'dı', 'gı', 'mı', 'nı', 'rı', 'sı', 'zı', 'lı', 'pı',
  'kı', 'yı', 'fı', 'hı', 'cı', 'çı', 'ca', 'ma', 'na', 'pa', 'sa', 'ta', 'va',
  'za', 'la', 'büş', 'düş', 'kork', 'sak', 'sakla', 'bek', 'bekle',
  'düşün', 'bil', 'sev', 'anla', 'iste', 'konu', 'din', 'hatır',
  'yaşa', 'yara', 'duy', 'fark', 'his', 'kay', 'çev', 'yük', 'düzen', 'kapa', 'açı',
  'ölüm', 'kitap', 'sayfa', 'kütüp'
])

const TITLE_CASE_STOPWORDS = new Set([
  've',
  'ile',
  'de',
  'da',
  'ki',
  'bir',
  'için',
  'dair',
  'üzerine',
  'ya',
  'veya',
  'en',
  'bu',
  'o',
  'ne',
  'mı',
  'mi',
  'mu',
  'mü',
  'and',
  'or',
  'of',
  'the',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'by',
])

// PDF.js kütüphanesini tarayıcıda dinamik yükle (Next.js SSR uyumlu)
export async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return null
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(pdfjs)
      } else {
        reject(new Error('PDF.js yüklenemedi.'))
      }
    }
    script.onerror = () => reject(new Error('PDF.js kütüphanesine erişilemedi.'))
    document.head.appendChild(script)
  })
}

// Tesseract.js kütüphanesini tarayıcıda dinamik yükle
export async function loadTesseract(): Promise<any> {
  if (typeof window === 'undefined') return null
  if ((window as any).Tesseract) return (window as any).Tesseract

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    script.async = true
    script.onload = () => {
      const tesseract = (window as any).Tesseract
      if (tesseract) resolve(tesseract)
      else reject(new Error('Tesseract.js yüklenemedi.'))
    }
    script.onerror = () => reject(new Error('Tesseract.js OCR motoruna erişilemedi.'))
    document.head.appendChild(script)
  })
}

/**
 * Harfleri ayrı yazılmış başlıkları ("Ö n s ö z" -> "Önsöz", "PR OB LEME" -> "PROBLEME") birleştirir
 */
export function collapseSpacedLetters(str: string): string {
  if (!str) return ''
  let s = str
  s = s.replace(
    /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])([a-zA-ZçğıöşüÇĞİÖŞÜ])\s+([a-zA-ZçğıöşüÇĞİÖŞÜ])\s+([a-zA-ZçğıöşüÇĞİÖŞÜ])(?:\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]))?(?:\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]))?(?:\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]))?(?:\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]))?(?:\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]))?(?:\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]))?(?:\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]))?(?:\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]))?(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/g,
    (_, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11) =>
      [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11].filter(Boolean).join(''),
  )
  s = s.replace(/\bPR\s+OB\s+LEME\b/g, 'PROBLEME')
  s = s.replace(/\bB\s+İÇME\b/g, 'BİÇME')
  s = s.replace(/\bİÇİNDEKİ\s+LER\b/g, 'İÇİNDEKİLER')
  s = s.replace(/\bon\s+u\b/g, 'onu')
  s = s.replace(/\bya\s+pa\s+nın\b/g, 'yapanın')
  s = s.replace(/(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])n\s+a\s*sıl\s*a(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/gi, 'nasıla')
  return s
}

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
}

/**
 * PDF metninde boşlukla ayrılmış bileşik kelime tirelerini (örn. "sosyo - politik", "queen - in - waiting", "piyon - vezir")
 * standart birleşik kelime formatına ("sosyo-politik", "queen-in-waiting", "piyon-vezir") normalize eder.
 */
export function normalizeCompoundWordHyphens(text: string): string {
  if (!text) return ''
  let prev = ''
  let curr = text
  while (prev !== curr) {
    prev = curr
    curr = curr
      .replace(/(?<!\d)([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+)\s+[-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s+([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+)(?!\d)/g, '$1-$2')
      .replace(/(?<!\d)([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+)[-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s+([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+)(?!\d)/g, '$1-$2')
      .replace(/(?<!\d)([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+)\s+[-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+)(?!\d)/g, '$1-$2')
  }
  return curr
}

/**
 * LaTeX matematiksel sembol ve bloklarını doğal metne çevirir,
 * metin içine dağılmış anlamsız ASCII kutu ve şema çizgilerini ayıklar.
 */
export function cleanLatexAndDiagrams(text: string): string {
  if (!text) return ''
  let t = text

  // 1. LaTeX ok ve formül sembollerini okunabilir Unicode karakterlere çevir
  t = t.replace(/\\+\s*(?:longrightarrow|rightarrow|to)\b/gi, ' → ')
  t = t.replace(/\\+\s*(?:longleftarrow|leftarrow)\b/gi, ' ← ')
  t = t.replace(/\\+\s*(?:iff|Leftrightarrow)\b/gi, ' ↔ ')
  t = t.replace(/\\+\s*(?:implies|Rightarrow)\b/gi, ' ⇒ ')
  t = t.replace(/\\+\s*(?:cdot)\b/gi, ' · ')
  t = t.replace(/\\+\s*(?:times)\b/gi, ' × ')
  t = t.replace(/\\+\s*(?:approx|sim)\b/gi, ' ≈ ')
  t = t.replace(/\\+\s*(?:neq?)\b/gi, ' ≠ ')
  t = t.replace(/\\+\s*(?:leq?)\b/gi, ' ≤ ')
  t = t.replace(/\\+\s*(?:geq?)\b/gi, ' ≥ ')
  t = t.replace(/\\+\s*(?:pm)\b/gi, ' ± ')
  t = t.replace(/──>/g, ' → ')
  t = t.replace(/-->/g, ' → ')

  // 2. LaTeX \text{...}, \textbf{...}, \textit{...}, \mathrm{...} etiketlerinin açılması (multi-pass)
  for (let pass = 0; pass < 3; pass++) {
    t = t.replace(/\\+\s*(?:te?x[\s\r\n]*t(?:bf|it|rm|sc|sf)?|mathrm|mathbf|mathit)\s*\{([^}]+)\}/gi, '$1')
  }

  // 3. Matematik blok ve satır içi ayraçları ($$, $)
  t = t.replace(/\$\$/g, ' ')
  t = t.replace(/(^|\s)\$([^$\n]+)\$(\s|$)/g, '$1$2$3')
  t = t.replace(/\$/g, '')

  // 4. Şema / Diyagram çerçeve çizgilerinin ayıklanması
  const lines = t.split('\n')
  const cleanedLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      cleanedLines.push('')
      continue
    }
    // Yalnızca diyagram çerçevesi, ok ve çizgilerden oluşan satırları atla
    if (/^[│┌└┴┬├┤─▼▲═║╔╗╚╝\-\–\—\|\>\<\s\.\:\+]+$/.test(trimmed) && !/[a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/.test(trimmed)) {
      continue
    }
    // Satır başındaki/sonundaki izole kutu çizgilerini temizle
    const cleanedLine = trimmed
      .replace(/^[│║|┌└┴┬├┤─▼▲\s]+/, '')
      .replace(/[│║|┌└┴┬├┤─▼▲\s]+$/, '')
    if (cleanedLine) {
      cleanedLines.push(cleanedLine)
    }
  }

  return cleanedLines.join('\n')
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

  // 1. Noktalama işaretlerinden sonra boşluk unutulmuşsa ayır (örn. 3.14 ve 12,5 rakamlarını bozmadan):
  t = t.replace(/([.,!?;:])([a-zA-ZÇĞİÖŞÜçğıöşü])/g, '$1 $2')

  // 2. Küçük harften hemen sonra büyük harf geliyorsa ayır:
  t = t.replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2')

  // URL ve e-postaları geri yükle
  t = t.replace(/___URL_(\d+)___/g, (_, idx) => urls[Number(idx)])

  return t
}

/**
 * Satır içindeki görünmez koşullu tireleri (\u00AD), bozuk PDF tire karakterlerini (\uFFFD),
 * orta noktaları (·, •), kerning boşluklarını ve OCR hatalarını onarır.
 */
export function cleanIntraLineHyphens(rawLineText: string): string {
  if (!rawLineText) return ''
  let t = rawLineText

  // 1. Harfleri ayrı yazılmış kelimeleri birleştir
  t = collapseSpacedLetters(t)

  // 2. Türkçe OCR büyük harf DEÖER onarımı (DEÖERLENDİRME -> DEĞERLENDİRME)
  t = t.replace(/\bDEÖER/g, 'DEĞER')
  t = t.replace(/\bdeöer/g, 'değer')

  // 3. Kelime içindeki orta nokta ve simgeleri birleştir (değ·er -> değer, bağ·lantı -> bağlantı)
  t = t.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])[·•\*\^~]([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, '$1$2')

  // 4. Nokta ile bölünmüş satır içi kelimeleri birleştir (sonun· da -> sonunda, so· racağı -> soracağı, değerlendir· meleri -> değerlendirmeleri)
  t = t.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})[·•]\s+([a-zçğıöşü]{1,15})/g, '$1$2')

  // 5. Bileşik noktalama ile bölünmüş kelimeleri birleştir (kendisi-· ne -> kendisine, kar- ' şımıza -> karşımıza)
  t = t.replace(
    /([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})[-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~][\s]*[·•\'’][\s·•\'’]*([a-zçğıöşü]{1,15})/g,
    '$1$2',
  )

  // 6. Satır içi tire + boşluk: sağdaki kelime bir ek parçası ise birleştir (ya- pabilir -> yapabilir), değilse tire koru
  t = t.replace(
    /([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})[-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s+([a-zçğıöşü]{1,15})/g,
    (full, left, right) => {
      if (BROKEN_SUFFIX_SET.has(right.toLowerCase())) {
        return left + right
      }
      return `${left}-${right}`
    },
  )

  // 7. Kelime ortasındaki görünmez soft-hyphen (\u00AD) birleştir
  t = t.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])\u00AD+\s*([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, '$1$2')

  // 8. Kelime ortasındaki PDF/OCR tire değişim karakterini (\uFFFD) analiz et
  t = t.replace(
    /([a-zA-ZçğıöşüÇĞİÖŞÜ]+)\uFFFD+\s*([a-zA-ZçğıöşüÇĞİÖŞÜ]+)/g,
    (fullMatch, leftPart, rightPart, offset, fullStr) => {
      const beforeSlice = fullStr.slice(0, offset)
      const hasOpenParentheticalDash = /(?:^|\s)[\-\–\—][a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(beforeSlice)
      const isLowerToUpper = /[a-zçğıöşü]$/.test(leftPart) && /^[A-ZÇĞİÖŞÜ]/.test(rightPart)
      if (hasOpenParentheticalDash || isLowerToUpper) {
        return `${leftPart}– ${rightPart}`
      }
      return `${leftPart}${rightPart}`
    },
  )

  // 9. Satır sonunda harf ile tire arasına girmiş boşluğu kaldır
  t = t.replace(
    /([a-zA-ZçğıöşüÇĞİÖŞÜ0-9])\s+([\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~'’‘\`]+)\s*$/,
    '$1$2',
  )

  // 10. Noktalama işaretinden sonra kalan yalnız \uFFFD karakterlerini temizle
  t = t.replace(/([^\wçğıöşüÇĞİÖŞÜ])\uFFFD+(?=\s|$)/g, '$1')

  // 11. Kesme işareti etrafındaki boşlukları birleştir ("Türkiye ’ nin" -> "Türkiye’nin")
  t = t.replace(
    /([a-zA-ZçğıöşüÇĞİÖŞÜ0-9])\s+(['’‘])\s*([a-zçğıöşü]{1,8})(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/g,
    '$1$2$3',
  )

  // 12. Font kerning hatasıyla kopmuş tek harfli Türkçe ekleri birleştir ("insanları n" -> "insanların", "ilerlett i" -> "ilerletti")
  t = t.replace(
    /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zçğıöşü]{2,20})\s+([iıuümnd](?:['’‘][a-zçğıöşü]{1,8})?)(?=[,.;:!?'”"\)\s]|$)/g,
    '$1$2',
  )

  // 13. BROKEN_SUFFIX_SET yardımıyla kelimeden kopmuş Türkçe ek parçalarını birleştir (noktalamayı koruyarak)
  t = t.replace(
    /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zçğıöşü]{1,25})\s+([a-zçğıöşü]{2,14})([,.;:!?\"\'’»\)]*)(?=\s|$)/g,
    (full, stem, suffix, punct) => {
      if (BROKEN_SUFFIX_SET.has(suffix.toLowerCase())) {
        return stem + suffix + (punct || '')
      }
      return full
    },
  )

  // Özel kerning ayrılmalarını onar
  t = t.replace(/\bnorm\s+al\b/g, 'normal')
  t = t.replace(/\bSoğ\s+uktan\b/g, 'Soğuktan')
  t = t.replace(/\bsoğ\s+uktan\b/g, 'soğuktan')
  t = t.replace(/\bzar\s+if\b/g, 'zarif')
  t = t.replace(/\bson\s+raki\b/g, 'sonraki')
  t = t.replace(/\bSına\s+vlar\b/g, 'Sınavlar')
  t = t.replace(/\bsına\s+vlar\b/g, 'sınavlar')
  t = t.replace(/\bısm\s+arladığı\b/g, 'ısmarladığı')
  t = t.replace(/\bseçme\s+yip\b/g, 'seçmeyip')
  t = t.replace(/\bkasabası\s+ndaki\b/g, 'kasabasındaki')

  // 14. Kelime içine karışmış noktalama, taksim (/), çift noktalı virgül (;;) ve iki nokta (:) OCR bozulmalarını onar
  // (cleanPunctuationAndCamelCase adımından ÖNCE çalıştırılmalıdır ki kelimenin ortasındaki noktadan sonra boşluk eklenmesin!)
  t = t.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])\/,\s*([a-zçğıöşü]+)/g, '$1l$2')
  t = t.replace(/\bdolaştırdık\/an\b/g, 'dolaştırdıkları')
  t = t.replace(/\bsürebiliyor\/ardı\b/g, 'sürebiliyorlardı')
  t = t.replace(/\bdin\/en([a-zçğıöşü]*)\b/g, 'dinlen$1')
  t = t.replace(/\bi,\s*çim([a-zçğıöşü]*)\b/g, 'içim$1')
  t = t.replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}),\s*(si|sı|sü|su|nin|nın|den|dan)\b/g, '$1$2')
  t = t.replace(/\bFak\.at\b/g, 'Fakat')
  t = t.replace(/\bfak\.at\b/g, 'fakat')
  t = t.replace(/\bİm\.kansız([a-zçğıöşü]*)\b/g, 'İmkansız$1')
  t = t.replace(
    /\b([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})\.(tan|ten|dan|den|lar|ler|lık|lik|sı|si|ası|esi)\b/g,
    '$1$2',
  )
  t = t.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ]);;([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, '$1ş$2')
  t = t.replace(/arkadaı;;ına/g, 'arkadaşına').replace(/ba;;/g, 'baş').replace(/Ba;;/g, 'Baş')
  t = t.replace(/\bt:opra([a-zçğıöşü]+)\b/g, 'topra$1')
  t = t.replace(/Fengx:ia/g, 'Fengxia').replace(/Fengxi\.a/g, 'Fengxia').replace(/gx:ia/g, 'gxia')
  t = t.replace(/Erx:i/g, 'Erxi').replace(/x:i/g, 'xi')
  t = t.replace(/You4iııg/g, 'Youqing').replace(/ChW1Sheng/g, 'Chunsheng')
  t = t.replace(/hı!nüz/g, 'henüz').replace(/hı!/g, 'he').replace(/m1'ımrn/g, 'mırıldan')
  t = t.replace(/muswı/g, 'musun').replace(/swı/g, 'sun')

  // 15. Şapkalı harf ve '1' -> "'l" OCR bozulmalarını onar ("hfila" -> "hâlâ", "dükkfuı" -> "dükkân", "fen1ik" -> "fen'lik")
  t = t.replace(/\bhfila\b/g, 'hâlâ')
  t = t.replace(/\bHfila\b/g, 'Hâlâ')
  t = t.replace(/dükkfuı([a-zçğıöşü]*)/g, 'dükkân$1')
  t = t.replace(/\bU1usal\b/g, 'Ulusal')
  t = t.replace(/\bzan1an([a-zçğıöşü]*)\b/g, 'zaman$1')
  t = t.replace(/\bmahlı1k([a-zçğıöşü]*)\b/g, 'mahluk$1')
  t = t.replace(/\bbeş\s*fen1ik/g, "beş fen'lik")
  t = t.replace(/\bfen1ik/g, "fen'lik")
  t = t.replace(
    /\b(Jiazhen|Başkan|Kugen|Wangxi|Wangsı|Fengxia|Youqing|Chunsheng|Erxi|Fugui|Long'er)1(a|e|da|de|dan|den|in|ın|un|ün)\b/g,
    "$1'l$2",
  )
  t = t.replace(/\bXu1er([a-zçğıöşü]*)\b/g, "Xu'ler$1")
  t = t.replace(/\bdazibao1ar([a-zçğıöşü]*)\b/g, "dazibao'lar$1")

  // 16. Türkçe OCR "rı"/"rn"/"rm" -> "n"/"m" ligatür bozulmalarını onar
  t = t.replace(/Kamı bumunda/g, 'Karnı burnunda').replace(/kamı bumunda/g, 'karnı burnunda')
  t = t.replace(/\bbumun(da|dan|a|u)\b/g, 'burnun$1')
  t = t.replace(/\bkamım([a-zçğıöşü]*)\b/g, 'karnım$1')
  t = t.replace(/\bKamım([a-zçğıöşü]*)\b/g, 'Karnım$1')
  t = t.replace(/\bkamı\s+tok\b/g, 'karnı tok')
  t = t.replace(/\bsırzğ([a-zçğıöşü]+)\b/g, 'sırığ$1')
  t = t.replace(/\bökeyle\b/g, 'öfkeyle')
  t = t.replace(/\bÖkeyle\b/g, 'Öfkeyle')
  t = t.replace(/\bsoma\b/g, 'sonra')
  t = t.replace(/\bSoma\b/g, 'Sonra')
  t = t.replace(/\bdoğnı([a-zçğıöşü]*)\b/g, 'doğru$1')
  t = t.replace(/\bDoğnı([a-zçğıöşü]*)\b/g, 'Doğru$1')
  t = t.replace(/\bdışan(da|dan|ya|dakiler)?\b/g, (_, s) => `dışarı${s || ''}`)
  t = t.replace(/\bDışan(da|dan|ya|dakiler)?\b/g, (_, s) => `Dışarı${s || ''}`)
  t = t.replace(/\byukan(da|dan|ya)?\b/g, (_, s) => `yukarı${s || ''}`)
  t = t.replace(/\bYukan(da|dan|ya)?\b/g, (_, s) => `Yukarı${s || ''}`)
  t = t.replace(/\bTann('?[a-zçğıöşü]*)\b/g, 'Tanrı$1')
  t = t.replace(
    /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zçğıöşü]{1,})lann(da|dan|ı|a|ın|mız|nız|daki|dakiler)?(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/g,
    (_, stem, tail) => `${stem}ların${tail || ''}`,
  )
  t = t.replace(
    /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zçğıöşü]{1,})lan(nda|ndan|nı|na|nın|nm|mız|nız)(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/g,
    (_, stem, tail) => `${stem}ları${tail === 'nm' ? 'nın' : tail}`,
  )
  t = t.replace(
    /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zçğıöşü]{1,})lanm(da|dan|ı|a|ın)?(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/g,
    (_, stem, tail) => `${stem}larım${tail || ''}`,
  )
  t = t.replace(
    /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zçğıöşü]{1,})klan(yla|ndan|nda|na|nı|nın)?(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/g,
    (_, stem, tail) => `${stem}kları${tail || ''}`,
  )
  t = t.replace(
    /\b(bacak|ot|dal|kabuk|şarkı|yol|dudak|toprak|tarla|ışın|omuz|yaprak|ata|toz|para|yankı|ağaç|ayak|kol|kulak|parmak|saç|kaş|göz|diş|baş|taş|kuş|kız|çocuk|kadın|adam|insan|hayvan|köylü|komşu|arkadaş|evlat|oğul|kardeş|kapı|duvar|cam|ışık|yıldız|bulut|dalga|damla|çizgi|yazı|sayı|an|on|bun|şun|başka)lan\b/gi,
    (_, p1) => (p1.toLowerCase() === 'an' ? 'onları' : `${p1}ları`),
  )
  t = t.replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})np\b/g, (full, stem) =>
    full.toLowerCase().includes('kayınpeder') ? full : `${stem}rıp`,
  )
  t = t.replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})nya\b/g, (full, stem) =>
    full.toLowerCase().includes('dünya') ? full : `${stem}rıya`,
  )
  t = t.replace(/\bkenan(nda|ndan|na|nı|nın)?\b/g, (_, s) => `kenarı${s || ''}`)
  t = t.replace(/\bihtiyann\b/g, 'ihtiyarın')
  t = t.replace(/\bazannı\b/g, 'azarını')
  t = t.replace(/\bkannca([a-zçğıöşü]*)\b/g, 'karınca$1')
  t = t.replace(/\bbağınş([a-zçğıöşü]*)\b/g, 'bağırış$1')
  t = t.replace(/\bısınk([a-zçğıöşü]*)\b/g, 'ısırık$1')
  t = t.replace(/\bsıynl([a-zçğıöşü]*)\b/g, 'sıyrıl$1')
  t = t.replace(/\bkınl([a-zçğıöşü]*)\b/g, 'kırıl$1')
  t = t.replace(/\bsanl(dı|mış|ıp|arak)\b/g, 'sarıl$1')
  t = t.replace(/\bvenniş([a-zçğıöşü]*)\b/g, 'vermiş$1')
  t = t.replace(/\bvannış([a-zçğıöşü]*)\b/g, 'varmış$1')
  t = t.replace(/\bginne([a-zçğıöşü]*)\b/g, 'girme$1')
  t = t.replace(/\bdeğiştinniş([a-zçğıöşü]*)\b/g, 'değiştirmiş$1')
  t = t.replace(/\bsannış([a-zçğıöşü]*)\b/g, 'sarmış$1')
  t = t.replace(/\bpannak([a-zçğıöşü]*)\b/g, 'parmak$1')
  t = t.replace(/\bkıpkınnızı\b/g, 'kıpkırmızı')
  t = t.replace(/([a-zçğıöşü]{2,})nınm\b/g, '$1nırım')
  t = t.replace(/([a-zçğıöşü]{2,})tınnm\b/g, '$1tırırım')
  t = t.replace(/([a-zçğıöşü]{2,})dnn\b/g, '$1dım')

  // 17. Tek harfli ve kelime içi kerning kopmalarını sözlük doğrulamasıyla birleştir ("B undan" -> "Bundan", "Tırnağı yla" -> "Tırnağıyla", "hatırlaya maz" -> "hatırlayamaz")
  t = t.replace(/\b([BCÇDFGĞHJKLMNPRSŞTVYZWhy])\s+([a-zçğıöşü]{2,})\b/g, (full, c1, rest) =>
    isValidTurkishWord(c1 + rest) ? c1 + rest : full,
  )
  t = t.replace(/\bÜ\s+zeri([a-zçğıöşü]+)\b/g, 'Üzeri$1')
  t = t.replace(/\bkuvv\s+etli\b/g, 'kuvvetli')

  // Satır içi kopmuş kelimeleri sözlük doğrulamasıyla birleştir
  const lineTokens = t.split(/\s+/).filter(Boolean)
  if (lineTokens.length >= 2) {
    const mergedTokens: string[] = [lineTokens[0]]
    for (let idx = 1; idx < lineTokens.length; idx++) {
      const curr = lineTokens[idx]
      const prev = mergedTokens[mergedTokens.length - 1]
      const currCore = curr.replace(/[^\wçğıöşüÇĞİÖŞÜ]+$/, '')
      if (/[a-zA-ZçğıöşüÇĞİÖŞÜ]$/.test(prev) && /^[a-zçğıöşü]{2,}$/.test(currCore)) {
        const prevCore = toTurkishLower(prev.replace(/^[^\wçğıöşüÇĞİÖŞÜ]+/, ''))
        const nextCore = toTurkishLower(currCore)
        const comb = prevCore + nextCore
        if (
          !NEVER_BOUND_SUFFIX_RIGHT.has(nextCore) &&
          ((!isValidTurkishWord(prevCore) || !isValidTurkishWord(nextCore)) && isValidTurkishWord(comb))
        ) {
          mergedTokens[mergedTokens.length - 1] = prev + curr
          continue
        }
        if (prevCore === 'hoş' && nextCore.startsWith('lan')) {
          mergedTokens[mergedTokens.length - 1] = prev + curr
          continue
        }
      }
      mergedTokens.push(curr)
    }
    t = mergedTokens.join(' ')
  }

  // 18. "ayın" + çoğul isim bozulmasını onar ("ayın insanların" -> "aynı insanların")
  t = t.replace(/\bayın\s+(?=[a-zçğıöşü]+(?:lar|ler|dan|den|nın|nin|ya|ye|a|e)\b)/g, 'aynı ')

  // 19. Fenomenoloji terimi "aktlar" OCR onarımı ("aktıann" -> "aktların")
  t = t.replace(/\baktıa(r|ra|rı|rın|rla|rda|rdan|nn)\b/g, 'aktla$1')
  t = t.replace(/\baktlann\b/g, 'aktların')

  // 20. OCR harf baskı ve dizgi hatalarını onar
  t = t.replace(/rrneğe\b/g, 'rmeğe')
  t = t.replace(/rnek\b/g, 'mek')
  t = t.replace(/araştırınağa\b/g, 'araştırmağa')
  t = t.replace(/fenarnen\b/g, 'fenomen')
  t = t.replace(/kanştır\b/g, 'karıştır')
  t = t.replace(/§/g, 'ş')
  t = t.replace(/(^|\s)!([aeıioöuü][a-zçğıöşü]*)/g, '$1l$2')

  // 21. Tırnak ve üç nokta bozulmalarını düzelt
  t = t.replace(/\.\s+\.\s+\./g, '...')
  t = t.replace(/''/g, '"')
  t = t.replace(/<<|ıı|\(\(/g, '«')
  t = t.replace(/>>|\)\)/g, '»')
  t = t.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]):'(?=\s|$)/g, '$1."')
  t = t.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]);'(?=\s|$)/g, '$1,"')

  // 22. Bitişik tırnak ve diyalog başlangıçlarını ayır ("sayılır:'"Evet" -> 'sayılır." "Evet')
  t = t.replace(/([.:!?…])(["”’»]+)([A-ZÇĞİÖŞÜ"“‘])/g, '$1$2 $3')
  t = t.replace(/([:;])'([A-ZÇĞİÖŞÜ])/g, '$1" $2')

  // 23. Noktalama ve camelCase Temizliği (3. Adım)
  t = cleanPunctuationAndCamelCase(t)

  // 24. Normalizasyon: çoklu boşlukları tek boşluğa indir (4. Adım)
  return t.replace(/\s+/g, ' ').trim()
}

const NEVER_MERGE_PAIR_LEFT = new Set([
  'bir', 'bu', 'şu', 'o', 've', 'de', 'da', 'ki', 'ne', 'en', 'çok', 'az', 'her', 'hiç',
  'var', 'yok', 'ben', 'sen', 'biz', 'siz', 'ama', 'fakat', 'ancak', 'için', 'gibi', 'kadar',
  'sonra', 'önce', 'daha', 'yine', 'bile', 'mi', 'mı', 'mu', 'mü', 'ya', 'hem', 'ise', 'ile',
  'fark', 'terk', 'el', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan', 'yüz', 'bin',
  'geri', 'ileri', 'değil', 'fazla', 'oyuncak', 'hiçbir', 'birkaç', 'onu', 'onun', 'ona', 'eder', 'hadi', 'sadaka', 'tek', 'iki', 'içeri',
])

const KNOWN_SHORT_PREFIX_MERGES = [
  'dede', 'yakın', 'kitap', 'kitab', 'yatak', 'yatağ', 'dayan', 'hiçbir', 'endişe', 'endiye',
  'dillerde', 'yumu', 'onlar', 'neresi', 'veriyor', 'yapardı',
]

function getWordStems(w: string): Set<string> {
  const stems = new Set<string>([w])
  for (const s1 of TURKISH_SUFFIXES) {
    if (w.endsWith(s1) && w.length - s1.length >= 3) {
      const st1 = w.slice(0, w.length - s1.length)
      stems.add(st1)
      if (ALL_VOWELS.has(s1[0])) {
        if (st1.endsWith('ğ')) stems.add(st1.slice(0, -1) + 'k')
        else if (st1.endsWith('b')) stems.add(st1.slice(0, -1) + 'p')
        else if (st1.endsWith('c')) stems.add(st1.slice(0, -1) + 'ç')
        else if (st1.endsWith('d')) stems.add(st1.slice(0, -1) + 't')
      }
      for (const s2 of TURKISH_SUFFIXES) {
        if (st1.endsWith(s2) && st1.length - s2.length >= 3) {
          const st2 = st1.slice(0, st1.length - s2.length)
          stems.add(st2)
          if (ALL_VOWELS.has(s2[0])) {
            if (st2.endsWith('ğ')) stems.add(st2.slice(0, -1) + 'k')
            else if (st2.endsWith('b')) stems.add(st2.slice(0, -1) + 'p')
            else if (st2.endsWith('c')) stems.add(st2.slice(0, -1) + 'ç')
            else if (st2.endsWith('d')) stems.add(st2.slice(0, -1) + 't')
          }
        }
      }
    }
  }
  return stems
}

/**
 * İki satır veya sayfa sınırındaki kelime çiftini hece/tire bölmesi açısından birleştirir.
 */
function tryMergeWordPair(
  lastWord: string,
  nextWord: string,
  context: { hasOpenParentheticalDash?: boolean } = {},
): string | null {
  if (!lastWord || !nextWord) return null
  const { hasOpenParentheticalDash = false } = context

  const cleanNext = nextWord.replace(/^['"“‘\(]+/, '')
  const cleanNextCore = cleanNext.replace(/['"”’\.,;:\!\?\)\]]+$/, '')

  // 1. Tire veya \uFFFD ile hece bölmesi ("anla-" + "şılmıyor", "ka\u00AD" + "sabası")
  const hyphenMatch = lastWord.match(
    /^(\S*[a-zA-ZçğıöşüÇĞİÖŞÜ0-9])([\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]+)$/,
  )
  if (hyphenMatch) {
    const prefix = hyphenMatch[1]
    const hyphenChar = hyphenMatch[2]

    if (
      hyphenChar.includes('\uFFFD') &&
      (hasOpenParentheticalDash || (/[a-zçğıöşü]$/.test(prefix) && /^[A-ZÇĞİÖŞÜ]/.test(cleanNext)))
    ) {
      return `${prefix}– ${nextWord}`
    }

    if (/^[a-zçğıöşü']/.test(cleanNext)) {
      const leadingPrefix = lastWord.slice(0, lastWord.length - (prefix.length + hyphenChar.length))
      return cleanIntraLineHyphens(leadingPrefix + prefix + cleanNext)
    }

    const prefixLetters = prefix.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')
    const nextLetters = cleanNextCore.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')
    if (
      prefixLetters.length >= 2 &&
      prefixLetters === prefixLetters.toUpperCase() &&
      nextLetters.length >= 1 &&
      nextLetters === nextLetters.toUpperCase()
    ) {
      const leadingPrefix = lastWord.slice(0, lastWord.length - (prefix.length + hyphenChar.length))
      return leadingPrefix + prefix + cleanNext
    }

    return prefix + '–' + nextWord
  }

  // 2. Türkçe Ğ kuralı (Türkçe'de hiçbir kelime ğ veya Ğ ile başlamaz; OCR tireyi yutsa bile daima önceki kelimenin devamıdır)
  if (/^[ğĞ]/.test(cleanNextCore)) {
    const cleanPrefix = lastWord.replace(/[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]+$/, '')
    return cleanIntraLineHyphens(cleanPrefix + cleanNext)
  }

  // 3. Kesme işareti ile bölünen özel isim veya ek ("Türkiye’" + "nin", "Nora'" + "ya")
  const apostropheMatch = lastWord.match(/^(\S*[a-zA-ZçğıöşüÇĞİÖŞÜ0-9]['’‘\`])$/)
  if (
    apostropheMatch &&
    /^[a-zçğıöşü]{1,10}(?:['"”’\.,;:\!\?\)\]\¹²³⁴⁵⁶⁷⁸⁹⁰\*†‡]|\[\d+\])*$/.test(cleanNext)
  ) {
    return apostropheMatch[1] + cleanNext
  }

  // 4. PDF.js tarafından yutulmuş koşullu tire (\u00AD) ve satır sonu hece bölmesi analizi
  const caLeadMatch = lastWord.match(/^[^\wçğıöşüÇĞİÖŞÜ]*/)
  const caLead = caLeadMatch ? caLeadMatch[0] : ''
  const ca = lastWord.slice(caLead.length)
  if (!ca || !/^[a-zçğıöşü]/.test(cleanNextCore)) {
    return null
  }

  const rawComb = cleanIntraLineHyphens(ca + cleanNextCore)
  const la = toTurkishLower(cleanIntraLineHyphens(ca))
  const lb = toTurkishLower(cleanIntraLineHyphens(cleanNextCore).split(/['’]/)[0])
  const combined = toTurkishLower(rawComb.split(/['’]/)[0])

  if (!/^[a-zçğıöşü]+$/.test(la) || !/^[a-zçğıöşü]+$/.test(lb)) {
    return null
  }
  if (la === lb) return null
  if (
    ['fark', 'terk', 'arz', 'kul', 'ret', 'hak', 'af', 'his', 'zannet', 'ayırt'].includes(la) &&
    /^(et|ed|ol)/.test(lb)
  ) {
    return null
  }
  if (
    [
      'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan', 'yüz',
      'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz',
    ].includes(la) &&
    ['bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on', 'yüz', 'bin'].includes(lb)
  ) {
    return null
  }
  if (['mi', 'mı', 'mu', 'mü', 'miydi', 'mıydı', 'muydu', 'müydü', 'misin', 'mısın', 'musun', 'müsün'].includes(lb)) {
    return null
  }
  if (la === 'geri' && lb.startsWith('zeka')) {
    return null
  }

  // Tezlik / Yeterlilik / Olumsuz yeterlilik birleşik fiilleri
  if (
    /^ver(mek|di|dim|din|dik|miş|mişim|mişti|miştim|iyor|iyordu|ecek)?$/.test(lb) &&
    /[ıiuü]$/.test(la) &&
    la.length >= 4 &&
    !/(sını|sini|sunu|sünü|larını|lerini|mı|mi|mu|mü|nı|ni|nu|nü)$/.test(la)
  ) {
    return cleanIntraLineHyphens(lastWord + cleanNext)
  }
  if (/^bil(mek|ir|sin|di|dim|iyor|iyordu|ecek|se)?$/.test(lb) && /[ae]$/.test(la)) {
    if (isValidTurkishWord(combined)) {
      return cleanIntraLineHyphens(lastWord + cleanNext)
    }
  }
  if (/^m(az|ez|azsa|ezse|azsam|ezsem|adı|edi|adım|edim|ıyor|iyor|ıyordu|iyordu)$/.test(lb) && /[ae]$/.test(la)) {
    if (isValidTurkishWord(combined)) {
      return cleanIntraLineHyphens(lastWord + cleanNext)
    }
  }

  if (
    !NEVER_BOUND_SUFFIX_RIGHT.has(lb) &&
    (BOUND_CONTINUATION_REGEX.test(lb) || BROKEN_SUFFIX_SET.has(lb) || NON_STANDALONE_WORD_B_PATTERNS.some((rx) => rx.test(lb))) &&
    isValidTurkishWord(combined)
  ) {
    return cleanIntraLineHyphens(lastWord + cleanNext)
  }

  const validA = isValidTurkishWord(la)
  const validB = isValidTurkishWord(lb)
  const validComb = isValidTurkishWord(combined)

  if ((!validA || !validB) && validComb) {
    return cleanIntraLineHyphens(lastWord + cleanNext)
  }

  if (
    KNOWN_SHORT_PREFIX_MERGES.some((p) => combined.startsWith(p) && la.length < p.length) &&
    validComb
  ) {
    return cleanIntraLineHyphens(lastWord + cleanNext)
  }

  if (!NEVER_MERGE_PAIR_LEFT.has(la) && !NEVER_MERGE_PAIR_LEFT.has(lb) && !NEVER_BOUND_SUFFIX_RIGHT.has(lb)) {
    for (const st of getWordStems(combined)) {
      if (st.length > la.length && turkishDictSet.has(st)) {
        return cleanIntraLineHyphens(lastWord + cleanNext)
      }
    }
  }

  return null
}

/**
 * Hem aynı sayfadaki alt alta satırlar arasında hem de sayfa geçişlerindeki
 * bölünmüş kelimeleri tek parça olarak diker (De-hyphenation across lines & pages).
 */
export function mergeSplitWordsAcrossLinesAndPages(preparedPages: PreparedPage[]) {
  // Sayfa başlarındaki ve sonlarındaki tekil sayfa numaralarını kesin olarak temizle
  for (const page of preparedPages) {
    if (page.isBoilerplate) continue
    while (
      page.bodyLines.length > 0 &&
      (!page.bodyLines[0].text.trim() || /^\d{1,4}\.?$/.test(page.bodyLines[0].text.trim()))
    ) {
      page.bodyLines.shift()
    }
    while (
      page.bodyLines.length > 0 &&
      (!page.bodyLines[page.bodyLines.length - 1].text.trim() ||
        /^\d{1,4}\.?$/.test(page.bodyLines[page.bodyLines.length - 1].text.trim()))
    ) {
      page.bodyLines.pop()
    }
  }

  const sequence: PdfLine[] = []
  for (const page of preparedPages) {
    if (page.isBoilerplate) continue
    for (const lineObj of page.bodyLines) {
      if (lineObj.text && lineObj.text.trim()) {
        sequence.push(lineObj)
      }
    }
  }

  // Çok satırlı (örn. yu-\nmu-\nşak) hece bölmelerini de yakalamak için sondan başa 2 geçiş
  for (let pass = 0; pass < 2; pass++) {
    for (let i = sequence.length - 1; i > 0; i--) {
      const lineA = sequence[i - 1]
      const lineB = sequence[i]

      if (lineA.isHeading || lineB.isHeading) continue

      const wordsA = lineA.text.trim().split(/\s+/).filter(Boolean)
      const wordsB = lineB.text.trim().split(/\s+/).filter(Boolean)
      if (!wordsA.length || !wordsB.length) continue

      // Eğer son kelime tek başına bir tire ise ("verebile" + "-"): tireyi önceki kelimeye bitiştir
      if (
        wordsA.length >= 2 &&
        /^[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]+$/.test(wordsA[wordsA.length - 1])
      ) {
        wordsA.pop()
        wordsA[wordsA.length - 1] += '-'
      }

      const lastWordA = wordsA[wordsA.length - 1]
      const firstWordB = wordsB[0]

      const lineABeforeLast = wordsA.slice(0, -1).join(' ')
      const hasOpenParentheticalDash = /(?:^|\s)[\-\–\—][a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(lineABeforeLast)

      const merged = tryMergeWordPair(lastWordA, firstWordB, { hasOpenParentheticalDash })
      if (merged) {
        if (merged.includes(' ')) {
          const splitParts = merged.split(/\s+/)
          wordsA[wordsA.length - 1] = splitParts[0]
          wordsB[0] = splitParts.slice(1).join(' ')
        } else {
          wordsA[wordsA.length - 1] = merged
          wordsB.shift()
        }
        lineA.text = cleanIntraLineHyphens(wordsA.join(' '))
        lineB.text = cleanIntraLineHyphens(wordsB.join(' '))
      }
    }
  }

  for (const page of preparedPages) {
    page.bodyLines = page.bodyLines.filter((l) => l.text && l.text.trim().length > 0)
  }
}

function normalizeEdgeLineForRepeatCheck(lineText: string): string {
  if (!lineText) return ''
  return lineText
    .trim()
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Birden fazla sayfada üstte veya altta tekrar eden kitap/yazar adı gibi running header satırlarını bulur.
 */
function findRepeatedHeaderFooterLines(pages: { pageNumber: number; lines: PdfLine[] }[]): Set<string> {
  const counts = new Map<string, number>()
  if (pages.length < 3) return new Set()

  for (const p of pages) {
    if (!p.lines.length) continue
    const firstRaw = p.lines[0].text.trim()
    const lastRaw = p.lines[p.lines.length - 1].text.trim()

    const first = normalizeEdgeLineForRepeatCheck(firstRaw)
    const last = normalizeEdgeLineForRepeatCheck(lastRaw)

    if (first.length > 2 && first.length < 70 && !/[.!?]$/.test(firstRaw)) {
      counts.set(first, (counts.get(first) || 0) + 1)
    }
    if (last !== first && last.length > 2 && last.length < 70 && !/[.!?]$/.test(lastRaw)) {
      counts.set(last, (counts.get(last) || 0) + 1)
    }
  }

  const repeated = new Set<string>()
  for (const [text, count] of counts.entries()) {
    if (count >= 3) repeated.add(text)
  }
  return repeated
}

/**
 * Açık bölüm anahtar kelimelerini (BÖLÜM 1, GİRİŞ, ÖNSÖZ, ÖZET..., SONUÇ...) kontrol eder.
 */
function isExplicitChapterStart(t: string): boolean {
  return /^(?:(?:birinci|ikinci|üçüncü|dördüncü|beşinci|\d{1,2}|[IVXLC]{1,5})[\.\-\s]+)?(bölüm|kısım|fasıl|chapter|part|section|giriş|önsöz|sunuş|sonsöz|sonuç|epilog|prolog|özet\s+yönetici\s+raporu|yönetici\s+özeti|özet|içindekiler|kaynakça|kaynaklar)(\b|\s|$)/i.test(
    t.trim(),
  )
}

/**
 * Bir satırın ANA BÖLÜM veya ANA BAŞLIK olup olmadığını tespit eder.
 * Alt başlıkları, numaralı liste maddelerini (örn. "6. Felsefi Referanslar: Metinde...") ve açıklama cümlelerini eler.
 */
function isHeadingLine(
  lineObj: PdfLine,
  medianFontSize: number,
  lineIdx: number,
  allLines: PdfLine[],
  isFirstPage: boolean = false,
): boolean {
  const t = lineObj.text.trim()
  if (!t || t.length > 95) return false

  // Şema, diyagram veya tablo karakterleri içeren satırlar başlık olamaz
  const DIAGRAM_CHARS = ['│', '┌', '└', '┴', '┬', '├', '┤', '─', '▼', '▲', '$$', '\\longrightarrow', '──>', '═', '║', '╔', '╗', '╚', '╝']
  if (DIAGRAM_CHARS.some((char) => t.includes(char))) return false
  if (t.startsWith('[') && t.endsWith(']')) return false

  // Önceki satır virgül, noktalı virgül, tire, taksim veya ok işaretiyle bitiyorsa, bu satır yarım kalmış bir ifadenin devamıdır
  if (allLines && lineIdx > 0) {
    const prevText = allLines[lineIdx - 1].text.trim()
    if (/[,;\-\–\—\>\/]$/.test(prevText)) {
      return false
    }
  }

  const words = t.split(/\s+/)
  if (words.length > 16) return false

  // Madde işaretleri (bullet) veya liste belirteçleri başlık olamaz
  if (/^[●•▪\*\-]\s+/.test(t)) return false

  // Cümle bitiren noktalama (. ! ?), noktalı virgül (;) veya iki nokta ile biten lead-in satırları başlık olamaz
  if (/[.!?:;]$/.test(t)) return false

  // 1. Markdown başlığı (# Başlık)
  if (/^#{1,3}\s+\S+/.test(t)) return true

  // 2. Açık ana bölüm kelimeleri (BÖLÜM 1, 1. Bölüm, GİRİŞ, ÖNSÖZ, ÖZET YÖNETİCİ RAPORU, SONUÇ vb.)
  if (isExplicitChapterStart(t) && words.length <= 12) {
    if (t.includes(':')) {
      const colonIdx = t.indexOf(':')
      const after = colonIdx !== -1 ? t.slice(colonIdx + 1).trim() : ''
      const afterLetters = after.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')
      if (afterLetters && afterLetters !== afterLetters.toUpperCase() && after.split(/\s+/).length > 3) {
        return false
      }
    }
    return true
  }

  // 3. Numaralı ve Tamamı BÜYÜK HARF olan ana bölümler ("1. YENİ ELEŞTİRİ VE METNİN İÇSEL DİNAMİKLERİ: ...")
  // Küçük harf veya Title Case içeren numaralı satırlar (örn: "6. Felsefi Referanslar: Metinde...") liste maddesidir, elenir
  const numMatch = t.match(/^(?:(\d{1,2}|[IVXLC]{1,5})\.)\s+([A-ZÇĞİÖŞÜ].*)$/)
  if (numMatch) {
    const rest = numMatch[2].trim()
    const restLetters = rest.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')
    if (restLetters.length >= 3 && restLetters === restLetters.toUpperCase()) {
      if (rest.includes(':')) {
        const colonIdx = rest.indexOf(':')
        const after = colonIdx !== -1 ? rest.slice(colonIdx + 1).trim() : ''
        const afterLetters = after.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')
        if (afterLetters && afterLetters === afterLetters.toUpperCase()) {
          return true
        }
      } else {
        return true
      }
    }
    return false
  }

  const lettersOnly = t.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')

  // 4. Belgenin ilk sayfasının başındaki ana başlık bloğu (BİLGİLENDİRME NOTU: ...)
  if (isFirstPage && lineIdx <= 3) {
    if (lettersOnly.length >= 4 && lettersOnly === lettersOnly.toUpperCase() && words.length <= 14) {
      return true
    }
  }

  // 5. Çok satırlı ana başlık devam satırı (örn: 1. bölümün devamı olan "BÜTÜNLÜK")
  if (lettersOnly.length >= 2 && lettersOnly === lettersOnly.toUpperCase() && words.length <= 6) {
    if (allLines && lineIdx > 0) {
      const prev = allLines[lineIdx - 1].text.trim()
      const prevNum = prev.match(/^(?:(\d{1,2}|[IVXLC]{1,5})\.)\s+([A-ZÇĞİÖŞÜ].*)$/)
      if (prevNum) {
        const prevLetters = prevNum[2].replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')
        if (prevLetters.length >= 3 && prevLetters === prevLetters.toUpperCase()) {
          return true
        }
      }
      if (isExplicitChapterStart(prev)) {
        return true
      }
    }
  }

  // 6. Belirgin derecede büyük fontlu başlık (Gövde fontundan en az %25 büyük ve sayfa başında - roman vb. için)
  if (
    lineObj.fontSize &&
    medianFontSize &&
    lineObj.fontSize >= medianFontSize * 1.25 &&
    words.length <= 8 &&
    !t.includes(':')
  ) {
    if (lineIdx === 0) return true
    if (lineIdx === 1 && allLines && /^\d+$/.test(allLines[0].text.trim())) return true
  }

  // 7. Sayfa başında tek başına yer alan kısa BÜYÜK HARFLİ roman bölüm başlığı (font bilgisi olmayan PDF'ler için)
  if (
    (lineIdx === 0 || (lineIdx === 1 && allLines && /^\d+$/.test(allLines[0].text.trim()))) &&
    words.length >= 1 &&
    words.length <= 6 &&
    !t.includes(':') &&
    lettersOnly.length >= 4 &&
    lettersOnly === lettersOnly.toUpperCase() &&
    !/^(bölüm|kısım|sayfa|içindekiler)/i.test(t)
  ) {
    return true
  }

  return false
}

/**
 * Ardışık gelen başlık satırlarını (örneğin birden fazla satıra bölünmüş kitap/makale başlıklarını)
 * tek parça bütünlüklü bir başlık haline getirir.
 */
function mergeConsecutiveHeadingLines(lines: PdfLine[]): PdfLine[] {
  const merged: PdfLine[] = []
  let i = 0

  while (i < lines.length) {
    const current = lines[i]
    if (!current.isHeading) {
      merged.push(current)
      i++
      continue
    }

    let fullHeadingText = current.text.trim()
    while (i + 1 < lines.length) {
      const next = lines[i + 1]
      if (!next.isHeading) break

      const nextText = next.text.trim()

      // Sonraki satır yeni bir numaralı başlık veya açık bölüm başlangıcı ise birleştirme
      if (isExplicitChapterStart(nextText) || /^(?:\d{1,2}|[IVXLC]{1,5})\.\s+/.test(nextText)) {
        break
      }

      // Mevcut başlık cümle bitiren noktalama içeriyorsa devam ettirme
      if (/[.!?]$/.test(fullHeadingText)) {
        break
      }

      const currLetters = fullHeadingText.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')
      const nextLetters = nextText.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')
      const isCurrAllCaps = currLetters.length >= 3 && currLetters === currLetters.toUpperCase()
      const isNextAllCaps = nextLetters.length >= 2 && nextLetters === nextLetters.toUpperCase()
      const nextWordCount = nextText.split(/\s+/).length

      if ((isCurrAllCaps && isNextAllCaps && nextWordCount <= 14) || (nextWordCount <= 6 && !/[.!?]$/.test(nextText))) {
        fullHeadingText = `${fullHeadingText} ${nextText}`
        i++
      } else {
        break
      }
    }

    current.text = fullHeadingText
    merged.push(current)
    i++
  }

  return merged
}

/**
 * Sayfa altındaki dipnot tanımlarını ana gövde metninden ayıklar.
 */
function extractFootnotesFromLines(
  lines: PdfLine[],
  medianFontSize: number,
): { bodyLines: PdfLine[]; footnotes: ExtractedFootnote[] } {
  const bodyLines: PdfLine[] = []
  const footnotes: ExtractedFootnote[] = []
  const fnRegex =
    /^(?:\[(\d{1,3}|\*{1,4}|†|‡)\]|\((\d{1,3}|\*{1,4}|†|‡)\)|([¹²³⁴⁵⁶⁷⁸⁹⁰]+)|['"«]?(\*{1,4}|†|‡)|(?:dipnot|not)\s*(\d{1,3})\s*[\:\.\-]|(\d{1,2})[\.\)]?\s+(?=[A-ZÇĞİÖŞÜ"“'‘\(])|(?:Bak\.?|Bkz\.?|Op\.\s*cit|İbid|A\.g\.e|Cfr|Karş|Her düşünürde|Ve Hartmann|I\.\s*Kant:|J\.P\.\s*Sartre|N\.\s*Guillen|N\.\s*Hartmann|M\.\s*Scheler)\b)\s*(.+)$/i

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.isHeading) {
      bodyLines.push(line)
      continue
    }
    const t = line.text.trim()

    const isExplicitFn = /^(\[\d{1,3}\]|\(\d{1,3}\)|[¹²³⁴⁵⁶⁷⁸⁹⁰]+|['"«]?\*{1,4}|†|‡|(?:dipnot|not)\s*\d+|(?:Bak\.?|Bkz\.?|Op\.\s*cit|İbid|A\.g\.e|Cfr|Karş|Her düşünürde|Ve Hartmann|I\.\s*Kant:|J\.P\.\s*Sartre|N\.\s*Guillen|N\.\s*Hartmann|M\.\s*Scheler)\b)/i.test(t)
    const isBottomArea = i >= Math.floor(lines.length * 0.45) || i >= lines.length - 6 || line.yRatio > 0.65
    const isSmallerFont = line.fontSize && medianFontSize && line.fontSize < medianFontSize * 0.92

    const match = t.match(fnRegex)
    if (match && (isExplicitFn || isBottomArea || isSmallerFont)) {
      const fnContent = match[7]?.trim() || ''
      // "1. Bölüm" gibi başlıkları dipnot sanma
      if (match[6] && (/^(bölüm|kısım|chapter|part)\b/i.test(fnContent) || fnContent.split(/\s+/).length <= 3)) {
        bodyLines.push(line)
        continue
      }

      const marker = match[1] || match[2] || match[3] || match[4] || match[5] || match[6] || '*'
      let fullFnText = fnContent
      // Dipnot başlangıcı: sayfa sonuna kadar olan devam satırlarını da dipnot olarak atla
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        const nextText = nextLine.text.trim()
        if (/^\d{1,4}\.?$/.test(nextText)) {
          i++
        } else if (fnRegex.test(nextText)) {
          break
        } else if (nextLine.yRatio > 0.75) {
          fullFnText += ' ' + nextText
          i++
        } else {
          break
        }
      }

      footnotes.push({
        marker,
        text: cleanIntraLineHyphens(fullFnText.replace(/\s+/g, ' ').trim()).replace(/\(e\.\s*n\.\)/gi, '(ç. n.)'),
      })
    } else {
      bodyLines.push(line)
    }
  }

  // Sayfa sonundaki tekil sayfa numaralarını eler
  while (bodyLines.length > 0 && /^\d{1,4}\.?$/.test(bodyLines[bodyLines.length - 1].text.trim())) {
    bodyLines.pop()
  }

  return { bodyLines, footnotes }
}

/**
 * Sayfadan ayıklanan dipnotları, gövde metnindeki çağrı işaretlerinin (*, **, [1]) hemen ardına akıllıca iliştirir.
 * Bu sayede okuyucu metin akışında dipnota denk geldiğinde dipnotu okur ve cümleye kaldığı yerden devam eder.
 */
function inlineFootnotesIntoBodyLines(bodyLines: PdfLine[], footnotes?: ExtractedFootnote[]) {
  if (!footnotes || !footnotes.length || !bodyLines.length) return

  for (const fn of footnotes) {
    if (!fn.text) continue
    const cleanFnText = fn.text.replace(/^[\*\d\.\:\-\s]+/, '').trim()
    if (!cleanFnText) continue

    const marker = fn.marker.trim()
    let attached = false

    for (let lIdx = 0; lIdx < bodyLines.length; lIdx++) {
      const l = bodyLines[lIdx]
      const hasMarker =
        marker.startsWith('*')
          ? l.text.includes(marker)
          : /^\d+$/.test(marker)
            ? l.text.includes(`[${marker}]`) || l.text.includes(`(${marker})`) || l.text.includes(marker)
            : l.text.includes(marker)

      if (hasMarker) {
        const words = l.text.split(/\s+/)
        const wordIdx = words.findIndex((w) =>
          marker.startsWith('*')
            ? w.includes(marker)
            : /^\d+$/.test(marker)
              ? w.includes(`[${marker}]`) || w.includes(`(${marker})`)
              : w.includes(marker),
        )
        if (wordIdx !== -1) {
          words.splice(wordIdx + 1, 0, `[Dipnot: ${cleanFnText}]`)
          l.text = words.join(' ')
          attached = true
          break
        }
      }
    }

    if (!attached) {
      const lastLine = bodyLines[bodyLines.length - 1]
      lastLine.text = `${lastLine.text} [Dipnot: ${cleanFnText}]`
    }
  }
}

/**
 * Taranmış sayfalarda arka plan desenleri, çizimler veya yıldız/nokta gibi şekillerden
 * kaynaklanan OCR halüsinasyonlarını (anlamsız rastgele harf yığını) tespit eder.
 */
export function isOcrGarbage(text: string): boolean {
  if (!text) return false
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g, ''))
    .filter(Boolean)
  if (words.length < 15) return false

  const totalWords = words.length
  const shortWords = words.filter((w) => w.length <= 2).length
  const singleCharWords = words.filter((w) => w.length === 1).length
  const totalChars = words.reduce((acc, w) => acc + w.length, 0)
  const avgWordLen = totalChars / totalWords

  if (shortWords / totalWords >= 0.45 || singleCharWords / totalWords >= 0.25 || avgWordLen < 2.8) {
    return true
  }

  return false
}

/**
 * Kitabın önsöz, künye, telif, iç kapak, yazar/çevirmen biyografisi ve arka kapak tanıtım
 * sayfalarını otomatik tespit ederek atlar; böylece okuma doğrudan kitabın asıl metninden başlar.
 */
export function classifyPageBoilerplate(
  page: { pageNumber: number; lines: PdfLine[] },
  totalPages: number,
  context: {
    mainContentStarted?: boolean
    inPreface?: boolean
    lastFrontMatterPage?: number
    seenBackBlankPage?: boolean
  } = {},
): { isBoilerplate: boolean; reason: string; inPreface?: boolean } {
  const fullText = page.lines.map((l) => l.text.trim()).join(' ').trim()
  const words = fullText.split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return { isBoilerplate: true, reason: 'Boş Sayfa', inPreface: false }
  }

  const lower = toTurkishLower(fullText)
  const pno = page.pageNumber

  // Ön sayfalar: Künye / İç Kapak sayfasına kadar olan tüm ön sayfalar (kapak, biyografi, künye, iç kapak)
  if (context.lastFrontMatterPage && pno <= context.lastFrontMatterPage) {
    return { isBoilerplate: true, reason: 'Ön Sayfa / Künye / İç Kapak', inPreface: false }
  }

  if (pno <= Math.min(12, Math.ceil(totalPages * 0.15))) {
    // 1. Künye / Telif / Yayınevi sayfası
    if (
      /(isbn|sertifika\s*no|tüm\s*hakları\s*saklıdır|kitabın\s*özgün\s*adı|kapak\s*tasarımı|sayfa\s*düzeni|matbaacılık|baskı\s*:|yayınları|yayınevi)/i.test(
        lower,
      )
    ) {
      return { isBoilerplate: true, reason: 'Künye / Telif Sayfası', inPreface: false }
    }

    // 2. İç kapak / Başlık sayfası (çok az kelimeli ilk sayfalar)
    if (words.length <= 15 && pno <= 8) {
      return { isBoilerplate: true, reason: 'İç Kapak / Başlık Sayfası', inPreface: false }
    }

    // 3. Yazar / Çevirmen biyografisi (ilk 6 sayfada kısa özgeçmiş metinleri)
    if (
      pno <= 6 &&
      words.length < 240 &&
      /(doğdu|yılında|mezun\s+oldu|çevirmen|edebiyat|ödülü|eserleri|yayınlandı|yayımlandı)/i.test(lower)
    ) {
      return { isBoilerplate: true, reason: 'Yazar / Çevirmen Biyografisi', inPreface: false }
    }

    // 4. Önsöz / Sunuş / İçindekiler sayfası
    const firstLineLower = toTurkishLower(page.lines[0]?.text?.trim() || '')
    if (/^(önsöz|sunuş|içindekiler|takdim|çevirmenin\s+notu|yazarın\s+önsözü)\b/i.test(firstLineLower)) {
      return { isBoilerplate: true, reason: 'Önsöz / İçindekiler', inPreface: true }
    }
  }

  // Son sayfalar: Arka kapak, reklam ve tanıtım sayfaları
  if (totalPages >= 15 && pno > totalPages - 5) {
    if (
      context.seenBackBlankPage ||
      /(başyapıt|kitap|isbn|yayınları|yayınevi|www\.|arka\s*kapak)/i.test(lower)
    ) {
      return { isBoilerplate: true, reason: 'Arka Kapak / Tanıtım', inPreface: false }
    }
  }

  return { isBoilerplate: false, reason: 'Ana Metin', inPreface: false }
}

/**
 * PDF.js metin parçalarını Y ve X koordinatlarına göre sıralayıp satırlara gruplar.
 * 2. KURAL: Koordinat tabanlı boşluk hesabı ve satır sonu kontrollerini uygular.
 */
function groupPdfItemsIntoLines(items: any[], pageHeight: number, pageNumber: number): PdfLine[] {
  if (!items || !items.length) return []

  const heights = items
    .filter((it) => it.str && it.str.trim())
    .map((it) => Math.abs(it.transform?.[3]) || it.height || 12)
    .sort((a, b) => a - b)
  const medianH = heights.length ? heights[Math.floor(heights.length / 2)] : 12

  const validItems: Array<{
    str: string
    x: number
    y: number
    width: number
    fontSize: number
    yFromTop: number
    hasEOL: boolean
  }> = []

  let lastValid: any = null
  for (const it of items) {
    if (!it.str || !it.str.trim()) {
      if (it.hasEOL && lastValid) {
        lastValid.hasEOL = true
      }
      continue
    }
    const x = it.transform?.[4] || 0
    const y = it.transform?.[5] || 0
    const fontSize = Math.abs(it.transform?.[3]) || it.height || 12
    const itemObj = {
      str: it.str,
      x,
      y,
      width: it.width || 0,
      fontSize,
      yFromTop: pageHeight ? pageHeight - y : 0,
      hasEOL: Boolean(it.hasEOL),
    }
    validItems.push(itemObj)
    lastValid = itemObj
  }

  // 2. KURAL: Y koordinatına göre yukarıdan aşağıya (Math.abs(a.y - b.y) > 2), X'e göre soldan sağa sırala
  validItems.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 2) {
      return b.y - a.y // Yukarıdan aşağıya
    }
    return a.x - b.x // Soldan sağa
  })

  const lines: PdfLine[] = []
  let currentLine: { items: any[]; y: number; yFromTop: number; maxFontSize: number } | null = null

  for (const item of validItems) {
    if (!currentLine) {
      currentLine = {
        items: [item],
        y: item.y,
        yFromTop: item.yFromTop,
        maxFontSize: item.fontSize,
      }
      continue
    }

    const yDiff = Math.abs(item.y - currentLine.y)
    const isSuperscript =
      item.fontSize < medianH * 0.85 &&
      item.y > currentLine.y &&
      item.y - currentLine.y <= medianH * 0.75 &&
      /^\d{1,2}$|^\*{1,3}$|^†$/.test(item.str.trim())

    // Y koordinatı değiştiyse (Math.abs(currentY - prevY) > 2) yeni satıra geç
    if (yDiff <= 2 || isSuperscript) {
      if (isSuperscript) {
        item.str = `[${item.str.trim()}]`
      }
      currentLine.items.push(item)
      if (item.fontSize > currentLine.maxFontSize && !isSuperscript) {
        currentLine.maxFontSize = item.fontSize
      }
    } else {
      lines.push(finalizePdfLine(currentLine, pageHeight, pageNumber))
      currentLine = {
        items: [item],
        y: item.y,
        yFromTop: item.yFromTop,
        maxFontSize: item.fontSize,
      }
    }
  }

  if (currentLine) {
    lines.push(finalizePdfLine(currentLine, pageHeight, pageNumber))
  }

  return lines
}

function finalizePdfLine(
  lineGroup: { items: any[]; maxFontSize: number; yFromTop: number },
  pageHeight: number,
  pageNumber: number,
): PdfLine {
  lineGroup.items.sort((a, b) => a.x - b.x)
  let text = ''
  const lineFontSize = lineGroup.maxFontSize || 12

  for (let i = 0; i < lineGroup.items.length; i++) {
    const curr = lineGroup.items[i]
    if (i > 0) {
      const prev = lineGroup.items[i - 1]

      // 1. KURAL: Koordinat Tabanlı Boşluk Hesabı (PDF.js getTextContent)
      // - Y koordinatı değiştiyse (Math.abs(currentY - prevY) > 2) ve önceki satır tire ile bitmiyorsa araya boşluk koy.
      // - Aynı satırda (currentY === prevY), önceki item'ın bitiş X koordinatı (prevX + prevWidth) ile yeni item'ın
      //   başlangıç X koordinatı (currentX) arasındaki mesafe font boyutunun %15'inden (fontSize * 0.15) büyükse
      //   ve arada boşluk yoksa, araya otomatik " " (boşluk) ekle.
      // - item.hasEOL (End of Line) true ise ve kelime tire ile bitmiyorsa sonuna boşluk ekle.
      const yDiff = Math.abs(curr.y - prev.y)
      const gap = curr.x - (prev.x + prev.width)
      const fontSize = curr.fontSize || prev.fontSize || lineFontSize

      const isBracketFn = /^\[\d+\]$/.test(curr.str)
      const isTrailingPunctOrHyphen = /^[\-\u00AD\uFFFD\u2010\u2011\u2012\u2013\u00AC'’”\)\]\.,;:\!\?]+$/.test(curr.str.trim())
      const prevEndsWithJoiner = /['’‘“\(\[\-\u00AD\uFFFD\u2010\u2011]$/.test(prev.str.trim())

      const isYBreak = yDiff > 2
      const isSameLineSpace = yDiff <= 2 && gap >= (fontSize * 0.15)
      const isEolBreak = Boolean(prev.hasEOL)

      const needsSpace =
        (isYBreak || isSameLineSpace || isEolBreak) &&
        !isBracketFn &&
        !isTrailingPunctOrHyphen &&
        !prevEndsWithJoiner &&
        !text.endsWith(' ') &&
        !curr.str.startsWith(' ')

      if (needsSpace) {
        text += ' '
      }
    }

    text += curr.str

    // item.hasEOL true ise ve tire ile bitmiyorsa sonuna boşluk ekle
    if (curr.hasEOL && !/[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s*$/.test(text) && !text.endsWith(' ')) {
      text += ' '
    }
  }

  return {
    text: cleanIntraLineHyphens(normalizeCompoundWordHyphens(text.replace(/\s+/g, ' ').trim())),
    fontSize: lineGroup.maxFontSize,
    yRatio: pageHeight ? lineGroup.yFromTop / pageHeight : 0.5,
    pageNumber,
  }
}

/**
 * PDF dosyasının dijital metin katmanı içerip içermediğini örneklemeyle tespit eder.
 * Dijital kitaplarda boş veya illüstrasyon sayfalarında OCR çalıştırılmasını engelleyerek
 * halüsinasyonların ve performans kayıplarının önüne geçer.
 */
async function detectIsDigitalPdf(pdfDoc: any, numPages: number): Promise<boolean> {
  const sampleCount = Math.min(10, numPages)
  const step = Math.max(1, Math.floor(numPages / sampleCount))
  let pagesWithText = 0
  let totalWords = 0

  for (let i = 0; i < sampleCount; i++) {
    const pageNum = Math.min(numPages, 1 + i * step)
    try {
      const page = await pdfDoc.getPage(pageNum)
      const textContent = await page.getTextContent()
      const text = textContent.items.map((it: any) => it.str || '').join(' ')
      const words = text.split(/\s+/).filter(Boolean).length
      if (words >= 15) {
        pagesWithText++
        totalWords += words
      }
    } catch {
      // ignore
    }
  }

  return pagesWithText >= 2 || totalWords > 100
}

/**
 * PDF dosyasını (ArrayBuffer veya File) akıllı heuristics motoruyla ayrıştırır.
 */
export async function parsePdfDocument(
  source: ArrayBuffer | File,
  filename: string = 'Kitap/Belge',
  onProgress?: (message: string) => void,
): Promise<ExtractedBook> {
  const pdfjs = await loadPdfJs()
  if (!pdfjs) throw new Error('PDF ayrıştırıcı başlatılamadı.')

  onProgress?.('PDF dosyası açılıyor...')

  let dataBuffer: ArrayBuffer
  if (source instanceof File) {
    dataBuffer = await source.arrayBuffer()
  } else {
    dataBuffer = source
  }

  const loadingTask = pdfjs.getDocument({ data: dataBuffer })
  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages

  onProgress?.('PDF metin katmanı analiz ediliyor...')
  const isDigitalDocument = await detectIsDigitalPdf(pdfDoc, numPages)

  let isOcrUsed = false
  let skippedPagesCount = 0
  const rawPages: { pageNumber: number; lines: PdfLine[] }[] = []

  let tesseractWorker: any = null

  try {
    for (let i = 1; i <= numPages; i++) {
      onProgress?.(`Sayfa ${i} / ${numPages} analiz ediliyor...`)

      const page = await pdfDoc.getPage(i)
      const viewport = page.getViewport({ scale: 1.0 })
      const textContent = await page.getTextContent()

      let lines = groupPdfItemsIntoLines(textContent.items, viewport.height, i)
      const charCount = lines.reduce((acc, l) => acc + l.text.replace(/\s+/g, '').length, 0)

      // Eğer sayfa dijital metin içermiyorsa (< 20 karakter):
      // SADECE belge genel olarak taranmış (scanned) bir belge ise OCR uygula!
      // Dijital kitaplarda boş, kapak resmi veya çizim sayfaları OCR'a sokulmaz (halüsinasyonu ve gecikmeyi önler).
      if (charCount < 20 && !isDigitalDocument) {
        onProgress?.(`Sayfa ${i} taranmış resim algılandı, OCR yapılıyor...`)
        isOcrUsed = true

        if (!tesseractWorker) {
          const Tesseract = await loadTesseract()
          tesseractWorker = await Tesseract.createWorker('tur+eng')
        }

        const ocrViewport = page.getViewport({ scale: 2.0 })
        const canvas = document.createElement('canvas')
        canvas.width = ocrViewport.width
        canvas.height = ocrViewport.height
        const ctx = canvas.getContext('2d')

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport: ocrViewport }).promise
          const ocrResult = await tesseractWorker.recognize(canvas)
          const ocrText = (ocrResult.data && ocrResult.data.text) ? ocrResult.data.text : ''
          if (!isOcrGarbage(ocrText)) {
            lines = ocrText
              .split('\n')
              .map((l: string) => l.trim())
              .filter(Boolean)
              .map((lineText: string) => ({
                text: cleanIntraLineHyphens(lineText),
                fontSize: 12,
                yRatio: 0.5,
                pageNumber: i,
              }))
          } else {
            lines = []
          }
        }
      } else if (charCount < 20) {
        lines = []
      }

      rawPages.push({ pageNumber: i, lines })
    }
  } finally {
    if (tesseractWorker) {
      await tesseractWorker.terminate().catch(() => {})
    }
  }

  // 1. Sayfa üstü/altı tekrarlanan başlıkları tespit et
  const repeatedHeaders = findRepeatedHeaderFooterLines(rawPages)

  // 2. Sayfaları yapılandır, dipnotları ve gereksiz sayfaları temizle
  const preparedPages: PreparedPage[] = []
  let mainContentStarted = false
  let inPreface = false
  let seenBackBlankPage = false

  // İlk 10 sayfa içindeki son Künye / Telif / İç Kapak sayfasını tespit et
  let lastFrontMatterPage = 0
  for (const p of rawPages.slice(0, Math.min(10, rawPages.length))) {
    const pText = p.lines
      .filter((l) => !/^\d{1,4}\.?$/.test(l.text.trim()))
      .map((l) => l.text.trim())
      .join(' ')
      .trim()
    const pWords = pText.split(/\s+/).filter(Boolean)
    if (pWords.length === 0) continue
    const pLower = toTurkishLower(pText)
    if (
      /(isbn|sertifika\s*no|tüm\s*hakları\s*saklıdır|kitabın\s*özgün\s*adı|kapak\s*tasarımı|sayfa\s*düzeni|matbaacılık|baskı\s*:)/i.test(
        pLower,
      )
    ) {
      lastFrontMatterPage = Math.max(lastFrontMatterPage, p.pageNumber)
    } else if (pWords.length <= 15 && p.pageNumber <= 8 && lastFrontMatterPage > 0) {
      lastFrontMatterPage = Math.max(lastFrontMatterPage, p.pageNumber)
    }
  }

  for (const page of rawPages) {
    // Tekrarlanan üst/alt bilgi satırlarını filtrele
    const filteredLines = page.lines.filter((l, idx) => {
      if (idx === 0 || idx === page.lines.length - 1) {
        const norm = normalizeEdgeLineForRepeatCheck(l.text)
        if (repeatedHeaders.has(norm)) return false
        // Tekil sayfa numaralarını eler (örn: "14", "23.")
        if (/^\d{1,4}\.?$/.test(l.text.trim())) return false
      }
      return true
    })

    // Font medyanını hesapla
    const fonts = filteredLines.map((l) => l.fontSize || 12).sort((a, b) => a - b)
    const medianFont = fonts.length ? fonts[Math.floor(fonts.length / 2)] : 12

    // Başlıkları işaretle
    filteredLines.forEach((l, idx) => {
      l.isHeading = isHeadingLine(l, medianFont, idx, filteredLines, page.pageNumber === 1)
    })

    // Dipnotları ayıkla
    const { bodyLines, footnotes } = extractFootnotesFromLines(filteredLines, medianFont)

    // Ardışık başlık satırlarını tek parça başlıkta birleştir (Multi-line headings)
    const consolidatedBodyLines = mergeConsecutiveHeadingLines(bodyLines)

    // Sayfa sonundaki kelimeye yapışmış sayfa numarasını onar ('farklı de7' -> 'farklı de-')
    if (consolidatedBodyLines.length > 0) {
      const lastLine = consolidatedBodyLines[consolidatedBodyLines.length - 1]
      const m = lastLine.text.match(/([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})(\d{1,3})\.?$/)
      if (m) {
        const num = parseInt(m[2], 10)
        if (Math.abs(num - page.pageNumber) <= 2) {
          lastLine.text = lastLine.text.slice(0, lastLine.text.length - m[2].length) + '-'
        }
      }
    }

    if (numPages >= 15 && page.pageNumber > numPages - 5 && consolidatedBodyLines.length === 0) {
      seenBackBlankPage = true
    }

    // Künye ve gereksiz sayfa kontrolü
    const check = classifyPageBoilerplate(
      { pageNumber: page.pageNumber, lines: consolidatedBodyLines },
      numPages,
      { mainContentStarted, inPreface, lastFrontMatterPage, seenBackBlankPage },
    )
    inPreface = check.inPreface ?? false

    if (!check.isBoilerplate) {
      mainContentStarted = true
    } else {
      skippedPagesCount++
    }

    preparedPages.push({
      pageNumber: page.pageNumber,
      lines: filteredLines,
      bodyLines: consolidatedBodyLines,
      footnotes,
      isBoilerplate: check.isBoilerplate,
      skipReason: check.reason,
    })
  }

  // 3. Satırlar ve sayfalar arası hece/tire birleştirme (De-hyphenation)
  mergeSplitWordsAcrossLinesAndPages(preparedPages)

  // 4. Dipnotları gövde metnine akıllıca iliştir (Akıllı Metin İçi Dipnot Okuma)
  for (const page of preparedPages) {
    if (page.isBoilerplate) continue
    inlineFootnotesIntoBodyLines(page.bodyLines, page.footnotes)
  }

  // 5. Geçerli sayfaların satırlarını birleştirip temiz bir kitap metni oluştur
  const resultBlocks: string[] = []

  for (const page of preparedPages) {
    if (page.isBoilerplate) continue

    const pageLines = page.bodyLines.map((l) => (l.isHeading ? `# ${l.text.replace(/^#+\s*/, '')}` : l.text))
    if (pageLines.length > 0) {
      resultBlocks.push(pageLines.join('\n'))
    }
  }

  // 1. KURAL: Satır sonu kontrolü - tire yoksa satırlar \n ile ayrılır, asla .join("") veya .replace(/\n/g, "") yapılmaz
  let cleanedText = dehyphenateText(resultBlocks.join('\n\n').trim())

  // LaTeX matematiksel sembol ve bloklarını doğal metne çevir, kutu çizgilerini temizle
  cleanedText = cleanLatexAndDiagrams(cleanedText)

  // Spaced bileşik kelime tirelerini normalize et ("sosyo - politik" -> "sosyo-politik")
  cleanedText = normalizeCompoundWordHyphens(cleanedText)

  // 3. KURAL: Noktalama ve camelCase Temizliği
  cleanedText = cleanPunctuationAndCamelCase(cleanedText)

  // 4. KURAL: Satır sonlarını korurken ardışık yatay boşlukları tek boşluğa indir
  cleanedText = cleanedText
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')

  // 5. KURAL: Metin işleme hattının (pipeline) en sonunda Türkçe Yapışık Kelime Ayırıcı katmanı
  cleanedText = splitGluedText(cleanedText)
  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length

  if (wordCount < 10) {
    throw new Error('PDF dosyasından okunabilir metin çıkarılamadı.')
  }

  // Belgenin en başındaki ana başlığı / kitap adını tespit et
  let detectedDocTitle = ''
  if (preparedPages.length > 0) {
    const firstPageLines = preparedPages[0].bodyLines
    for (const l of firstPageLines) {
      if (l.isHeading) {
        detectedDocTitle = l.text.replace(/^#+\s*/, '').trim()
        break
      }
      const txt = l.text.trim()
      if (!txt) continue
      const letters = txt.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')
      if (letters.length >= 3 && letters === letters.toUpperCase() && txt.split(/\s+/).length <= 15) {
        detectedDocTitle = txt
        break
      }
    }
  }

  const cleanFilenameTitle = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
  const useDocTitle =
    detectedDocTitle &&
    (cleanFilenameTitle.length <= 4 ||
      /^(gyk|doc|document|file|metin|adsiz|untitled|media[\-_]\w+)/i.test(cleanFilenameTitle))

  const finalTitle = useDocTitle ? detectedDocTitle : cleanFilenameTitle

  return {
    title: finalTitle,
    text: cleanedText,
    totalPages: numPages,
    wordCount,
    skippedPagesCount,
    isOcrUsed,
  }
}
