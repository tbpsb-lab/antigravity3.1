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
  X,
} from 'lucide-react'
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { SAMPLE_TEXT, tokenize, type ThemeId } from '@/lib/rsvp'
import { CURATED_LIBRARY } from '@/lib/curated-library'
import { fetchArticleFromUrl } from '@/lib/article-parser'
import { fetchYouTubeTranscript } from '@/lib/youtube-parser'
import { parsePdfDocument } from '@/lib/pdf-book-parser'
import { useFocusTrap } from '@/lib/use-focus-trap'
import { cn } from '@/lib/utils'

export type TextSheetProps = {
  open: boolean
  initialText: string
  onToggle?: () => void
  onClose: () => void
  onApply: (text: string, title?: string) => void
  onThemeChange?: (theme: ThemeId) => void
}

const TABS = [
  { id: 'text', label: 'Metin & PDF', icon: FileText },
  { id: 'url', label: 'Web & YouTube', icon: Link2 },
  { id: 'library', label: 'Seçkiler', icon: BookOpen },
] as const

type TabType = (typeof TABS)[number]['id']

export const TextSheet = memo(function TextSheet({
  open,
  initialText,
  onToggle,
  onClose,
  onApply,
  onThemeChange,
}: TextSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('text')
  const [draft, setDraft] = useState(initialText)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  // İlk Ziyaret İçin Okuma ve İçerik Merkezi Butonuna Yönlendiren Şeffaf Tanıtım Penceresi
  const [showCallout, setShowCallout] = useState(false)
  const [calloutFading, setCalloutFading] = useState(false)
  const calloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calloutFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calloutDismissedRef = useRef(false)
  const calloutRef = useRef<HTMLDivElement>(null)

  const dismissCallout = useCallback(() => {
    if (calloutDismissedRef.current) return
    calloutDismissedRef.current = true
    if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current)
    if (calloutFadeTimerRef.current) clearTimeout(calloutFadeTimerRef.current)
    setCalloutFading(true)
    try {
      localStorage.setItem('hasSeenTapGuide', 'true')
      window.dispatchEvent(new Event('dismiss-onboarding'))
    } catch {}
    calloutFadeTimerRef.current = setTimeout(() => {
      setShowCallout(false)
    }, 350)
  }, [])

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('hasSeenTapGuide')
      if (!hasSeen) {
        // Okuma jestleri merkezde başladıktan 1.5 sn sonra butonun dibinde açılır
        const showTimer = setTimeout(() => {
          if (!calloutDismissedRef.current && !open) {
            setShowCallout(true)
          }
        }, 1500)

        // 7.5 sn sonra otomatik kapanır
        calloutTimerRef.current = setTimeout(() => {
          dismissCallout()
        }, 7500)

        return () => clearTimeout(showTimer)
      }
    } catch {}
  }, [open, dismissCallout])

  // Eğer kullanıcı butona tıklayıp paneli açarsa callout'u derhal kapat
  useEffect(() => {
    if (open && showCallout) {
      dismissCallout()
    }
  }, [open, showCallout, dismissCallout])

  // Dışarıdan tetiklenen onboarding kapatma olayını (merkez pencereye tıklama vb.) dinle
  useEffect(() => {
    const handleExternalDismiss = () => {
      dismissCallout()
    }
    window.addEventListener('dismiss-onboarding', handleExternalDismiss)
    return () => {
      window.removeEventListener('dismiss-onboarding', handleExternalDismiss)
      if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current)
      if (calloutFadeTimerRef.current) clearTimeout(calloutFadeTimerRef.current)
    }
  }, [dismissCallout])

  // Callout açıkken sayfanın herhangi bir yerine tıklandığında kapat
  useEffect(() => {
    if (!showCallout) return

    const handlePointerDown = (e: PointerEvent) => {
      if (calloutRef.current && !calloutRef.current.contains(e.target as Node)) {
        dismissCallout()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [showCallout, dismissCallout])

  const rootRef = useRef<HTMLDivElement>(null)
  const dialogRef = useFocusTrap<HTMLDivElement>(open)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const panelId = useId()

  const count = useMemo(() => tokenize(draft).length, [draft])
  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab)

  // Metin veya açık olma durumu güncellendiğinde senkronize et
  useEffect(() => {
    if (open) {
      setDraft(initialText)
      setErrorMessage('')
      setStatusMessage('')
    }
  }, [open, initialText])

  // Dışarı tıklama, ESC ve 1-2-3 tema kısayolları (FontSettings ile birebir aynı etkileşim)
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        e.stopPropagation()
        onClose()
        return
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return

      // Kullanıcı metin alanına (textarea) veya URL kutusuna (input) yazıyorsa sayı yazmasına izin ver
      const target = e.target as HTMLElement | null
      const isTyping = Boolean(
        target?.closest('input, textarea, select, [contenteditable="true"]')
      )

      if (isTyping) {
        return
      }

      if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault()
        onThemeChange?.('ios')
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault()
        onThemeChange?.('cyberpunk')
      } else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
        e.preventDefault()
        onThemeChange?.('kindle')
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, loading, onClose, onThemeChange])

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
    <div ref={rootRef} className="relative">
      {/* 1. Tetikleyici Buton (Aa butonu ile birebir aynı kontrol yapısı) */}
      <button
        type="button"
        onClick={(e) => {
          ;(e.currentTarget as HTMLButtonElement)?.blur()
          onToggle?.()
        }}
        onPointerUp={(e) => {
          ;(e.currentTarget as HTMLButtonElement)?.blur()
        }}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Okuma ve İçerik Merkezi (Metin Yükle)"
        title="Okuma ve İçerik Merkezi (Metin Yükle)"
        className={cn(
          'ctl panel size-10 md:size-12 landscape-short:size-9 cursor-pointer transition-colors',
          open ? 'ctl-primary text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <FileText className="size-4 md:size-5" />
      </button>

      {/* 1.5. İlk Ziyaret İçin Okuma ve İçerik Merkezi Şeffaf Yönlendirme Penceresi */}
      {showCallout && !open && (
        <div
          ref={calloutRef}
          role="tooltip"
          aria-label="Okuma ve İçerik Merkezi Rehberi"
          onClick={(e) => {
            e.stopPropagation()
            dismissCallout()
            onToggle?.()
          }}
          className={cn(
            'absolute top-full mt-2.5 z-50 select-none cursor-pointer transition-all duration-300 ease-out',
            // Mobil ve Masaüstü Konumlandırma: Butonun tam altına hizalı
            'right-[-3.5rem] sm:right-0 w-[270px] sm:w-[290px]',
            'p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl shadow-2xl',
            // Şeffaf / Buzlu Cam Tasarımı (Tüm Temalarla Uyumlu)
            'bg-background/85 dark:bg-slate-900/90 backdrop-blur-md border border-primary/45 text-foreground',
            'animate-in fade-in zoom-in-95 duration-300',
            calloutFading ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto',
          )}
        >
          {/* Butonu İşaret Eden Yukarı Doğru Şeffaf Ok (Arrow Pointer) */}
          <div
            className="absolute -top-1.5 right-[4.75rem] sm:right-5 size-3 rotate-45 border-t border-l border-primary/45 bg-background/90 dark:bg-slate-900/95"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-1.5 text-primary text-[11px] sm:text-xs font-bold tracking-tight">
                <Sparkles className="size-3.5 text-primary animate-pulse" />
                <span>Okuma ve İçerik Merkezi</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  dismissCallout()
                }}
                className="size-5 -mr-1 -mt-1 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
                aria-label="Kapat"
                title="Kapat"
              >
                <X className="size-3" />
              </button>
            </div>

            <p className="mt-1 text-[11px] sm:text-xs text-foreground/85 leading-relaxed font-normal">
              Kendi metinlerinizi yapıştırabilir, <strong>PDF</strong> yükleyebilir veya <strong>Web & YouTube</strong> linklerini aktarabilirsiniz.
            </p>

            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span className="text-primary font-semibold hover:underline flex items-center gap-1">
                Açmak için dokunun →
              </span>
              <span>Kapat (Tık)</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Aa Tarzı Açılan Yüzen Popover Paneli (Ayrı pencere / backdrop overlay yok) */}
      <div
        ref={dialogRef}
        id={panelId}
        role="dialog"
        aria-modal={open ? 'true' : undefined}
        aria-label="Okuma ve İçerik Merkezi"
        inert={!open}
        className={cn(
          'panel panel-solid z-50 p-3 sm:p-3.5 transition-all duration-200 ease-out shadow-2xl flex flex-col gap-2 rounded-2xl sm:rounded-3xl',
          'max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain touch-pan-y landscape-short:max-h-[calc(100dvh-2.75rem)] landscape-short:p-2 landscape-short:gap-1.5',
          // Mobil: Top-bar'ın hemen altında, ekran kenarlarından taşmayan sabit ve kompakt yerleşim
          'fixed inset-x-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] landscape-short:top-[calc(max(0.25rem,env(safe-area-inset-top))+2.5rem)] max-w-md mx-auto origin-top',
          // Masaüstü / Tablet (sm ve üzeri): Butona bağlı absolute açılan popover
          'sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:right-0 sm:w-[28rem] sm:max-w-[calc(100vw-2rem)] sm:mx-0 sm:origin-top-right',
          open ? 'scale-100 opacity-100 pointer-events-auto' : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        {/* Üst Kısım: Sekme Çubuğu ve Kapat Butonu */}
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
                    'flex items-center justify-center transition-all duration-300 cursor-pointer outline-none rounded-xl h-8 select-none whitespace-nowrap shrink-0',
                    isActive
                      ? 'flex-1 gap-1.5 px-3 bg-background text-foreground shadow-xs font-semibold text-xs border border-border/80'
                      : 'size-8 text-muted-foreground hover:text-foreground hover:bg-foreground/5',
                  )}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {isActive && <span className="truncate">{tab.label}</span>}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ctl !size-8 !w-8 !h-8 rounded-xl panel shrink-0 grid place-items-center text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40"
            aria-label="Kapat"
          >
            <X className="size-4 shrink-0" />
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
        <div className="relative w-full h-[265px] sm:h-[280px] landscape-short:h-[220px] overflow-hidden rounded-2xl">
          <div
            className="flex w-[300%] h-full transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: `translateX(-${activeTabIndex * (100 / 3)}%)` }}
          >
            {/* 1. SEKME: METİN & PDF */}
            <div
              role="tabpanel"
              inert={activeTabIndex !== 0}
              aria-hidden={activeTabIndex !== 0}
              className="w-1/3 h-full flex flex-col justify-between px-0.5"
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
                  className="w-full h-full resize-none p-2.5 sm:p-3 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/75 bg-transparent"
                />
              </div>

              {/* Alt Eylem Çubuğu */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 shrink-0">
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDraft(SAMPLE_TEXT)}
                    className="ctl !h-7 sm:!h-7.5 !w-auto rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
                  >
                    Örnek
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="ctl !h-7 sm:!h-7.5 !w-auto rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 transition-colors whitespace-nowrap shrink-0"
                    title="Panodaki metni yapıştır"
                  >
                    <Clipboard className="size-3 shrink-0" />
                    <span>Panodan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="ctl !h-7 sm:!h-7.5 !w-auto rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 transition-colors whitespace-nowrap shrink-0"
                    title="PDF Dosyası Yükle"
                  >
                    <Upload className="size-3 text-primary shrink-0" />
                    <span>PDF</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground shrink-0">
                    {count} k
                  </span>
                  <button
                    type="button"
                    onClick={() => onApply(draft)}
                    disabled={count === 0 || loading}
                    className="ctl ctl-primary !h-7.5 sm:!h-8 !w-auto rounded-xl px-3 text-xs font-semibold disabled:opacity-40 whitespace-nowrap shrink-0"
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
              className="w-1/3 h-full flex flex-col justify-between px-0.5"
            >
              <form onSubmit={handleFetchWebOrYouTube} className="flex flex-col gap-2 sm:gap-2.5 flex-1 justify-center">
                <div className="relative shrink-0">
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
                    className="h-9 sm:h-10 w-full rounded-2xl border border-border bg-background pl-9 pr-3 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 shrink-0"
                  />
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-2 sm:p-2.5 space-y-0.5 sm:space-y-1 text-xs text-muted-foreground shrink-0">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    <Sparkles className="size-3.5 text-primary shrink-0" />
                    <span>Otomatik İçerik Damıtıcı</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] leading-snug">
                    • <strong>Web:</strong> Reklam ve menüler temizlenir, ana metin ayıklanır.
                  </p>
                  <p className="text-[10px] sm:text-[11px] leading-snug">
                    • <strong>YouTube:</strong> Konuşmalar otomatik yazıya dökülür; zaman damgaları arındırılır.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="ctl ctl-primary !h-8.5 sm:!h-9.5 !w-full rounded-2xl text-xs sm:text-sm font-semibold gap-2 disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sparkles className="size-3.5 shrink-0" />
                  <span>İçeriği Çek ve Oku</span>
                </button>
              </form>
            </div>

            {/* 3. SEKME: HAZIR SEÇKİLER (2x2 KARE FORMAT) */}
            <div
              role="tabpanel"
              inert={activeTabIndex !== 2}
              aria-hidden={activeTabIndex !== 2}
              className="w-1/3 h-full overflow-y-auto theme-scrollbar px-0.5 flex flex-col"
            >
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 h-full">
                {CURATED_LIBRARY.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setDraft(item.text)
                      onApply(item.text, item.title)
                    }}
                    className="flex flex-col justify-between rounded-xl sm:rounded-2xl border border-border/80 bg-background/90 hover:bg-primary/5 hover:border-primary/60 p-1.5 sm:p-2.5 shadow-xs transition-all text-left group select-none cursor-pointer"
                  >
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-semibold text-primary shrink-0 leading-tight">
                          {item.category}
                        </span>
                        <span className="font-mono text-[8.5px] sm:text-[9.5px] text-muted-foreground tabular-nums shrink-0 leading-tight">
                          ~{item.estimatedSeconds} sn • {item.wordCount} k
                        </span>
                      </div>
                      <h4 className="text-[10.5px] sm:text-xs font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-foreground/75 truncate leading-tight">
                        {item.author}
                      </p>
                      <p className="text-[8px] sm:text-[9.5px] text-muted-foreground leading-tight line-clamp-1 sm:line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-1 sm:pt-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDraft(item.text)
                          onApply(item.text, item.title)
                        }}
                        className="ctl ctl-primary flex !h-5.5 sm:!h-6.5 !w-full items-center justify-center gap-1 rounded-md sm:rounded-xl text-[9.5px] sm:text-[11px] font-semibold cursor-pointer transition-all active:scale-95 shadow-xs whitespace-nowrap shrink-0"
                      >
                        <Sparkles className="size-2.5 sm:size-3 shrink-0" />
                        <span>Hemen Oku</span>
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
})
