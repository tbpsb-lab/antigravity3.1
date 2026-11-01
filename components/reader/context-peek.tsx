'use client'

import { useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useElementSize } from '@/lib/use-element-size'

type ContextPeekProps = {
  words: string[]
  index: number
  chunkSize?: number
  visible: boolean
  onJump: (index: number) => void
  onVisibleCountChange?: (count: number) => void
}

export function ContextPeek({
  words,
  index,
  chunkSize = 1,
  visible,
  onJump,
  onVisibleCountChange,
}: ContextPeekProps) {
  const [containerRef, containerSize] = useElementSize<HTMLDivElement>()

  // Konteyner boyutuna göre ekranda dikey ve yatay eksende ne kadar kelime alabileceğini dinamik hesapla
  // Masaüstü, tablet ve mobil ekran boyutlarında alan ne kadar elveriyorsa o kadar kelime sığdırır.
  const capacity = useMemo(() => {
    if (!containerSize.width || !containerSize.height) {
      return 60 // İlk yükleme / SSR için dengeli varsayılan
    }
    // Başlık ve boşluklar için ~36px düş
    const availableHeight = Math.max(30, containerSize.height - 36)
    // 14-15px yazı boyutu ve leading-relaxed (~24px satır yüksekliği)
    const lines = Math.max(1, Math.floor(availableHeight / 24))
    // Konteyner genişliği ve Türkçe kelime başı ortalama genişlik (~56px)
    const availableWidth = Math.max(180, containerSize.width - 16)
    const wordsPerLine = Math.max(4, Math.floor(availableWidth / 56))
    return Math.max(15, lines * wordsPerLine)
  }, [containerSize.width, containerSize.height])

  // Kapasite değiştikçe ana bileşene bildir (alttaki <> butonlarının adımı buna göre güncellensin)
  useEffect(() => {
    if (capacity > 0 && onVisibleCountChange) {
      onVisibleCountChange(capacity)
    }
  }, [capacity, onVisibleCountChange])

  // Sayfa bazlı dilimleme:
  // Okuma esnasında kelimeler sürekli kayıp titremez; vurgu stabil akarken,
  // alttaki <> butonlarına basıldığında tam bu ekranda görünen blok (capacity) kadar ileri/geri atlar.
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
        'flex flex-1 min-h-0 flex-col overflow-hidden transition-opacity duration-300 select-none',
        visible ? 'opacity-100' : 'pointer-events-none hidden opacity-0',
      )}
    >
      {/* Üst Bilgi Başlığı (Bağlam ve Konum Göstergesi) */}
      <div className="flex items-center justify-between mb-1 mt-2 px-1 shrink-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          Bağlam
        </p>
        {words.length > 0 && (
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground/60">
            {start + 1} - {end} / {words.length}
          </span>
        )}
      </div>

      {/* Esnek Metin Alanı (Alttaki dock'a kadar esner, gerekirse yumuşak kaydırılabilir) */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
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
    </div>
  )
}
