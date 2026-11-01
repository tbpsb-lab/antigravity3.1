'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { cn } from '@/lib/utils'

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
  const footerRef = useRef<HTMLElement | null>(null)

  const isExpanded = isHovered || isManuallyExpanded

  // Okuma başladığında paneli otomatik daralt
  useEffect(() => {
    if (playing) {
      setIsHovered(false)
      setIsManuallyExpanded(false)
    }
  }, [playing])

  // Masaüstü fare ve Apple Pencil hover desteği (Dokunmatik cihazlarda hover ile kilitlenmeyi engelle)
  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      return
    }
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 600)
  }

  // Dokunmatik / tık ile açma kapama (Kapatırken hover bayrağını da kesinlikle temizler)
  const handleToggleExpand = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation()
    }
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (isExpanded) {
      setIsHovered(false)
      setIsManuallyExpanded(false)
    } else {
      setIsManuallyExpanded(true)
    }
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
    // Yukarı kaydırma (10px): Aç
    if (deltaY < -10) {
      setIsManuallyExpanded(true)
    }
    // Aşağı kaydırma (10px): Kapat
    else if (deltaY > 10) {
      setIsManuallyExpanded(false)
      setIsHovered(false)
    }
  }

  // Panel açıkken dışarıya dokunulduğunda/tıklandığında otomatik daralt
  useEffect(() => {
    if (!isExpanded) return

    const handlePointerDownOutside = (e: PointerEvent) => {
      const footerEl = footerRef.current
      if (footerEl && !footerEl.contains(e.target as Node)) {
        setIsManuallyExpanded(false)
        setIsHovered(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDownOutside)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside)
    }
  }, [isExpanded])

  // --- KESİNTİSİZ AKICI VE BÖLÜM KİLİTLENMESİ YAŞATMAYAN POINTER SCRUBBER ---
  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const [hoverInfo, setHoverInfo] = useState<{ title: string; percent: number } | null>(null)

  const seekFromClientX = useCallback(
    (clientX: number, snap = true) => {
      const track = trackRef.current
      if (!track || last <= 0) return

      const rect = track.getBoundingClientRect()
      if (rect.width <= 0) return

      const rawPct = (clientX - rect.left) / rect.width
      const clampedPct = Math.max(0, Math.min(1, rawPct))
      const targetPercent = clampedPct * 100

      // Yakın bir bölüm çentiği varsa (%2.2 toleransla) tam bölümün başlangıç indeksine kenetlen
      if (snap && chapters.length > 0) {
        const closeChapter = chapters.find((ch) => Math.abs(ch.percent - targetPercent) < 2.2)
        if (closeChapter) {
          onSeek(closeChapter.index)
          return
        }
      }

      const targetIdx = Math.round(clampedPct * last)
      onSeek(targetIdx)
    },
    [last, chapters, onSeek],
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    isDraggingRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    seekFromClientX(e.clientX, true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track) return

    if (isDraggingRef.current) {
      seekFromClientX(e.clientX, false)
    } else if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      const rect = track.getBoundingClientRect()
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      const activeChapter =
        chapters.slice().reverse().find((ch) => ch.percent <= pct + 0.5) || chapters[0]
      if (activeChapter) {
        setHoverInfo({
          title: activeChapter.title,
          percent: pct,
        })
      } else {
        setHoverInfo(null)
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  const handlePointerLeave = () => {
    if (!isDraggingRef.current) {
      setHoverInfo(null)
    }
  }

  return (
    <footer
      ref={(el) => {
        footerRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = el
      }}
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
      {/* 1. Genişletildiğinde Çıkan Tek Satırlık Kompakt Kontrol Paneli - Okuma Penceresi Hizasına Uyumlu */}
      <div
        className={cn(
          'w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl px-4 sm:px-8 pb-1.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          isExpanded
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-3 pointer-events-none max-h-0 overflow-hidden pb-0',
        )}
      >
        <div className="panel flex h-11 sm:h-12 w-full items-center gap-3 sm:gap-4 px-3.5 sm:px-5 shadow-xl">
          {/* Kesintisiz Pointer Tabanlı Scrubber ve YouTube Tarzı Bölüm İşaretçileri */}
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Metin içinde konum"
            aria-valuemin={0}
            aria-valuemax={last}
            aria-valuenow={index}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') onSeek(Math.max(0, index - 1))
              if (e.key === 'ArrowRight') onSeek(Math.min(last, index + 1))
              if (e.key === 'Home') onSeek(0)
              if (e.key === 'End') onSeek(last)
            }}
            className="relative flex-1 h-9 flex items-center cursor-pointer touch-none select-none py-2"
          >
            {/* Scrubber Ray Arka Planı (Track Background) */}
            <div className="relative w-full h-1.5 rounded-full bg-foreground/15 overflow-hidden">
              {/* Aktif İlerleme Doldurma Çubuğu (Fill) */}
              <div
                className="h-full bg-primary transition-[width] duration-75 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* YouTube Tarzı Bölüm Başlığı Çentikleri (Dividers - Asla dokunmayı/kaydırmayı engellemez) */}
            {chapters.map((ch, idx) => (
              <div
                key={idx}
                style={{ left: `${ch.percent}%` }}
                className="pointer-events-none absolute h-3.5 w-[2.5px] rounded-full bg-background ring-1 ring-border/50 -translate-x-1/2 z-10"
                aria-hidden="true"
              />
            ))}

            {/* Scrubber Tutamacı (Thumb - Yumuşak ve sürüklemede büyüme efekti) */}
            <div
              style={{ left: `${progress}%` }}
              className="pointer-events-none absolute -translate-x-1/2 size-4 sm:size-4.5 rounded-full bg-foreground border-2 border-background shadow-md z-20 transition-transform active:scale-125"
            />

            {/* YouTube Tarzı Bölüm Adı Önizleme Baloncuğu (Tooltip) */}
            {hoverInfo && (
              <div
                style={{ left: `${hoverInfo.percent}%` }}
                className="pointer-events-none absolute bottom-8 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover/95 border border-border px-2.5 py-1 text-[11px] font-medium text-popover-foreground shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 z-30"
              >
                {hoverInfo.title}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Büyütülmüş Minik Şeffaf Açma/Kapatma Tuşu - OKUMA PENCERESİNİN SAĞ ALT HİZASINDA */}
      <div className="relative flex h-7 sm:h-8 w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl items-end justify-end px-4 sm:px-8 pointer-events-auto">
        <button
          type="button"
          onClick={handleToggleExpand}
          onTouchStart={(e) => {
            e.stopPropagation()
          }}
          onTouchEnd={(e) => {
            e.stopPropagation()
            e.preventDefault()
            handleToggleExpand(e)
          }}
          className="ctl flex h-5 sm:h-6 w-20 sm:w-24 items-center justify-center rounded-t-lg border-t border-x border-border/50 bg-background/80 hover:bg-background/95 text-muted-foreground hover:text-foreground backdrop-blur-md shadow-xs transition-colors cursor-pointer"
          aria-label={isExpanded ? 'İlerleme çubuğunu gizle' : 'İlerleme çubuğunu aç'}
          title={isExpanded ? 'Gizle' : 'İlerleme çubuğunu göster'}
        >
          {isExpanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronUp className="size-3.5" />
          )}
        </button>
      </div>

      {/* 3. İncecik Progress Bar Çizgisi (Her zaman en alt sınırda, bölüm kesitleriyle) */}
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
