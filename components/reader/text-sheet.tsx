'use client'

import {
  AlertCircle,
  BookOpen,
  Clipboard,
  FileText,
  Globe,
  Link2,
  Loader2,
  Sparkles,
  Upload,
  Video,
  X,
} from 'lucide-react'
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

const TABS = [
  { id: 'text', label: 'Metin & PDF', icon: FileText },
  { id: 'url', label: 'Web & YouTube', icon: Link2 },
  { id: 'library', label: 'Seçkiler', icon: BookOpen },
] as const

type TabType = (typeof TABS)[number]['id']

export function TextSheet({ open, initialText, onClose, onApply }: TextSheetProps) {
  if (!open) return null
  return <TextSheetBody initialText={initialText} onClose={onClose} onApply={onApply} />
}

function TextSheetBody({ initialText, onClose, onApply }: Omit<TextSheetProps, 'open'>) {
  const [activeTab, setActiveTab] = useState<TabType>('text')
  const [draft, setDraft] = useState(initialText)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useFocusTrap<HTMLDivElement>(true)
  const count = useMemo(() => tokenize(draft).length, [draft])

  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab)

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
      // Tarayıcı pano izni kısıtlıysa kullanıcı doğrudan alana yapıştırabilir
    }
  }

  // Birleşik Web & YouTube Çekici (Otomatik algılama)
  const handleFetchWebOrYouTube = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const cleanUrl = url.trim()
    if (!cleanUrl || loading) return

    setLoading(true)
    setErrorMessage('')

    const isYouTube = cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')
    setStatusMessage(isYouTube ? 'YouTube altyazıları taranıyor...' : 'Web bağlantısı kuruluyor...')

    try {
      if (isYouTube) {
        const yt = await fetchYouTubeTranscript(cleanUrl, (msg) => setStatusMessage(msg))
        setDraft(yt.text)
        setStatusMessage('')
        onApply(yt.text, yt.title)
      } else {
        const article = await fetchArticleFromUrl(cleanUrl, (msg) => setStatusMessage(msg))
        setDraft(article.text)
        setStatusMessage('')
        onApply(article.text, article.title)
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          (isYouTube ? 'YouTube transkripti çekilemedi.' : 'Web makalesi damıtılırken bir hata oluştu.'),
      )
      setStatusMessage('')
    } finally {
      setLoading(false)
    }
  }

  // PDF Yükleme ve Akıllı Kitap Ayrıştırma
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Metin ve İçerik Merkezi"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="panel panel-solid relative flex w-full max-w-lg sm:max-w-xl flex-col gap-3 rounded-3xl p-4 sm:p-5 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden"
      >
        {/* Üst Kısım: Sekme Çubuğu ve Kapat Butonu (Başlık satırı yok) */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div
            role="tablist"
            aria-label="İçerik kaynağı"
            className="flex items-center gap-1 p-1 rounded-2xl bg-foreground/5 border border-border/60 flex-1 select-none"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setErrorMessage('')
                  }}
                  className={cn(
                    'flex items-center justify-center transition-all duration-300 cursor-pointer outline-none rounded-xl h-8.5 select-none',
                    isActive
                      ? 'flex-1 gap-1.5 px-3 bg-background text-foreground shadow-xs font-semibold text-xs border border-border/80'
                      : 'size-8.5 text-muted-foreground hover:text-foreground hover:bg-foreground/5',
                  )}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  <Icon className="size-4 shrink-0" />
                  {isActive && <span className="truncate">{tab.label}</span>}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ctl size-9.5 rounded-2xl panel shrink-0 grid place-items-center text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Durum / Yükleniyor Bildirimi */}
        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 p-2 text-xs text-primary font-medium animate-pulse shrink-0"
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
            className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive animate-in fade-in shrink-0"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Sekmeler Arası Sabit Yükseklikli Yatay Kaydırma (Jitter / Zıplama Yok) */}
        <div className="relative w-full h-[275px] sm:h-[290px] overflow-hidden rounded-2xl">
          <div
            className="flex w-[300%] h-full transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: `translateX(-${activeTabIndex * (100 / 3)}%)` }}
          >
            {/* 1. SEKME: METİN & PDF */}
            <div
              role="tabpanel"
              inert={activeTabIndex !== 0}
              aria-hidden={activeTabIndex !== 0}
              className="w-1/3 h-full flex flex-col justify-between px-1"
            >
              {/* Gizli PDF Dosya Girişi */}
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

              <div
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
                  'relative w-full flex-1 min-h-0 rounded-2xl border transition-colors overflow-hidden',
                  isDragOver ? 'border-primary bg-primary/5 ring-2 ring-primary/40' : 'border-border bg-background',
                )}
              >
                {isDragOver ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-primary/10 backdrop-blur-xs text-primary font-semibold text-xs pointer-events-none">
                    <Upload className="size-7 animate-bounce" />
                    <span>PDF Dosyasını Buraya Bırakın</span>
                  </div>
                ) : null}

                <label htmlFor="reader-text" className="sr-only">
                  Okunacak metin
                </label>
                <textarea
                  id="reader-text"
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Metninizi buraya yapıştırın veya PDF dosyasını sürükleyin..."
                  className="w-full h-full resize-none p-3 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/75 bg-transparent"
                />
              </div>

              {/* Alt Eylem Çubuğu */}
              <div className="flex items-center justify-between gap-2 pt-2.5 shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setDraft(SAMPLE_TEXT)}
                    className="ctl h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Örnek
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="ctl h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground gap-1 transition-colors"
                    title="Panodaki metni yapıştır"
                  >
                    <Clipboard className="size-3.5" />
                    <span className="hidden min-[420px]:inline">Panodan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="ctl h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground gap-1 transition-colors"
                    title="PDF Dosyası Yükle"
                  >
                    <Upload className="size-3.5 text-primary" />
                    <span>PDF</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {count} k
                  </span>
                  <button
                    type="button"
                    onClick={() => onApply(draft)}
                    disabled={count === 0 || loading}
                    className="ctl ctl-primary h-8.5 rounded-xl px-3.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Metni Oku
                  </button>
                </div>
              </div>
            </div>

            {/* 2. SEKME: WEB & YOUTUBE (BİRLEŞİK AKILLI URL) */}
            <div
              role="tabpanel"
              inert={activeTabIndex !== 1}
              aria-hidden={activeTabIndex !== 1}
              className="w-1/3 h-full flex flex-col justify-between px-1"
            >
              <form onSubmit={handleFetchWebOrYouTube} className="flex flex-col gap-3 flex-1 justify-center">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value)
                      if (errorMessage) setErrorMessage('')
                    }}
                    disabled={loading}
                    placeholder="https://... (Web makalesi veya YouTube video linki)"
                    className="h-11 w-full rounded-2xl border border-border bg-background pl-9 pr-3 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  />
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Otomatik İçerik Damıtıcı</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>Web & Haber Linki:</strong> Reklam ve menüler temizlenir, ana metin ayıklanır.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>YouTube Linki:</strong> Konuşmalar otomatik yazıya dökülür; zaman damgaları arındırılır.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="ctl ctl-primary h-10 w-full rounded-2xl text-xs sm:text-sm font-semibold gap-2 disabled:opacity-40"
                >
                  <Sparkles className="size-4" />
                  <span>İçeriği Çek ve Oku</span>
                </button>
              </form>
            </div>

            {/* 3. SEKME: HAZIR SEÇKİLER */}
            <div
              role="tabpanel"
              inert={activeTabIndex !== 2}
              aria-hidden={activeTabIndex !== 2}
              className="w-1/3 h-full overflow-y-auto theme-scrollbar px-1 flex flex-col gap-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CURATED_LIBRARY.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background/90 p-3 shadow-xs hover:border-primary/50 transition-all text-left group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                          {item.category}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                          {item.wordCount} k • ~{item.estimatedSeconds} sn
                        </span>
                      </div>
                      <h4 className="text-xs font-bold tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-foreground/75 truncate">{item.author}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(item.text)
                          onApply(item.text, item.title)
                        }}
                        className="ctl ctl-primary flex h-7 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                      >
                        <Sparkles className="size-3" />
                        <span>Bu Seçkiyi Oku</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
