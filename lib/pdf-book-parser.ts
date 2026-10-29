/**
 * Akıllı PDF, Kitap ve OCR Ayrıştırıcı (Smart PDF & Book Parser)
 *
 * Özellikler:
 * 1. %100 İstemci Taraflı PDF.js ve Tesseract.js entegrasyonu (Vercel SSR uyumlu dinamik yükleyici).
 * 2. Satır sonu hece bölme ve tire (-, \u00AD, \uFFFD) onarımı (De-hyphenation).
 * 3. Kitap ön sayfalarındaki basımevi künyesi (ISBN, Matbaa, Sertifika No), içindekiler ve arka kaynakçayı otomatik filtreleme.
 * 4. Taranmış (resimli) PDF'ler için otomatik Tesseract OCR fallback desteği.
 */

export type ExtractedBook = {
  title: string
  text: string
  totalPages: number
  wordCount: number
  skippedPagesCount: number
  isOcrUsed: boolean
}

// Künye / Telif / Yayıncı sayfalarını tespit eden anahtar kelimeler
const KUNYE_KEYWORDS = [
  'isbn',
  'issn',
  'yayınevi',
  'yayınları',
  'yayıncılık',
  'sertifika no',
  'telif hakkı',
  'all rights reserved',
  'copyright',
  'kapak tasarımı',
  'sayfa düzeni',
  'baskı ve cilt',
  'matbaa',
  'matbaacılık',
  'ofset',
  'orijinal adı',
  'özgün adı',
  'kütüphane bilgi kartı',
  'printed in',
  'san. ve tic',
  'basım:',
  'baskı:',
]

const TOC_KEYWORDS = ['içindekiler', 'table of contents', 'contents', 'bölümler']
const BACKMATTER_KEYWORDS = ['kaynakça', 'bibliyografya', 'references', 'bibliography', 'dizin', 'index']

// PDF.js kütüphanesini tarayıcıda dinamik yükle (Next.js SSR hatasını engeller)
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

// Tesseract.js kütüphanesini tarayıcıda dinamik yükle (Yalnızca taranmış PDF gerekirse yüklenir)
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
 * Satır sonu ve sayfa sonundaki tireleme (hyphenation) hatalarını birleştirir.
 * Örn: "ge- \n lecek" -> "gelecek"
 */
export function repairHyphenatedWords(rawText: string): string {
  if (!rawText) return ''

  return rawText
    // Yumuşak tire, bozuk UTF-8 karakterleri
    .replace(/\u00AD/g, '-')
    .replace(/\uFFFD/g, '')
    // Satır sonu tire birleştirme
    .replace(/([a-zA-ZğüşıöçĞÜŞİÖÇ0-9])[-–—]\s*[\r\n]+\s*([a-zA-ZğüşıöçĞÜŞİÖÇ])/g, '$1$2')
    // Sayfa geçişindeki tire birleştirme
    .replace(/([a-zA-ZğüşıöçĞÜŞİÖÇ0-9])[-–—]\s*(--- Sayfa \d+ ---\s*)+([a-zA-ZğüşıöçĞÜŞİÖÇ])/g, '$1$3')
    // Fazla boşlukları toparla
    .replace(/[ \t]+/g, ' ')
}

/**
 * Sayfanın basımevi künyesi veya kaynakça olup olmadığını analiz eder
 */
function isBoilerplatePage(pageText: string, pageNum: number, totalPages: number): { skip: boolean; reason: string } {
  const lower = pageText.toLowerCase()
  const wordCount = pageText.split(/\s+/).filter(Boolean).length

  // Çok boş sayfalar (sayfa no hariç 3-4 kelime)
  if (wordCount < 6) {
    return { skip: true, reason: 'Boş veya kapak sayfası' }
  }

  // İlk 7 sayfa içinde künye araması
  if (pageNum <= Math.min(8, Math.ceil(totalPages * 0.2))) {
    const kunyeScore = KUNYE_KEYWORDS.filter((k) => lower.includes(k)).length
    if (kunyeScore >= 3 || (kunyeScore >= 2 && wordCount < 140)) {
      return { skip: true, reason: 'Basımevi ve Telif Künyesi' }
    }

    const tocScore = TOC_KEYWORDS.filter((k) => lower.includes(k)).length
    if (tocScore >= 1 && (lower.includes('....') || /\d+\s*$/.test(pageText))) {
      return { skip: true, reason: 'İçindekiler Tablosu' }
    }
  }

  // Son %10'luk kısımda kaynakça araması
  if (pageNum >= Math.max(1, totalPages - 8)) {
    const backScore = BACKMATTER_KEYWORDS.filter((k) => lower.includes(k)).length
    if (backScore >= 1 && (lower.includes('19') || lower.includes('20') || lower.includes('pp.') || lower.includes('s.'))) {
      return { skip: true, reason: 'Kaynakça / Dizin' }
    }
  }

  return { skip: false, reason: 'Ana Metin' }
}

/**
 * PDF dosyasını (ArrayBuffer veya File) akıllıca ayrıştırır.
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

  let isOcrUsed = false
  let skippedPagesCount = 0
  const extractedPages: { pageNum: number; text: string; skipped: boolean }[] = []

  let tesseractWorker: any = null

  try {
    for (let i = 1; i <= numPages; i++) {
      onProgress?.(`Sayfa ${i} / ${numPages} taranıyor...`)

      const page = await pdfDoc.getPage(i)
      const textContent = await page.getTextContent()

      let pageRawText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ')
        .trim()

      // Eğer sayfa dijital metin içermiyorsa (Taranmış fotoğraf PDF)
      if (pageRawText.split(/\s+/).filter(Boolean).length < 8) {
        onProgress?.(`Sayfa ${i} taranmış resim algılandı, OCR yapılıyor...`)
        isOcrUsed = true

        if (!tesseractWorker) {
          const Tesseract = await loadTesseract()
          tesseractWorker = await Tesseract.createWorker('tur+eng')
        }

        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise
          const ocrResult = await tesseractWorker.recognize(canvas)
          pageRawText = (ocrResult.data && ocrResult.data.text) ? ocrResult.data.text : ''
        }
      }

      // Künye ve gereksiz sayfa kontrolü
      const check = isBoilerplatePage(pageRawText, i, numPages)
      if (check.skip) {
        skippedPagesCount++
        extractedPages.push({ pageNum: i, text: '', skipped: true })
      } else {
        extractedPages.push({ pageNum: i, text: pageRawText, skipped: false })
      }
    }
  } finally {
    if (tesseractWorker) {
      await tesseractWorker.terminate().catch(() => {})
    }
  }

  // Geçerli sayfaları birleştir
  const validPagesText = extractedPages
    .filter((p) => !p.skipped)
    .map((p) => p.text)
    .join('\n\n')

  const cleanedText = repairHyphenatedWords(validPagesText).trim()
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
