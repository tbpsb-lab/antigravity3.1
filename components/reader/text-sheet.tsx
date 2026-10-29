'use client'

import { AlertCircle, FileText, Link2, Loader2, Sparkles, Upload, Video, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SAMPLE_TEXT, tokenize } from '@/lib/rsvp'
import { fetchArticleFromUrl } from '@/lib/article-parser'
import { fetchYouTubeTranscript } from '@/lib/youtube-parser'
import { parsePdfDocument } from '@/lib/pdf-book-parser'
import { cn } from '@/lib/utils'

type TextSheetProps = {
  open: boolean
  initialText: string
  onClose: () => void
  onApply: (text: string, title?: string) => void
}

type TabType = 'url' | 'youtube' | 'pdf' | 'text'

export function TextSheet({ open, initialText, onClose, onApply }: TextSheetProps) {
  if (!open) return null
  return <TextSheetBody initialText={initialText} onClose={onClose} onApply={onApply} />
}

function TextSheetBody({ initialText, onClose, onApply }: Omit<TextSheetProps, 'open'>) {
  const [activeTab, setActiveTab] = useState<TabType>('url')
  const [draft, setDraft] = useState(initialText)
  const [url, setUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const count = tokenize(draft).length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, loading])

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
      setErrorMessage(err.message || 'Haber metni çekilirken bir hata oluştu.')
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
      setErrorMessage(err.message || 'YouTube transkripti çekilemedi.')
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
      setErrorMessage(err.message || 'PDF ayrıştırılırken bir hata oluştu.')
      setStatusMessage('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Kapat"
        onClick={loading ? undefined : onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-md animate-in fade-in duration-300"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="text-sheet-title"
        className="panel panel-solid relative flex max-h-[90dvh] w-full max-w-2xl flex-col gap-3 rounded-b-none p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-8 fade-in duration-300 sm:rounded-b-(--panel-radius) sm:p-5"
      >
        {/* Üst Başlık ve Kapat Butonu */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="text-sheet-title" className="text-base font-semibold tracking-tight">
              Okuma & İçerik Merkezi
            </h2>
            <p className="text-xs text-muted-foreground">
              Haber linki, YouTube videosu veya kitap PDF'i ekleyin ya da metin yapıştırın.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ctl size-9 disabled:opacity-40"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 4 Sekmeli Seçim Çubuğu */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-[calc(var(--control-radius)*1.1)] bg-foreground/5 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={cn(
              'ctl h-8 flex-1 gap-1.5 px-2.5 text-xs font-medium',
              activeTab === 'url' ? 'ctl-primary' : 'bg-transparent text-muted-foreground',
            )}
          >
            <Link2 className="size-3.5" />
            <span>Haber Linki</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('youtube')}
            className={cn(
              'ctl h-8 flex-1 gap-1.5 px-2.5 text-xs font-medium',
              activeTab === 'youtube' ? 'ctl-primary' : 'bg-transparent text-muted-foreground',
            )}
          >
            <Video className="size-3.5" />
            <span>YouTube</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={cn(
              'ctl h-8 flex-1 gap-1.5 px-2.5 text-xs font-medium',
              activeTab === 'pdf' ? 'ctl-primary' : 'bg-transparent text-muted-foreground',
            )}
          >
            <Upload className="size-3.5" />
            <span>PDF Kitap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={cn(
              'ctl h-8 flex-1 gap-1.5 px-2.5 text-xs font-medium',
              activeTab === 'text' ? 'ctl-primary' : 'bg-transparent text-muted-foreground',
            )}
          >
            <FileText className="size-3.5" />
            <span>Metin</span>
          </button>
        </div>

        {/* Durum / İlerleme Çubuğu */}
        {statusMessage && (
          <div className="flex items-center gap-2 rounded-[var(--control-radius)] bg-primary/10 border border-primary/20 p-2.5 text-xs text-primary font-medium animate-pulse">
            <Loader2 className="size-3.5 animate-spin shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Hata Bildirimi */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-[var(--control-radius)] bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive animate-in fade-in">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* SEKME 1: WEB & HABER LİNKİ */}
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
                placeholder="https://... (Örn: BBC, Milliyet, Medium makalesi)"
                className="h-10 w-full rounded-[calc(var(--control-radius)*1.1)] border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Reklamlar, menüler ve yorumlar otomatik ayıklanır.
              </span>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="ctl ctl-primary h-10 px-4 text-xs sm:text-sm font-semibold gap-1.5 disabled:opacity-40"
              >
                <Sparkles className="size-3.5" />
                <span>Linki Çek ve Oku</span>
              </button>
            </div>
          </form>
        )}

        {/* SEKME 2: YOUTUBE TRANSKRİPT */}
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
                className="h-10 w-full rounded-[calc(var(--control-radius)*1.1)] border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Videodaki konuşmalar yazıya dökülür; zaman kodları ve müzikler temizlenir.
              </span>
              <button
                type="submit"
                disabled={loading || !youtubeUrl.trim()}
                className="ctl ctl-primary h-10 px-4 text-xs sm:text-sm font-semibold gap-1.5 disabled:opacity-40"
              >
                <Sparkles className="size-3.5" />
                <span>Transkripti Çek ve Oku</span>
              </button>
            </div>
          </form>
        )}

        {/* SEKME 3: PDF YÜKLE & OCR */}
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
            <div
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
                'flex flex-col items-center justify-center gap-2 rounded-[calc(var(--control-radius)*1.2)] border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
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
            </div>
          </div>
        )}

        {/* SEKME 4: METİN YAPIŞTIR */}
        {activeTab === 'text' && (
          <div className="flex flex-col gap-2.5">
            <textarea
              id="reader-text"
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Metninizi buraya yapıştırın..."
              rows={6}
              className="w-full resize-none rounded-[calc(var(--control-radius)*1.1)] border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDraft(SAMPLE_TEXT)}
                className="ctl h-8 px-2.5 text-xs text-muted-foreground"
              >
                Örnek Metin
              </button>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {count} kelime
                </span>
                <button
                  type="button"
                  onClick={() => onApply(draft)}
                  disabled={count === 0}
                  className="ctl ctl-primary h-9 px-4 text-xs sm:text-sm font-semibold disabled:opacity-40"
                >
                  Metni Oku
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
