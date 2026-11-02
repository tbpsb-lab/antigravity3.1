'use client'

import { useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useElementSize } from '@/lib/use-element-size'

type ContextPeekProps = {
  words: string[]
  index: number
  chunkSize?: number
  visible: boolean
  remainingTime?: string
  onJump: (index: number) => void
  onVisibleCountChange?: (count: number) => void
  onStepPrev?: () => void
  onStepNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export function ContextPeek({
  words,
  index,
  chunkSize = 1,
  visible,
  remainingTime,
  onJump,
  onVisibleCountChange,
  onStepPrev,
  onStepNext,
  hasPrev = true,
  hasNext = true,
}: ContextPeekProps) {
  const [containerRef, containerSize] = useElementSize<HTMLDivElement>()

  // Konteyner boyutuna göre ekranda dikey ve yatay eksende ne kadar kelime alabileceğini dinamik hesapla.
  // Scrollbar çıkmasını %100 önlemek için güvenli satır yüksekliği ve kelime genişliği kullanılır.
  const capacity = useMemo(() => {
    if (!containerSize.width || !containerSize.height) {
      return 50 // İlk yükleme / SSR için dengeli varsayılan
    }
    // Başlık ve boşluklar için ~24px düş
    const availableHeight = Math.max(20, containerSize.height - 24)
    // En fazla 2-3 satırlık zarif ve kompakt şerit tut (ekranı asla kaplamaz)
    const lines = Math.max(1, Math.min(3, Math.floor(availableHeight / 24)))
    // İki yandaki butonlar ve boşluklar düşülmüş metin alanı (~58px kelime başı ortalama)
    const availableWidth = Math.max(140, containerSize.width - 64)
    const wordsPerLine = Math.max(3, Math.floor(availableWidth / 58))
    return Math.max(6, lines * wordsPerLine)
  }, [containerSize.width, containerSize.height])

  // Kapasite değiştikçe ana bileşene bildir
  useEffect(() => {
    if (capacity > 0 && onVisibleCountChange) {
      onVisibleCountChange(capacity)
    }
  }, [capacity, onVisibleCountChange])

  // Sayfa bazlı dilimleme:
  // Okuma esnasında kelimeler sürekli kayıp titremez; vurgu stabil akarken,
  // yandaki <> butonlarına basıldığında tam bu ekranda görünen blok (capacity) kadar ileri/geri atlar.
  const pageIndex = Math.floor(index / capacity)
  const start = pageIndex * capacity
  const end = Math.min(words.length, start + capacity)
  const slice = words.slice(start, end)

  return (
    <div
      ref={containerRef}
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        'flex flex-1 min-h-0 flex-col overflow-hidden transition-opacity duration-300 select-none w-full',
        visible ? 'opacity-100' : 'pointer-events-none hidden opacity-0',
      )}
    >
      {/* Üst Bilgi Başlığı (Sol: Kelime Sayısı ve Konumu, Sağ: Kalan Süre) */}
      <div className="flex items-center justify-between mb-1 px-1 shrink-0 landscape-short:mb-0.5">
        <div>
          {words.length > 0 && (
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground/60">
              {start + 1} - {end} / {words.length}
            </span>
          )}
        </div>
        <div>
          {remainingTime && (
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground/60">
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
          onClick={onStepPrev}
          disabled={!hasPrev}
          className={cn(
            'ctl size-7 sm:size-8 shrink-0 rounded-full border border-border/40 bg-foreground/5 hover:bg-foreground/15 text-muted-foreground hover:text-foreground backdrop-blur-xs transition-all flex items-center justify-center cursor-pointer shadow-2xs',
            !hasPrev && 'opacity-20 pointer-events-none',
          )}
          aria-label="Önceki bağlam sayfası"
          title="Önceki bağlam (Shift + ←)"
        >
          <ChevronLeft className="size-4" />
        </button>

        {/* Ortadaki Metin Alanı: Scrollbar kesinlikle görünmez (scrollbar-none ve overflow-hidden) */}
        <div className="flex-1 min-h-0 h-full overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex items-center">
          <p className="text-pretty text-xs leading-relaxed text-muted-foreground sm:text-[14px] md:text-[15px] w-full">
            {start > 0 && <span aria-hidden="true" className="opacity-40">… </span>}
            {slice.map((w, i) => {
              const absolute = start + i
              const current = absolute >= index && absolute < index + chunkSize
              return (
                <span key={absolute}>
                  <button
                    type="button"
                    onClick={() => onJump(absolute)}
                    aria-current={current ? 'true' : undefined}
                    className={cn(
                      'rounded-[4px] px-0.5 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer',
                      current && 'bg-pivot/15 font-medium text-foreground',
                    )}
                  >
                    {w}
                  </button>{' '}
                </span>
              )
            })}
            {end < words.length && <span aria-hidden="true" className="opacity-40">…</span>}
          </p>
        </div>

        {/* Sağ Sayfa İleri Atla Butonu: Minik ve şeffaf */}
        <button
          type="button"
          onClick={onStepNext}
          disabled={!hasNext}
          className={cn(
            'ctl size-7 sm:size-8 shrink-0 rounded-full border border-border/40 bg-foreground/5 hover:bg-foreground/15 text-muted-foreground hover:text-foreground backdrop-blur-xs transition-all flex items-center justify-center cursor-pointer shadow-2xs',
            !hasNext && 'opacity-20 pointer-events-none',
          )}
          aria-label="Sonraki bağlam sayfası"
          title="Sonraki bağlam (Shift + →)"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
