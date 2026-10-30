'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

type TapGuideProps = {
  onDismiss?: () => void
}

/**
 * Mobil RSVP Dokunma Rehberi (Tap Guide Overlay)
 *
 * 1. İlk Açılış Kontrolü: localStorage('hasSeenTapGuide') ile yalnızca ilk girişte gösterilir.
 * 2. Yarı Saydam Overlay: %30 siyah karartma ve 4px backdrop-blur ile sol %25 (Geri),
 *    orta %50 (Oynat/Durdur) ve sağ %25 (İleri) görsel rehber ikonları.
 * 3. Otomatik Kaybolma: 2 saniye sonra veya ekrana dokunulduğunda 500ms yumuşak fade-out ile kaybolur.
 */
export function TapGuide({ onDismiss }: TapGuideProps) {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 1. KURAL: İlk Açılış Kontrolü
    try {
      const hasSeen = localStorage.getItem('hasSeenTapGuide')
      if (!hasSeen) {
        setVisible(true)
        // 3. KURAL: 2 saniye (2000 ms) sonra otomatik kaybolma
        timerRef.current = setTimeout(() => {
          dismiss()
        }, 2000)
      }
    } catch {
      // localStorage erişim hatası durumunda sessizce geç
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setFading(true)
    try {
      localStorage.setItem('hasSeenTapGuide', 'true')
    } catch {
      // ignore
    }
    setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 500) // 500ms yumuşak fade-out animasyonu
  }

  if (!visible) return null

  return (
    <div
      role="tooltip"
      aria-label="Dokunma alanları rehberi: Sol geri, orta oynat/durdur, sağ ileri"
      onClick={(e) => {
        e.stopPropagation()
        dismiss()
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        dismiss()
      }}
      className={cn(
        'absolute inset-0 z-30 flex items-center justify-between overflow-hidden rounded-[inherit] bg-black/30 backdrop-blur-[4px] transition-all duration-500 ease-out select-none cursor-pointer',
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto',
      )}
    >
      {/* Sol %25 Bölge: Sola bakan ince ok ve "Geri" */}
      <div className="flex h-full w-1/4 flex-col items-center justify-center border-r border-white/10 text-white/80 transition-colors hover:bg-white/[0.04]">
        <ChevronLeft className="size-6 text-white/70 animate-pulse stroke-[1.5]" />
        <span className="mt-1 font-mono text-[11px] font-medium tracking-wider text-white/80 uppercase">
          Geri
        </span>
      </div>

      {/* Orta %50 Bölge: Hafifçe parlayan Oynat / Durdur dokunma simgesi */}
      <div className="flex h-full w-1/2 flex-col items-center justify-center text-white/95 transition-colors hover:bg-white/[0.04]">
        <div className="flex items-center justify-center size-11 rounded-full border border-white/25 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.25)] animate-pulse">
          <Play className="size-4.5 fill-white text-white ml-0.5" />
        </div>
        <span className="mt-2 font-mono text-[11px] font-medium tracking-wider text-white/90 uppercase">
          Durdur / Oynat
        </span>
      </div>

      {/* Sağ %25 Bölge: Sağa bakan ince ok ve "İleri" */}
      <div className="flex h-full w-1/4 flex-col items-center justify-center border-l border-white/10 text-white/80 transition-colors hover:bg-white/[0.04]">
        <ChevronRight className="size-6 text-white/70 animate-pulse stroke-[1.5]" />
        <span className="mt-1 font-mono text-[11px] font-medium tracking-wider text-white/80 uppercase">
          İleri
        </span>
      </div>
    </div>
  )
}
