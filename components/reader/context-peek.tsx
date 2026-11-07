'use client'

import { memo, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useElementSize } from '@/lib/use-element-size'

type ContextPeekProps = {
  words: string[]
  index: number
  chunkSize?: number
  visible: boolean
  remainingTime?: string
  bookPageLabel?: string
  onJump: (index: number) => void
  onVisibleCountChange?: (count: number) => void
  onStepPrev?: () => void
  onStepNext?: () => void
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
  onJump,
  onVisibleCountChange,
}: ContextPeekProps) {
  const [containerRef, containerSize] = useElementSize<HTMLDivElement>()

  // Konteyner boyutuna göre ekranda dikey ve yatay eksende ne kadar kelime alabileceğini dinamik hesapla.
  // 3 satırın taşmadan, kelime kırpılmadan %100 ekrana sığmasını ve her sayfanın ardışık olmasını sağlar.
  const capacity = useMemo(() => {
    if (!containerSize.width) {
      return 21 // İlk yükleme / SSR için dengeli varsayılan
    }
    // İki yandaki butonlar ve boşluklar düşülmüş metin alanı
    const buttonSpace = containerSize.width >= 768 ? 96 : 72
    let availableWidth = Math.max(120, containerSize.width - buttonSpace)
    if (containerSize.width >= 768) {
      availableWidth = Math.min(availableWidth, 768 - buttonSpace)
    }

    // Türkçede 1 kelimenin ortalama kapladığı alan (harf genişliği + boşluk + buton padding)
    // Math.floor ile garanti altına alınarak satır taşması ve kelime kırpılması sıfırlanır.
    let wordSlotPx = 60
    if (containerSize.width >= 768) {
      wordSlotPx = 76
    } else if (containerSize.width >= 600) {
      wordSlotPx = 66
    } else {
      wordSlotPx = 58
    }

    const wordsPerLine = Math.max(4, Math.floor(availableWidth / wordSlotPx))
    return Math.max(12, 3 * wordsPerLine)
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

  const handlePrev = () => {
    if (!canGoPrev) return
    const targetWordIdx = Math.max(0, start - capacity)
    onJump(targetWordIdx)
  }

  const handleNext = () => {
    if (!canGoNext) return
    const targetWordIdx = Math.min(words.length - 1, start + capacity)
    onJump(targetWordIdx)
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 min-h-0 flex-col overflow-hidden transition-opacity duration-300 select-none w-full opacity-100"
    >
      {/* Üst Bilgi Başlığı (Sol: Kelime Sayısı ve Konumu, Orta: Kitap Sayfa Numarası, Sağ: Kalan Süre) */}
      <div className="grid grid-cols-3 items-center mb-1 px-1 shrink-0 landscape-short:mb-0.5">
        <div className="justify-self-start">
          {words.length > 0 && (
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground/85">
              {start + 1} - {end} / {words.length}
            </span>
          )}
        </div>
        <div className="justify-self-center text-center">
          {bookPageLabel && (
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground/85">
              {bookPageLabel}
            </span>
          )}
        </div>
        <div className="justify-self-end text-right">
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
            'ctl size-7 sm:size-8 md:size-10 shrink-0 rounded-full border border-border/40 bg-foreground/5 hover:bg-foreground/15 text-muted-foreground hover:text-foreground backdrop-blur-xs transition-all flex items-center justify-center cursor-pointer shadow-2xs',
            !canGoPrev && 'opacity-20 pointer-events-none',
          )}
          aria-label="Önceki bağlam sayfası"
          title="Önceki bağlam (Shift + ←)"
        >
          <ChevronLeft className="size-4 md:size-5" />
        </button>

        {/* Ortadaki Metin Alanı: Scrollbar kesinlikle görünmez (scrollbar-none), tüm ekranlarda (mobil, tablet, masaüstü) KESİNLİKLE 3 SATIR */}
        <div className="flex-1 min-h-0 h-full overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex items-start">
          <p className="text-pretty text-xs sm:text-[13px] md:text-[14.5px] leading-[1.32] sm:leading-[1.38] md:leading-[1.42] text-muted-foreground w-full select-none m-0 p-0">
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
            'ctl size-7 sm:size-8 md:size-10 shrink-0 rounded-full border border-border/40 bg-foreground/5 hover:bg-foreground/15 text-muted-foreground hover:text-foreground backdrop-blur-xs transition-all flex items-center justify-center cursor-pointer shadow-2xs',
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
