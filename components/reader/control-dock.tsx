'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { cn } from '@/lib/utils'
import { formatRemaining } from '@/lib/rsvp'

export type ChapterMarker = {
  index: number
  title: string
  percent: number
}

type ControlDockProps = {
  ref?: Ref<HTMLElement>
  hidden: boolean
  index: number
  total: number
  wpm: number
  playing: boolean
  chunkSize?: number
  chapters?: ChapterMarker[]
  onSeek: (index: number) => void
}

export function ControlDock({
  ref,
  hidden,
  index,
  total,
  wpm,
  playing,
  chunkSize = 1,
  chapters = [],
  onSeek,
}: ControlDockProps) {
  const last = Math.max(0, total - 1)
  const progress = last > 0 ? (index / last) * 100 : 0

  // Açılır / Kapanır tek satırlık panel durumu
  const [isHovered, setIsHovered] = useState(false)
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  const isExpanded = isHovered || isManuallyExpanded

  // Okuma başladığında paneli otomatik daralt
  useEffect(() => {
    if (playing) {
      setIsHovered(false)
      setIsManuallyExpanded(false)
    }
  }, [playing])

  // Masaüstü fare ve Apple Pencil hover desteği
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 600)
  }

  // Dokunmatik / tık ile açma kapama
  const handleToggleExpand = () => {
    setIsManuallyExpanded((prev) => !prev)
  }

  // Alt sınırdan herhangi bir yerden yukarı/aşağı kaydırma jesti
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current
    touchStartYRef.current = null
    // Yukarı kaydırma: Aç
    if (deltaY < -15) {
      setIsManuallyExpanded(true)
    }
    // Aşağı kaydırma: Kapat
    else if (deltaY > 15) {
      setIsManuallyExpanded(false)
      setIsHovered(false)
    }
  }

  return (
    <footer
      ref={ref}
      aria-hidden={hidden}
      inert={hidden}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn(
        'absolute inset-x-0 bottom-0 z-30 flex flex-col items-center justify-end transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none',
        hidden && 'pointer-events-none translate-y-8 opacity-0',
      )}
    >
      {/* 1. Genişletildiğinde Çıkan Tek Satırlık Kompakt Kontrol Paneli */}
      <div
        className={cn(
          'w-full max-w-2xl px-2 sm:px-4 pb-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          isExpanded
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-3 pointer-events-none max-h-0 overflow-hidden pb-0',
        )}
      >
        <div className="panel flex h-10 sm:h-11 w-full items-center gap-2 sm:gap-3 px-3 sm:px-4 shadow-lg">
          {/* Scrubber Kaydırıcı ve YouTube Tarzı Bölüm Başlığı İşaretçileri */}
          <div className="relative flex-1 min-w-[120px] flex items-center">
            <label htmlFor="scrubber" className="sr-only">
              Metin içinde konum
            </label>
            <input
              id="scrubber"
              type="range"
              min={0}
              max={last}
              step={1}
              value={index}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="scrubber w-full relative z-10"
              style={{ '--progress': `${progress}%` } as CSSProperties}
            />

            {/* Bölüm Başlığı Çentikleri ve Tıklanabilir Duraklar (YouTube Chapters) */}
            {chapters.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 h-3 flex items-center z-20">
                {chapters.map((ch, idx) => (
                  <div
                    key={idx}
                    style={{ left: `${ch.percent}%` }}
                    className="absolute -translate-x-1/2 flex flex-col items-center group pointer-events-auto"
                  >
                    {/* Çentik Çizgisi: Üzerine gelindiğinde veya tıklandığında bölüme zıplar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSeek(ch.index)
                      }}
                      className="h-3 w-[2.5px] rounded-full bg-background/90 ring-1 ring-border/40 hover:w-[4px] hover:bg-primary transition-all cursor-pointer"
                      aria-label={`Bölüme git: ${ch.title}`}
                      title={ch.title}
                    />

                    {/* Bölüm Adı Önizleme Baloncuğu (YouTube Chapter Tooltip) */}
                    <div className="pointer-events-none absolute bottom-4.5 mb-1 hidden group-hover:flex whitespace-nowrap rounded-md bg-popover/95 border border-border px-2 py-0.5 text-[11px] font-medium text-popover-foreground shadow-md backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-30">
                      {ch.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kalan Süre */}
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground/75 whitespace-nowrap shrink-0">
            {formatRemaining(total - index - 1, wpm, chunkSize)} kaldı
          </span>

          {/* Daralt / Kapat Butonu */}
          <button
            type="button"
            onClick={() => {
              setIsManuallyExpanded(false)
              setIsHovered(false)
            }}
            className="ctl size-7 sm:size-8 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Kontrolleri daralt"
            title="Daralt"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {/* 2. Minik Şeffaf Açma/Kapatma Tuşu (Pill Tab) - SAĞ ALT KÖŞEDE (iPad Siri ve Home çubuğu çakışmasını önler) */}
      <div className="relative flex h-6 w-full items-end justify-end px-4 sm:px-6 pointer-events-auto">
        <button
          type="button"
          onClick={handleToggleExpand}
          className="ctl flex h-4 w-12 sm:w-14 items-center justify-center rounded-t-md border-t border-x border-border/40 bg-background/70 hover:bg-background/95 text-muted-foreground/70 hover:text-foreground backdrop-blur-md shadow-2xs transition-colors"
          aria-label={isExpanded ? 'Kontrol çubuğunu gizle' : 'Kontrol çubuğunu aç'}
          title={isExpanded ? 'Gizle' : 'Kontrolleri göster'}
        >
          {isExpanded ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronUp className="size-3" />
          )}
        </button>
      </div>

      {/* 3. İncecik Progress Bar Çizgisi (Her zaman en alt sınırda, bölüm kesitleriyle YouTube tarzı) */}
      <div className="relative h-[2.5px] w-full bg-foreground/10 overflow-hidden shrink-0">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
        {/* İnce Çizgi Üzerindeki Bölüm Ayrım Noktaları */}
        {chapters.map((ch, idx) => (
          <div
            key={idx}
            style={{ left: `${ch.percent}%` }}
            className="absolute inset-y-0 w-[1.5px] bg-background -translate-x-1/2"
          />
        ))}
      </div>
    </footer>
  )
}
