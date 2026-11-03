'use client'

import { AlertCircle, BookOpen, Clipboard, FileText, Link2, Loader2, Sparkles, Upload, Video, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SAMPLE_TEXT, tokenize } from '@/lib/rsvp'
import { CURATED_LIBRARY } from '@/lib/curated-library'
import { fetchArticleFromUrl } from '@/lib/article-parser'
import { fetchYouTubeTranscript } from '@/lib/youtube-parser'
import { parsePdfDocument } from '@/lib/pdf-book-parser'
import { useFocusTrap } from '@/lib/use-focus-trap'
import { cn } from '@/lib/utils'

type TextSheetProps = {
  open: boolean
  initialText: string
  onClose: () => void
  onApply: (text: string, title?: string) => void
}

type TabType = 'text' | 'library' | 'pdf' | 'url' | 'youtube'

export function TextSheet({ open, initialText, onClose, onApply }: TextSheetProps) {
  if (!open) return null
  return <TextSheetBody initialText={initialText} onClose={onClose} onApply={onApply} />
}

function TextSheetBody({ initialText, onClose, onApply }: Omit<TextSheetProps, 'open'>) {
  const [activeTab, setActiveTab] = useState<TabType>('text')
  const [draft, setDraft] = useState(initialText)
  const [url, setUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useFocusTrap<HTMLDivElement>(true)
  const count = useMemo(() => tokenize(draft).length, [draft])

  // ESC ile kapatma
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, loading])

  // Manuel Pano Yapıştırma
  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const clip = (await navigator.clipboard.readText()).trim()
        if (clip) {
          setDraft(clip)
        }
      }
    } catch {
      // Tarayıcı pano izni kısıtlıysa kullanıcı doğrudan metin alanına yapıştırabilir
    }
  }

  // 1. Web & Haber Linki Çekici
  const handleFetchArticle = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const cleanUrl = url.trim()
    if (!cleanUrl || loading) return

    setLoading(true)
    setErrorMessage('')
    setStatusMessage('Haber bağlantısı kuruluyor...')

    try {
      const article = await fetchArticleFromUrl(cleanUrl, (msg) => setStatusMessage(msg))
      setDraft(article.text)
      setStatusMessage('')
      onApply(article.text, article.title)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Haber metni çekilirken bir hata oluştu.')
      setStatusMessage('')
    } finally {
      setLoading(false)
    }
  }

  // 2. YouTube Transkript Çekici
  const handleFetchYouTube = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const cleanUrl = youtubeUrl.trim()
    if (!cleanUrl || loading) return

    setLoading(true)
    setErrorMessage('')
    setStatusMessage('YouTube altyazıları taranıyor...')

    try {
      const yt = await fetchYouTubeTranscript(cleanUrl, (msg) => setStatusMessage(msg))
      setDraft(yt.text)
      setStatusMessage('')
      onApply(yt.text, yt.title)
    } catch (err: any) {
      setErrorMessage(err?.message || 'YouTube transkripti çekilemedi.')
      setStatusMessage('')
    } finally {
      setLoading(false)
    }
  }

  // 3. PDF Yükleme ve Akıllı Kitap Ayrıştırma
  const handlePdfUpload = async (file: File) => {
    if (!file || loading) return

    setLoading(true)
    setErrorMessage('')
    setStatusMessage('PDF hazırlanıyor...')

    try {
      const book = await parsePdfDocument(file, file.name, (msg) => setStatusMessage(msg))
      setDraft(book.text)
      setStatusMessage('')
      onApply(book.text, book.title)
    } catch (err: any) {
      setErrorMessage(err?.message || 'PDF ayrıştırılırken bir hata oluştu.')
      setStatusMessage('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6 landscape-short:items-center landscape-short:p-2">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Kapat"
        onClick={loading ? undefined : onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-md animate-in fade-in duration-300"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="text-sheet-title"
        className="panel panel-solid relative flex max-h-[90dvh] w-full max-w-2xl flex-col gap-3 overflow-y-auto overscroll-contain touch-pan-y rounded-b-none p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-8 fade-in duration-300 *:shrink-0 sm:rounded-b-(--panel-radius) sm:p-5 landscape-short:max-h-[calc(100dvh-1rem)] landscape-short:gap-2 landscape-short:rounded-b-(--panel-radius) landscape-short:p-3 landscape-short:pb-3"
      >
        {/* Üst Başlık ve Kapat Butonu */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="text-sheet-title" className="text-base font-semibold tracking-tight">
              Okuma & İçerik Merkezi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ctl size-9 rounded-lg disabled:opacity-40"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 5 Sekmeli Seçim Çubuğu: Metin, Hazır Seçkiler, PDF, Link, YouTube */}
        <div role="tablist" aria-label="İçerik kaynağı" className="flex items-center gap-1 overflow-x-auto rounded-xl bg-foreground/5 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'text'}
            onClick={() => setActiveTab('text')}
            className={cn(
              'ctl h-8 flex-1 min-w-[70px] gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors',
              activeTab === 'text' ? 'ctl-primary shadow-sm' : 'bg-transparent text-muted-foreground',
            )}
          >
            <FileText className="size-3.5" />
            <span>Metin</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'library'}
            onClick={() => setActiveTab('library')}
            className={cn(
              'ctl h-8 flex-1 min-w-[80px] gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors',
              activeTab === 'library' ? 'ctl-primary shadow-sm' : 'bg-transparent text-muted-foreground',
            )}
          >
            <BookOpen className="size-3.5" />
            <span>Seçkiler</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pdf'}
            onClick={() => setActiveTab('pdf')}
            className={cn(
              'ctl h-8 flex-1 min-w-[65px] gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors',
              activeTab === 'pdf' ? 'ctl-primary shadow-sm' : 'bg-transparent text-muted-foreground',
            )}
          >
            <Upload className="size-3.5" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'url'}
            onClick={() => setActiveTab('url')}
            className={cn(
              'ctl h-8 flex-1 min-w-[65px] gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors',
              activeTab === 'url' ? 'ctl-primary shadow-sm' : 'bg-transparent text-muted-foreground',
            )}
          >
            <Link2 className="size-3.5" />
            <span>Link</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'youtube'}
            onClick={() => setActiveTab('youtube')}
            className={cn(
              'ctl h-8 flex-1 min-w-[80px] gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors',
              activeTab === 'youtube' ? 'ctl-primary shadow-sm' : 'bg-transparent text-muted-foreground',
            )}
          >
            <Video className="size-3.5" />
            <span>YouTube</span>
          </button>
        </div>

        {/* Durum / İlerleme Çubuğu */}
        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-xs text-primary font-medium animate-pulse"
          >
            <Loader2 className="size-3.5 animate-spin shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Hata Bildirimi */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive animate-in fade-in"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="leading-snug whitespace-pre-line">{errorMessage}</span>
              {activeTab === 'youtube' && (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('')
                    setActiveTab('text')
                  }}
                  className="mt-1 self-start text-[11px] font-semibold underline underline-offset-2 hover:opacity-80"
                >
                  Metin Sekmesine Geç →
                </button>
              )}
            </div>
          </div>
        )}

        {/* SEKME 1: METİN YAPIŞTIR */}
        {activeTab === 'text' && (
          <div className="flex flex-col gap-2.5">
            <label htmlFor="reader-text" className="sr-only">
              Okunacak metin
            </label>
            <textarea
              id="reader-text"
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Metninizi buraya yapıştırın veya yazın..."
              rows={6}
              className="w-full resize-none rounded-2xl border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm landscape-short:h-[max(5rem,calc(100dvh-12rem))] landscape-short:p-3"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(SAMPLE_TEXT)}
                  className="ctl h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Örnek Metin
                </button>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="ctl h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 transition-colors"
                  title="Panodaki metni yapıştır"
                >
                  <Clipboard className="size-3.5" />
                  <span>Panodan Yapıştır</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {count} kelime
                </span>
                <button
                  type="button"
                  onClick={() => onApply(draft)}
                  disabled={count === 0}
                  className="ctl ctl-primary h-9 rounded-lg px-4 text-xs sm:text-sm font-semibold disabled:opacity-40"
                >
                  Metni Oku
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEKME 2: HAZIR SEÇKİLER KÜTÜPHANESİ */}
        {activeTab === 'library' && (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs text-muted-foreground">
              Göz kaslarını dinlendiren, 1 dakikalık klasik edebiyat, felsefe ve bilişsel sinirbilim seçkileri:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CURATED_LIBRARY.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background/90 p-3.5 shadow-xs hover:border-primary/50 transition-all text-left group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {item.category}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {item.wordCount} kelime • ~{item.estimatedSeconds} sn
                      </span>
                    </div>
                    <h3 className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] font-medium text-foreground/75">
                      {item.author}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(item.text)
                        onApply(item.text, item.title)
                      }}
                      className="ctl ctl-primary flex h-8 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    >
                      <Sparkles className="size-3" />
                      <span>Bu Seçkiyi Oku</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEKME 3: PDF YÜKLE */}
        {activeTab === 'pdf' && (
          <div className="flex flex-col gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handlePdfUpload(e.target.files[0])
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handlePdfUpload(e.dataTransfer.files[0])
                }
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors landscape-short:p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isDragOver ? 'border-primary bg-primary/5' : 'border-border/80 hover:border-primary/60 hover:bg-foreground/5',
              )}
            >
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">PDF Dosyası Seçin veya Buraya Sürükleyin</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Satır sonu hecelemeler birleştirilir, basımevi künyesi ve kaynakça sayfaları otomatik atlanır.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* SEKME 4: SİTE & HABER LİNKİ */}
        {activeTab === 'url' && (
          <form onSubmit={handleFetchArticle} className="flex flex-col gap-2.5">
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  if (errorMessage) setErrorMessage('')
                }}
                disabled={loading}
                placeholder="https://... (Örn: BBC, Sözcü, Milliyet, Medium makalesi)"
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Reklamlar, menüler ve yorumlar otomatik ayıklanır; ana makale kesintisiz damıtılır.
              </span>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="ctl ctl-primary h-10 rounded-lg px-4 text-xs sm:text-sm font-semibold gap-1.5 disabled:opacity-40"
              >
                <Sparkles className="size-3.5" />
                <span>Linki Çek ve Oku</span>
              </button>
            </div>
          </form>
        )}

        {/* SEKME 5: YOUTUBE TRANSKRİPT */}
        {activeTab === 'youtube' && (
          <form onSubmit={handleFetchYouTube} className="flex flex-col gap-2.5">
            <div className="relative">
              <Video className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value)
                  if (errorMessage) setErrorMessage('')
                }}
                disabled={loading}
                placeholder="https://www.youtube.com/watch?v=... veya youtu.be/..."
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Videodaki konuşmalar yazıya dökülür; zaman kodları ve müzikler temizlenir.
              </span>
              <button
                type="submit"
                disabled={loading || !youtubeUrl.trim()}
                className="ctl ctl-primary h-10 rounded-lg px-4 text-xs sm:text-sm font-semibold gap-1.5 disabled:opacity-40"
              >
                <Sparkles className="size-3.5" />
                <span>Transkripti Çek ve Oku</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
