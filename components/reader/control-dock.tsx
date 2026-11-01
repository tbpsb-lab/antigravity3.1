'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { cn } from '@/lib/utils'
import { formatRemaining } from '@/lib/rsvp'

type ControlDockProps = {
  ref?: Ref<HTMLElement>
  hidden: boolean
  index: number
  total: number
  wpm: number
  playing: boolean
  chunkSize?: number
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

  // Alt sınırdan yukarı/aşağı kaydırma jesti
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
      className={cn(
        'absolute inset-x-0 bottom-0 z-30 flex flex-col items-center justify-end transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none',
        hidden && 'pointer-events-none translate-y-8 opacity-0',
      )}
    >
      {/* 1. Genişletildiğinde Çıkan Tek Satırlık Kompakt Kontrol Paneli (Sağ/sol butonlar bağlama taşındı) */}
      <div
        className={cn(
          'w-full max-w-2xl px-2 sm:px-4 pb-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          isExpanded
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-3 pointer-events-none max-h-0 overflow-hidden pb-0',
        )}
      >
        <div className="panel flex h-10 sm:h-11 w-full items-center gap-2 sm:gap-3 px-2.5 sm:px-4 shadow-lg">
          {/* Konum / Toplam */}
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground whitespace-nowrap shrink-0">
            {total === 0 ? 0 : index + 1}/{total}
            {chunkSize > 1 ? ` (${chunkSize}K)` : ''}
          </span>

          {/* Scrubber Kaydırıcı (Tüm orta boşluğu doldurur) */}
          <div className="flex-1 min-w-[70px] flex items-center">
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
              className="scrubber w-full"
              style={{ '--progress': `${progress}%` } as CSSProperties}
            />
          </div>

          {/* Kalan Süre */}
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground/75 whitespace-nowrap hidden sm:inline shrink-0">
            {formatRemaining(total - index - 1, wpm, chunkSize)} kaldı
          </span>

          {/* Hız Göstergesi */}
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground whitespace-nowrap shrink-0">
            {wpm} <span className="text-[10px] font-normal text-muted-foreground">k/dk</span>
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

      {/* 2. Minik Şeffaf Açma/Kapatma Tuşu (Pill Tab) */}
      <div
        className="relative flex w-full justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={handleToggleExpand}
          className="ctl flex h-4 w-12 sm:w-16 items-center justify-center rounded-t-md border-t border-x border-border/40 bg-background/60 hover:bg-background/90 text-muted-foreground/60 hover:text-foreground backdrop-blur-md transition-colors"
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

      {/* 3. İncecik Progress Bar Çizgisi (Her zaman en alt sınırda görünür) */}
      <div className="h-[2.5px] w-full bg-foreground/10 overflow-hidden shrink-0">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </footer>
  )
}
