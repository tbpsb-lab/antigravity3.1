'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useElementSize } from '@/lib/use-element-size'
import { triggerHaptic } from '@/lib/haptics'
import { PageSearchPopover } from './page-search-popover'
import type { ChunkItem, BookPageInfo, ThemeId } from '@/lib/rsvp'

type ContextPeekProps = {
  words: string[]
  index: number
  chunkSize?: number
  visible: boolean
  remainingTime?: string
  bookPageLabel?: string
  chunks?: ChunkItem[]
  pageInfo?: BookPageInfo | null
  theme?: ThemeId
  onJump: (index: number) => void
  onVisibleCountChange?: (count: number) => void
  onStepPrev?: () => void
  onStepNext?: () => void
  onSeekChunk?: (chunkIndex: number) => void
  hasPrev?: boolean
  hasNext?: boolean
}

export const ContextPeek = memo(function ContextPeek({
  words,
  index,
  chunkSize = 1,
  visible,
  remainingTime,
  bookPageLabel,
  chunks = [],
  pageInfo,
  theme,
  onJump,
  onVisibleCountChange,
  onStepPrev,
  onStepNext,
  onSeekChunk,
}: ContextPeekProps) {
  const [containerRef, containerSize] = useElementSize<HTMLDivElement>()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchButtonRef = useRef<HTMLButtonElement>(null)

  // Klavye kısayolu ('S' tuşu) ile mini arama penceresini otomatik aç
  useEffect(() => {
    const handleOpenSearch = () => {
      setIsSearchOpen(true)
    }
    window.addEventListener('open-page-search', handleOpenSearch)
    return () => window.removeEventListener('open-page-search', handleOpenSearch)
  }, [])

  // Konteyner boyutuna göre ekranda dikey ve yatay eksende ne kadar kelime alabileceğini dinamik hesapla.
  // Mobil telefonda dikeyde 3 satır, yatayda 2 satır; masaüstü ve tablette 3-4 satır doldurur.
  const capacity = useMemo(() => {
    if (!containerSize.width) {
      return 36 // İlk yükleme / SSR için dengeli varsayılan
    }

    // Mobil telefon yatay tutuş (landscape phone, max-height 520px) kontrolü -> 2 satır
    const isLandscapeShort =
      typeof window !== 'undefined' &&
      window.innerHeight <= 520 &&
      window.matchMedia?.('(orientation: landscape)').matches

    if (isLandscapeShort) {
      const buttonSpace = 64
      const availableWidth = Math.max(120, containerSize.width - buttonSpace)
      const wordsPerLine = Math.max(6, Math.floor(availableWidth / 48))
      return Math.max(12, 2 * wordsPerLine)
    }

    // Masaüstü ve Geniş Tablet (width >= 768px): 3 - 4 satır
    if (containerSize.width >= 768) {
      const buttonSpace = 96
      const availableWidth = Math.min(containerSize.width - buttonSpace, 768 - buttonSpace)
      const wordsPerLine = Math.max(10, Math.floor(availableWidth / 50))
      return Math.max(38, Math.floor(3.6 * wordsPerLine))
    }

    // Tablet / Orta Ekran (600px - 767px): 3 - 4 satır
    if (containerSize.width >= 600) {
      const buttonSpace = 80
      const availableWidth = containerSize.width - buttonSpace
      const wordsPerLine = Math.max(8, Math.floor(availableWidth / 52))
      return Math.max(28, Math.floor(3.5 * wordsPerLine))
    }

    // Mobil Telefon Dikey (width < 600px): Tam 3 satır
    const buttonSpace = 72
    const availableWidth = Math.max(120, containerSize.width - buttonSpace)
    const wordsPerLine = Math.max(5, Math.floor(availableWidth / 54))
    return Math.max(15, 3 * wordsPerLine)
  }, [containerSize.width])

  // Kapasite değiştikçe ana bileşene bildir
  useEffect(() => {
    if (capacity > 0 && onVisibleCountChange) {
      onVisibleCountChange(capacity)
    }
  }, [capacity, onVisibleCountChange])

  // Aktif okuma sırasında (visible === false) VDOM üzerinde 30 buton düğümü oluşturmayı tamamen atla
  if (!visible) {
    return (
      <div
        ref={containerRef}
        aria-hidden="true"
        inert={true}
        className="pointer-events-none hidden opacity-0"
      />
    )
  }

  // Sayfa bazlı dilimleme:
  // Sayfada tam capacity kadar kelime yer alır.
  // > butonuna basıldığında EXACTLY capacity kadar ilerler.
  // Görünen son kelime (words[end - 1]) ile bir sonraki sayfanın ilk kelimesi (words[end]) DAİMA ARDIŞIKTIR.
  const pageIndex = Math.floor(index / capacity)
  const start = pageIndex * capacity
  const end = Math.min(words.length, start + capacity)
  const slice = words.slice(start, end)

  const canGoPrev = start > 0
  const canGoNext = end < words.length

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!canGoPrev) return
    const targetWordIdx = Math.max(0, (pageIndex - 1) * capacity)
    if (chunks && chunks.length > 0) {
      const targetChunkIdx = chunks.findIndex((c) => c.startIndex >= targetWordIdx)
      const finalIdx = targetChunkIdx !== -1 ? targetChunkIdx : 0
      if (onSeekChunk) {
        onSeekChunk(finalIdx)
      } else if (onStepPrev) {
        onStepPrev()
      } else {
        onJump(chunks[finalIdx]?.startIndex ?? targetWordIdx)
      }
    } else {
      onJump(targetWordIdx)
    }
    triggerHaptic('tap')
  }

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!canGoNext) return
    const targetWordIdx = (pageIndex + 1) * capacity
    if (targetWordIdx >= words.length) return
    if (chunks && chunks.length > 0) {
      const targetChunkIdx = chunks.findIndex((c) => c.startIndex >= targetWordIdx)
      const finalIdx = targetChunkIdx !== -1 ? targetChunkIdx : chunks.length - 1
      if (onSeekChunk) {
        onSeekChunk(finalIdx)
      } else if (onStepNext) {
        onStepNext()
      } else {
        onJump(chunks[finalIdx]?.startIndex ?? targetWordIdx)
      }
    } else {
      onJump(targetWordIdx)
    }
    triggerHaptic('tap')
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 min-h-0 flex-col overflow-visible transition-opacity duration-300 select-none w-full opacity-100"
    >
      {/* Üst Bilgi Başlığı (Sol: sf: X/Y ve Mini Arama Atlama, Sağ: Kalan Süre) */}
      <div className="flex items-center justify-between mb-1 px-1 shrink-0 landscape-short:mb-0.5">
        <div className="relative flex items-center">
          {bookPageLabel ? (
            <button
              ref={searchButtonRef}
              type="button"
              data-wheel="page-nav"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums text-muted-foreground/80 hover:text-muted-foreground/80 active:text-muted-foreground/80 focus:text-muted-foreground/80 bg-transparent hover:bg-transparent active:bg-transparent transition-none cursor-pointer outline-none border-none select-none"
              title="Sayfaya atla veya kelime ara"
              aria-label="Sayfaya atla veya kelime ara"
            >
              <span>{bookPageLabel}</span>
              <Search className="size-3 text-muted-foreground/80 shrink-0" />
            </button>
          ) : (
            <button
              ref={searchButtonRef}
              type="button"
              data-wheel="page-nav"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums text-muted-foreground/80 hover:text-muted-foreground/80 active:text-muted-foreground/80 focus:text-muted-foreground/80 bg-transparent hover:bg-transparent active:bg-transparent transition-none cursor-pointer outline-none border-none select-none"
              title="Kelime ara veya sayfaya atla"
              aria-label="Kelime ara veya sayfaya atla"
            >
              <Search className="size-3 text-muted-foreground/80 shrink-0" />
              <span>Ara / Git</span>
            </button>
          )}

          {/* Mini Arama & Sayfaya Atlama Açılır Penceresi */}
          <PageSearchPopover
            open={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            words={words}
            chunks={chunks}
            pageInfo={pageInfo}
            currentWordIndex={index}
            onJump={onJump}
            theme={theme}
            triggerRef={searchButtonRef}
          />
        </div>

        <div className="text-right">
          {remainingTime && (
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground/85">
              {remainingTime}
            </span>
          )}
        </div>
      </div>

      {/* Ana Gövde: Solda minik < butonu, Ortada kesinlikle scrollbarsız esnek metin alanı, Sağda minik > butonu */}
      <div className="relative flex flex-1 min-h-0 items-center gap-1.5 sm:gap-2.5 w-full">
        {/* Sol Sayfa Geri Atla Butonu: Minik ve şeffaf */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={cn(
            'ctl relative z-10 size-7 sm:size-8 md:size-10 shrink-0 rounded-full border border-border/40 bg-foreground/5 hover:bg-foreground/15 text-muted-foreground hover:text-foreground backdrop-blur-xs transition-all flex items-center justify-center cursor-pointer shadow-2xs',
            !canGoPrev && 'opacity-20 pointer-events-none',
          )}
          aria-label="Önceki bağlam sayfası"
          title="Önceki bağlam (Shift + ←)"
        >
          <ChevronLeft className="size-4 md:size-5" />
        </button>

        {/* Ortadaki Metin Alanı: Scrollbar kesinlikle görünmez (scrollbar-none), tüm ekranlarda (mobil, tablet, masaüstü) KESİNLİKLE 3 SATIR */}
        <div className="flex-1 min-h-0 h-full overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex items-start">
          <p className="text-pretty text-xs sm:text-[13.5px] md:text-[15px] leading-[1.4] sm:leading-[1.45] md:leading-[1.48] text-muted-foreground w-full select-none m-0 p-0 line-clamp-3 sm:line-clamp-4">
            {slice.map((w, i) => {
              const absolute = start + i
              const current = absolute >= index && absolute < index + chunkSize
              return (
                <span key={absolute} className="inline">
                  <button
                    type="button"
                    onClick={() => onJump(absolute)}
                    aria-current={current ? 'true' : undefined}
                    className={cn(
                      'inline rounded-[3px] px-0.5 py-0 leading-inherit transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer',
                      current && 'bg-pivot/15 font-medium text-foreground',
                    )}
                  >
                    {w}
                  </button>{' '}
                </span>
              )
            })}
          </p>
        </div>

        {/* Sağ Sayfa İleri Atla Butonu */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className={cn(
            'ctl relative z-10 size-7 sm:size-8 md:size-10 shrink-0 rounded-full border border-border/40 bg-foreground/5 hover:bg-foreground/15 text-muted-foreground hover:text-foreground backdrop-blur-xs transition-all flex items-center justify-center cursor-pointer shadow-2xs',
            !canGoNext && 'opacity-20 pointer-events-none',
          )}
          aria-label="Sonraki bağlam sayfası"
          title="Sonraki bağlam (Shift + →)"
        >
          <ChevronRight className="size-4 md:size-5" />
        </button>
      </div>
    </div>
  )
})
