'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Mouse, MoveVertical, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

type TapGuideProps = {
  onDismiss?: () => void
}

/**
 * odak Etkileşim ve Kontrol Rehberi (Mobile & Desktop Responsive Overlay)
 *
 * - İlk Açılış Kontrolü: localStorage('hasSeenTapGuide') ile yalnızca ilk girişte gösterilir.
 * - Mobilde: Sol %25 Cümle Başı, Orta %50 Oynat/Durdur + Dikey Kaydırma ile Hız, Sağ %25 Sonraki Cümle.
 * - Masaüstünde: Farenin scroll/ok tuşları ile hız, boşluk ile oynat/durdur, F ile tam ekran, C ile öbek ipuçları.
 * - 3.5 saniye sonra veya herhangi bir tıklama/dokunuşta yumuşakça kaybolur.
 */
export function TapGuide({ onDismiss }: TapGuideProps) {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('hasSeenTapGuide')
      if (!hasSeen) {
        setVisible(true)
        timerRef.current = setTimeout(() => {
          dismiss()
        }, 3600)
      }
    } catch {}

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setFading(true)
    try {
      localStorage.setItem('hasSeenTapGuide', 'true')
    } catch {}
    setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 500)
  }

  if (!visible) return null

  return (
    <div
      role="tooltip"
      aria-label="Etkileşim rehberi: Sol cümle başı, orta oynat/durdur ve hız kontrolü, sağ sonraki cümle"
      onClick={(e) => {
        e.stopPropagation()
        dismiss()
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        dismiss()
      }}
      className={cn(
        'absolute inset-0 z-30 flex items-center justify-between overflow-hidden rounded-[inherit] bg-black/45 backdrop-blur-[5px] transition-all duration-500 ease-out select-none cursor-pointer touch-none overscroll-none',
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto',
      )}
    >
      {/* Sol %25 Bölge: Cümle Başı Geri Sar */}
      <div className="flex h-full w-1/4 flex-col items-center justify-center border-r border-white/10 px-1 text-white/90 transition-colors hover:bg-white/[0.04]">
        <ChevronLeft className="size-6 sm:size-7 text-white/80 animate-pulse stroke-[1.5]" />
        <span className="mt-1 text-center font-mono text-[10px] sm:text-xs font-semibold tracking-wide text-white">
          Cümle Başı
        </span>
        <span className="mt-0.5 hidden sm:inline text-[9px] text-white/60 font-mono">
          [←] veya Tık
        </span>
      </div>

      {/* Orta %50 Bölge: Oynat / Durdur + Hız Kontrolü Animasyonu */}
      <div className="relative flex h-full w-1/2 flex-col items-center justify-center px-2 text-white transition-colors hover:bg-white/[0.04]">
        {/* Üstte Hız Değiştirme Animasyonu (Mobil: Swipe ↕ / Masaüstü: Scroll ↕) */}
        <div className="mb-1.5 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-white/90 shadow-xs backdrop-blur-xs">
          {/* Mobil İkonu */}
          <span className="flex sm:hidden items-center gap-0.5">
            <MoveVertical className="size-3 animate-bounce text-sky-400" />
            <span>Kaydır: Hız (WPM)</span>
          </span>
          {/* Masaüstü İkonu */}
          <span className="hidden sm:flex items-center gap-1">
            <Mouse className="size-3 text-sky-400" />
            <span>Tekerlek ↕ veya [↑/↓]: Hız</span>
          </span>
        </div>

        {/* Orta Oynat / Durdur Buton Simgesi */}
        <div className="flex size-9 sm:size-11 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-[0_0_24px_rgba(255,255,255,0.3)] animate-pulse">
          <Play className="size-4 sm:size-4.5 fill-white text-white ml-0.5" />
        </div>
        <span className="mt-1 font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-white">
          Oynat / Durdur
        </span>
        <span className="mt-0.5 hidden sm:inline text-[9px] text-white/60 font-mono">
          [Boşluk] veya Tık
        </span>

        {/* Masaüstü Ek Tuş Kısayolları (F ve C) */}
        <div className="mt-1.5 hidden sm:flex items-center gap-2 text-[9px] text-white/70">
          <span><kbd className="rounded bg-white/20 px-1 py-0.2 font-mono text-[8px] text-white">F</kbd> Tam Ekran</span>
          <span>•</span>
          <span><kbd className="rounded bg-white/20 px-1 py-0.2 font-mono text-[8px] text-white">C</kbd> Öbek</span>
        </div>
      </div>

      {/* Sağ %25 Bölge: Sonraki Cümle */}
      <div className="flex h-full w-1/4 flex-col items-center justify-center border-l border-white/10 px-1 text-white/90 transition-colors hover:bg-white/[0.04]">
        <ChevronRight className="size-6 sm:size-7 text-white/80 animate-pulse stroke-[1.5]" />
        <span className="mt-1 text-center font-mono text-[10px] sm:text-xs font-semibold tracking-wide text-white">
          Sonraki Cümle
        </span>
        <span className="mt-0.5 hidden sm:inline text-[9px] text-white/60 font-mono">
          [→] veya Tık
        </span>
      </div>
    </div>
  )
}
