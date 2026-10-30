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

const KUNYE_KEYWORDS = [
  'isbn',
  'issn',
  'yayınevi',
  'yayınları',
  'yayıncılık',
  'okuyan us',
  'basım',
  'baskı',
  'matbaa',
  'matbaacılık',
  'dizgi ve baskı',
  'yaylacık matbaası',
  'felsefi kitaplar',
  'ofset',
  'sertifika no',
  'telif hakkı',
  'tüm hakları',
  'tıim hakları',
  'all rights reserved',
  'copyright',
  'kapak tasarımı',
  'sayfa düzeni',
  'yayın yönetmeni',
  'orijinal adı',
  'özgün adı',
  'çeviren',
  'çeviri:',
  'editör',
  'dağıtım',
  'kütüphane bilgi kartı',
  'cataloging-in-publication',
  'printed in',
  'tic. ltd',
  'san. ve tic',
  'e-posta:',
  'www.',
  '.com.tr',
]

const TOC_KEYWORDS = [
  'içindekiler',
  'içindeki ler',
  'içindeki  ler',
  'i̇çi̇ndeki̇ ler',
  'table of contents',
  'contents',
  'bölümler',
]

const BACKMATTER_KEYWORDS = [
  'kaynakça',
  'bibliyografya',
  'kaynaklar',
  'references',
  'bibliography',
  'dizin',
  'index',
  'notlar ve kaynaklar',
  'yazarın diğer kitapları',
  'yazarm diğer kitapları',
  'diğer kitapları',
  'yazarın yapıtları',
]

const AUTHOR_BIO_KEYWORDS = [
  'romanlarının yazarıdır',
  'romanının yazarıdır',
  'kitaplarının yazarıdır',
  'yazar hakkında',
  'biyografi',
  'biyografisi',
  'özgeçmiş',
  'kitapları bugüne kadar',
  'dile çevrilen',
  'ödülü\'nü kazanmış',
  'madalyası\'na aday',
  'yazarın hayatı',
  'yazarın yapıtları',
]

const PRAISE_KEYWORDS = [
  'övgüler',
  'hakkında ne dediler',
  'hakkında söylenenler',
  'praise for',
  'acclaim for',
  'sunday times',
  'the guardian',
  'daily telegraph',
  'stylist',
  'bbc radio',
  'new york times',
  'the times',
  'booklist',
  'harika bir hikaye',
  'çok sürükleyici',
  'dahi bir hikaye',
  'duygudaşlığın profesörü',
]

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
  'su',
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
  'işim',
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
  'iz',
  'uz',
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
  /^(ndan|nden|nda|nde|na|ne|nı|ni|nın|nin|nun|nün|nu|nü)$/i,
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
  s = s.replace(/(?<!\w)([bcdfgğhjklmnprsştvyzBCDFGĞHJKLMNPRSŞTVYZ])\s+([aeıioöuü][a-zçğıöşü]{1,6})\b/g, '$1$2')
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
    // 2. Tire + boşluk + küçük harf ([a-zçğıöşü])
    // İstisna: Rakamlar arasındaki tireleri ("2025-2026") ve aralıksız gerçek birleşik kelimeleri ("e-posta", "check-up") korur
    .replace(
      /(?<!\d)([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s+([a-zçğıöşü]{1,15})(?!\d)/g,
      '$1$2',
    )
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
      if (BROKEN_SUFFIX_SET.has(right) || right.length <= 2) {
        return left + right
      }
      return `${left}– ${right}`
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

  // 14. Türkçe OCR "rı" -> "n" ligatür bozulmalarını onar
  t = t.replace(
    /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zçğıöşü]{2,})lan(nda|ndan|nı|na|nın|nm|mız|nız)(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/g,
    (_, stem, tail) => `${stem}ları${tail === 'nm' ? 'nın' : tail}`,
  )
  t = t.replace(
    /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zçğıöşü]{2,})lann(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/g,
    '$1ların',
  )
  t = t.replace(
    /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])(başka|on|bun|şun)lan(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/gi,
    (_, p1) => `${p1}ları`,
  )

  // 15. "ayın" + çoğul isim bozulmasını onar ("ayın insanların" -> "aynı insanların")
  t = t.replace(/\bayın\s+(?=[a-zçğıöşü]+(?:lar|ler|dan|den|nın|nin|ya|ye|a|e)\b)/g, 'aynı ')

  // 16. Fenomenoloji terimi "aktlar" OCR onarımı ("aktıann" -> "aktların")
  t = t.replace(/\baktıa(r|ra|rı|rın|rla|rda|rdan|nn)\b/g, 'aktla$1')
  t = t.replace(/\baktlann\b/g, 'aktların')

  // 17. OCR harf baskı ve dizgi hatalarını onar
  t = t.replace(/rrneğe\b/g, 'rmeğe')
  t = t.replace(/rnek\b/g, 'mek')
  t = t.replace(/araştırınağa\b/g, 'araştırmağa')
  t = t.replace(/fenarnen\b/g, 'fenomen')
  t = t.replace(/kanştır\b/g, 'karıştır')
  t = t.replace(/§/g, 'ş')
  t = t.replace(/(^|\s)!([aeıioöuü][a-zçğıöşü]*)/g, '$1l$2')

  // 18. Tırnak bozulmalarını düzelt
  t = t.replace(/<<|ıı|\(\(/g, '«')
  t = t.replace(/>>|\)\)/g, '»')
  t = t.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]):'(?=\s|$)/g, '$1."')
  t = t.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]);'(?=\s|$)/g, '$1,"')

  // 19. Bitişik tırnak ve diyalog başlangıçlarını ayır ("sayılır:'"Evet" -> 'sayılır." "Evet')
  t = t.replace(/([.:!?…])(["”’»]+)([A-ZÇĞİÖŞÜ"“‘])/g, '$1$2 $3')
  t = t.replace(/([:;])'([A-ZÇĞİÖŞÜ])/g, '$1" $2')

  return t.trim()
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
      return leadingPrefix + prefix + cleanNext
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
    return cleanPrefix + cleanNext
  }

  // 3. Kesme işareti ile bölünen özel isim veya ek ("Türkiye’" + "nin", "Nora'" + "ya")
  const apostropheMatch = lastWord.match(/^(\S*[a-zA-ZçğıöşüÇĞİÖŞÜ0-9]['’‘\`])$/)
  if (
    apostropheMatch &&
    /^[a-zçğıöşü]{1,10}(?:['"”’\.,;:\!\?\)\]\¹²³⁴⁵⁶⁷⁸⁹⁰\*†‡]|\[\d+\])*$/.test(cleanNext)
  ) {
    return apostropheMatch[1] + cleanNext
  }

  // 4. Tire düşmüş ama ikinci parça tek başına kelime olamayacak bir ekse (BROKEN_SUFFIX_SET veya NON_STANDALONE_WORD_B_PATTERNS)
  if (
    /[a-zçğıöşü]$/.test(lastWord) &&
    (BROKEN_SUFFIX_SET.has(cleanNextCore.toLowerCase()) ||
      NON_STANDALONE_WORD_B_PATTERNS.some((rx) => rx.test(cleanNextCore)))
  ) {
    return lastWord + cleanNext
  }

  // 5. Tire düşmüş hece/kök bölmesi (ka + sabasındaki, Ba + yan, gü + zelce, dav + ranan, be + bekken, sö + zünü, bur + nunu, bi + rinin, söy + lediği, El + bette, parmağıy + la, rağ + men, ça + larken, ger + ginlik)
  const lowerA = lastWord.toLowerCase().replace(/[^a-zçğıöşü]/g, '')
  if (
    /^[a-zçğıöşü]/.test(cleanNextCore) &&
    !VALID_STANDALONE_TURKISH_WORDS.has(lowerA) &&
    (KNOWN_SPLIT_PREFIXES.has(lowerA) || lowerA.length <= 2)
  ) {
    return lastWord + cleanNext
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

  for (let i = 0; i < sequence.length - 1; i++) {
    const lineA = sequence[i]
    const lineB = sequence[i + 1]

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
 * Bir satırın bölüm veya konu başlığı olup olmadığını tespit eder.
 */
function isHeadingLine(lineObj: PdfLine, medianFontSize: number, lineIdx: number, allLines: PdfLine[]): boolean {
  const t = lineObj.text.trim()
  if (!t || t.length > 95) return false

  const words = t.split(/\s+/)
  if (words.length > 12) return false

  // 1. Markdown başlığı (# Başlık)
  if (/^#{1,4}\s+\S+/.test(t)) return true

  // 2. Açık bölüm kelimeleri (BÖLÜM 1, 1. Bölüm, GİRİŞ, ÖNSÖZ, vb.)
  if (
    /^(?:(\d{1,2}|[IVXLC]{1,5}|birinci|ikinci|üçüncü|dördüncü|beşinci)[\.\-\s]+)?(bölüm|kısım|fasıl|chapter|part|section|giriş|önsöz|sunuş|sonsöz|sonuç|epilog|prolog)(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/i.test(
      t,
    ) &&
    words.length <= 9 &&
    !/[.!?]$/.test(t)
  ) {
    return true
  }

  // 3. Büyük font boyutu
  if (lineObj.fontSize && medianFontSize && lineObj.fontSize >= medianFontSize * 1.18 && words.length <= 10) {
    return true
  }

  // 4. Tamamı BÜYÜK HARF olan kısa satırlar
  const lettersOnly = t.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')
  if (lettersOnly.length >= 4 && lettersOnly === lettersOnly.toUpperCase() && words.length <= 8 && !/[.,;:]$/.test(t)) {
    return true
  }

  // 5. Roma rakamı veya numara ile başlayan kısa başlık ("I. Modern Bilimin Doğuşu")
  if (/^([IVXLC]{1,5})\.\s+[A-ZÇĞİÖŞÜ]/.test(t) && words.length <= 8 && !/[.!?]$/.test(t)) {
    return true
  }

  // 6. Sayfanın ilk satırındaki Title Case başlıklar
  if (
    lineIdx === 0 &&
    words.length >= 1 &&
    words.length <= 8 &&
    t.length <= 58 &&
    !/[.!?,;:\-\uFFFD\u00AD"“”]$/.test(t) &&
    /^[A-ZÇĞİÖŞÜ]/.test(t)
  ) {
    const significantWords = words.filter(
      (w) => !TITLE_CASE_STOPWORDS.has(w.toLowerCase().replace(/[^a-zçğıöşü]/g, '')),
    )
    const capitalizedCount = significantWords.filter((w) =>
      /^[A-ZÇĞİÖŞÜ0-9]/.test(w.replace(/^['"“‘\(]+/, '')),
    ).length

    const nextLine = allLines[lineIdx + 1]
    const nextStartsSentence = !nextLine || /^[A-ZÇĞİÖŞÜ"“‘'\-\–\—]/.test(nextLine.text.trim())

    if (significantWords.length >= 1 && capitalizedCount === significantWords.length && nextStartsSentence) {
      return true
    }
  }

  return false
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
        text: cleanIntraLineHyphens(fullFnText.replace(/\s+/g, ' ').trim()),
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
 * Bir sayfanın künye, yazar bio, içindekiler, önsöz veya kaynakça olup olmadığını analiz eder
 */
export function classifyPageBoilerplate(
  page: { pageNumber: number; lines: PdfLine[] },
  totalPages: number,
  context: { mainContentStarted?: boolean; inPreface?: boolean } = {},
): { isBoilerplate: boolean; reason: string; inPreface?: boolean } {
  let { mainContentStarted = false, inPreface = false } = context
  const rawLines = page.lines.map((l) => collapseSpacedLetters(l.text.trim())).filter(Boolean)
  const fullText = rawLines.join('\n')
  const lower = fullText.toLowerCase().replace(/\u0307/g, '')
  const words = fullText.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  // 1. Tamamen boş sayfalar
  if (wordCount === 0) {
    return { isBoilerplate: true, reason: 'Boş Sayfa', inPreface: false }
  }

  // 2. OCR gürültüsü ve halüsinasyon kontrolü
  if (isOcrGarbage(fullText)) {
    return { isBoilerplate: true, reason: 'Görsel / OCR Gürültüsü', inPreface: false }
  }

  // 3. Ana metin başlamadan önce 1-4 kelimelik başlık/numara sayfaları
  if (!mainContentStarted && wordCount < 5) {
    return { isBoilerplate: true, reason: 'Ön Sayfa (Boş / Başlık)', inPreface }
  }

  // 4. Ana metin başladıktan sonra sadece tek bir sayı veya noktalama içeren sayfalar
  if (mainContentStarted && wordCount <= 2 && /^\d{1,4}\.?$/.test(fullText.trim())) {
    return { isBoilerplate: true, reason: 'Yalnız Sayfa Numarası', inPreface: false }
  }

  const topLinesText = rawLines.slice(0, 4).join(' ').toLowerCase().replace(/\u0307/g, '')
  const isChapterStart =
    /^(birinci\s+bölüm|1\.\s*bölüm|bölüm\s*1|kısım\s*1|probleme\s*giriş|1\s*[\-\.]\s*değer|giriş|chapter\s*1)(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/i.test(
      rawLines[0]?.toLowerCase().replace(/\u0307/g, '') || '',
    ) ||
    /^(birinci\s+bölüm|1\.\s*bölüm|bölüm\s*1|kısım\s*1|probleme\s*giriş|1\s*[\-\.]\s*değer|chapter\s*1)/i.test(
      topLinesText,
    )

  if (isChapterStart) {
    inPreface = false
  }

  // 5. Önsöz / Sunuş Filtresi (Kitap başındaki önsöz ve devam sayfalarını otomatik atla)
  if (page.pageNumber <= Math.min(25, Math.floor(totalPages * 0.25)) && !mainContentStarted) {
    const isPrefaceStart =
      /^(önsöz|sunuş|yazarın\s*önsözü|çevirenin\s*önsözü|takdim|foreword|preface)(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/i.test(
        rawLines[0]?.toLowerCase().replace(/\u0307/g, '') || '',
      ) ||
      /(?<![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])(önsöz|sunuş|yazarın\s*önsözü)(?![a-zA-ZçğıöşüÇĞİÖŞÜ0-9])/i.test(topLinesText) ||
      (page.pageNumber <= 9 && (lower.includes('önsöz') || lower.includes('yönelmemin sebebi') || lower.includes('böyle bir problemi')))

    if (isPrefaceStart && !isChapterStart) {
      inPreface = true
    }

    if (inPreface && !isChapterStart) {
      return { isBoilerplate: true, reason: 'Önsöz / Sunuş (Ön Bilgi)', inPreface: true }
    }
  }

  // 6. İçindekiler Tablosu
  const firstLinesLower = rawLines
    .slice(0, 4)
    .map((l) => l.toLowerCase().replace(/\u0307/g, ''))
    .join(' ')
  const hasTocHeader = TOC_KEYWORDS.some((kw) => {
    const cleanKw = kw.toLowerCase().replace(/\u0307/g, '')
    return lower.includes(cleanKw) || firstLinesLower.includes(cleanKw)
  })
  const dottedOrNumberedLines = rawLines.filter((l) =>
    /(\.{2,}|\s{2,}|[-–—]{1,2})\s*\d{1,4}$|\.{2,}\d{1,4}$|\b\d{1,3}\s*[-–—]+\s*\d{1,3}\b/.test(l),
  ).length

  if (
    (hasTocHeader && dottedOrNumberedLines >= 1) ||
    (rawLines.length >= 4 && dottedOrNumberedLines / rawLines.length >= 0.4)
  ) {
    return { isBoilerplate: true, reason: 'İçindekiler Tablosu', inPreface: false }
  }

  // 7. Künye / Yayınevi ve Basım Bilgileri
  if (page.pageNumber <= Math.min(20, Math.max(5, totalPages)) || (totalPages >= 5 && page.pageNumber >= totalPages - 2)) {
    let kunyeHits = 0
    for (const kw of KUNYE_KEYWORDS) {
      if (lower.includes(kw)) kunyeHits++
    }
    if (fullText.includes('©')) kunyeHits++
    if (/978[\-\s]?\d/.test(fullText)) kunyeHits += 2
    if (/sertifika\s*no|baskı\s*ve\s*cilt|basım\s*yeri|özgün\s*(adı|ismi)|t[üıi]m\s*haklar[ıi]/i.test(fullText)) kunyeHits += 2

    if (kunyeHits >= 2 && wordCount < 380 && !isChapterStart) {
      return { isBoilerplate: true, reason: 'Künye / Yayınevi ve Telif Bilgileri', inPreface: false }
    }
  }

  // 8. Kitap başındaki ön sayfalar (Kapak, yazar biyografisi, basın övgüleri, ithaf, epigraf)
  const isFrontZone = totalPages >= 5 && page.pageNumber <= Math.min(25, Math.floor(totalPages * 0.25))
  if (isFrontZone && !mainContentStarted && !isChapterStart) {
    // Yazar Biyografisi kontrolü
    const bioHits = AUTHOR_BIO_KEYWORDS.filter((kw) => lower.includes(kw)).length
    if (bioHits >= 1 || (lower.includes('@') && (lower.includes('roman') || lower.includes('kitap') || lower.includes('yazar')))) {
      return { isBoilerplate: true, reason: 'Yazar Biyografisi', inPreface: false }
    }

    // Basın ve Okur Övgüleri
    const praiseHits = PRAISE_KEYWORDS.filter((kw) => lower.includes(kw)).length
    if (praiseHits >= 2 || (fullText.includes('"') && praiseHits >= 1 && wordCount < 300)) {
      return { isBoilerplate: true, reason: 'Basın ve Okur Övgüleri', inPreface: false }
    }

    // Kısa ön sayfalar (Yarım başlık, ithaf, epigraf vb.)
    if (wordCount < 65) {
      return { isBoilerplate: true, reason: 'Ön Sayfa (Kapak / İthaf / Tanıtım)', inPreface: false }
    }
  }

  // 9. Son sayfalarda Kaynakça / Dizin / Yazarın Diğer Kitapları
  if (totalPages >= 5 && page.pageNumber >= Math.max(1, totalPages - 10)) {
    const isBackHeader = BACKMATTER_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase().replace(/\u0307/g, '')))
    if (
      isBackHeader &&
      (lower.includes('pp.') ||
        lower.includes('s.') ||
        lower.includes('19') ||
        lower.includes('20') ||
        lower.includes('kitap') ||
        lower.includes('yayın'))
    ) {
      return { isBoilerplate: true, reason: 'Kaynakça / Yazarın Kitapları / Dizin', inPreface: false }
    }
  }

  return { isBoilerplate: false, reason: 'Ana Metin', inPreface: false }
}

/**
 * PDF.js metin parçalarını Y ve X koordinatlarına göre sıralayıp satırlara gruplar.
 * Glifler arası yatay boşluğu kontrol ederek "g e l e c e k" gibi harf ayrılmalarını engeller.
 */
function groupPdfItemsIntoLines(items: any[], pageHeight: number, pageNumber: number): PdfLine[] {
  if (!items || !items.length) return []

  const heights = items
    .filter((it) => it.str && it.str.trim())
    .map((it) => Math.abs(it.transform?.[3]) || it.height || 12)
    .sort((a, b) => a - b)
  const medianH = heights.length ? heights[Math.floor(heights.length / 2)] : 12

  const validItems = items
    .filter((it) => it.str && it.str.trim().length > 0)
    .map((it) => {
      const x = it.transform?.[4] || 0
      const y = it.transform?.[5] || 0
      const fontSize = Math.abs(it.transform?.[3]) || it.height || 12
      return {
        str: it.str,
        x,
        y,
        width: it.width || 0,
        fontSize,
        yFromTop: pageHeight ? pageHeight - y : 0,
      }
    })

  validItems.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 4) {
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

    if (yDiff <= Math.max(4, currentLine.maxFontSize * 0.45) || isSuperscript) {
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

      // 1. KURAL: PDF.js (getTextContent) parçaları (items) birleştirilirken
      // parça sonundaki tire ("-" veya "\u00AD") ile biten metinden sonra gelen
      // ve küçük harfle başlayan parçayı araya boşluk koymadan ve tireyi silerek birleştir
      const prevEndsWithHyphen = /([a-zA-ZçğıöşüÇĞİÖŞÜ0-9])[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s*$/.test(text)
      const currStartsWithLower = /^\s*([a-zçğıöşü])/.test(curr.str)

      if (prevEndsWithHyphen && currStartsWithLower) {
        text = text.replace(/[\-\u00AD\uFFFD\u2010\u2011\u2012\u2212\u00AC~]\s*$/, '') + curr.str.replace(/^\s+/, '')
        continue
      }

      const isBracketFn = /^\[\d+\]$/.test(curr.str)
      const isTrailingPunctOrHyphen = /^[\-\u00AD\uFFFD\u2010\u2011\u2012\u2013\u00AC'’”\)\]\.,;:\!\?]+$/.test(
        curr.str.trim(),
      )
      const prevEndsWithJoiner = /['’‘“\(\[\-\u00AD\uFFFD\u2010\u2011]$/.test(prev.str.trim())

      let hasHorizontalGap = true
      if (prev.width && prev.width > 0) {
        const gap = curr.x - (prev.x + prev.width)
        // Yalnızca gerçek glif kerning ayrılmalarında (< 0.7 pt) yapay boşluğu engelle.
        // İki yana yaslı metinlerde normal kelime aralığını asla ezme (örn: kırışmış oval, bütün okulda).
        const threshold = Math.min(0.7, lineFontSize * 0.06)
        if (gap < threshold) {
          hasHorizontalGap = false
        }
      }

      if (
        hasHorizontalGap &&
        !isBracketFn &&
        !isTrailingPunctOrHyphen &&
        !prevEndsWithJoiner &&
        !text.endsWith(' ') &&
        !curr.str.startsWith(' ')
      ) {
        text += ' '
      }
    }
    text += curr.str
  }

  return {
    text: cleanIntraLineHyphens(text.replace(/\s+/g, ' ').trim()),
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
      l.isHeading = isHeadingLine(l, medianFont, idx, filteredLines)
    })

    // Dipnotları ayıkla
    const { bodyLines, footnotes } = extractFootnotesFromLines(filteredLines, medianFont)

    // Sayfa sonundaki kelimeye yapışmış sayfa numarasını onar ('farklı de7' -> 'farklı de-')
    if (bodyLines.length > 0) {
      const lastLine = bodyLines[bodyLines.length - 1]
      const m = lastLine.text.match(/([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})(\d{1,3})\.?$/)
      if (m) {
        const num = parseInt(m[2], 10)
        if (Math.abs(num - page.pageNumber) <= 2) {
          lastLine.text = lastLine.text.slice(0, lastLine.text.length - m[2].length) + '-'
        }
      }
    }

    // Künye ve gereksiz sayfa kontrolü
    const check = classifyPageBoilerplate(
      { pageNumber: page.pageNumber, lines: bodyLines },
      numPages,
      { mainContentStarted, inPreface },
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
      bodyLines,
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

  const cleanedText = dehyphenateText(resultBlocks.join('\n\n').trim())
  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length

  if (wordCount < 10) {
    throw new Error('PDF dosyasından okunabilir metin çıkarılamadı.')
  }

  const cleanTitle = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')

  return {
    title: cleanTitle,
    text: cleanedText,
    totalPages: numPages,
    wordCount,
    skippedPagesCount,
    isOcrUsed,
  }
}
