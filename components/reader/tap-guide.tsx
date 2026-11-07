'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

type TapGuideProps = {
  onDismiss?: () => void
}

/**
 * odak Etkileşim ve Okuma Jestleri Rehberi (İlk Ziyaret Onboarding Overlay)
 * Sadeleştirilmiş, tek bakışta anlaşılan, çakışmayan ve ferah 3 bölgeli arayüz.
 */
export function TapGuide({ onDismiss }: TapGuideProps) {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDismissingRef = useRef(false)

  const dismiss = useCallback(() => {
    if (isDismissingRef.current) return
    isDismissingRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    setFading(true)
    try {
      localStorage.setItem('hasSeenTapGuide_v2', 'true')
      window.dispatchEvent(new Event('dismiss-onboarding'))
    } catch {}
    fadeTimerRef.current = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 350)
  }, [onDismiss])

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('hasSeenTapGuide_v2')
      if (!hasSeen) {
        setVisible(true)

        // 4 sn sonra otomatik ve pürüzsüz biçimde bir sonraki adıma geç
        timerRef.current = setTimeout(() => {
          if (!isDismissingRef.current) {
            isDismissingRef.current = true
            setFading(true)
            window.dispatchEvent(new Event('tap-guide-completed'))
            fadeTimerRef.current = setTimeout(() => {
              setVisible(false)
              onDismiss?.()
            }, 350)
          }
        }, 4000)
      }
    } catch {}

    const handleExternalDismiss = () => {
      dismiss()
    }
    window.addEventListener('dismiss-onboarding', handleExternalDismiss)

    return () => {
      window.removeEventListener('dismiss-onboarding', handleExternalDismiss)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [dismiss])

  if (!visible) return null

  return (
    <div
      role="tooltip"
      aria-label="odak okuma etkileşim rehberi"
      onClick={(e) => {
        e.stopPropagation()
        dismiss()
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        dismiss()
      }}
      className={cn(
        'absolute inset-0 z-30 flex items-center justify-between overflow-hidden rounded-[inherit] bg-black/70 backdrop-blur-md transition-opacity duration-350 ease-out select-none cursor-pointer touch-none overscroll-none',
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto',
      )}
    >
      {/* Sol %25 Bölge: Cümle Başı Geri Sar */}
      <div className="flex h-full w-1/4 flex-col items-center justify-center border-r border-white/10 px-1 text-white/90 transition-colors hover:bg-white/[0.04]">
        <ChevronLeft className="size-5 sm:size-6 text-white/80 animate-pulse stroke-[2]" />
        <span className="mt-1 text-center text-[10px] sm:text-xs font-semibold tracking-wide text-white">
          Cümle Başı
        </span>
        <span className="mt-0.5 text-[9px] text-white/60 font-mono">
          [←]
        </span>
      </div>

      {/* Orta %50 Bölge: Başlat / Duraklat & Hız Kontrolü */}
      <div className="flex h-full w-1/2 flex-col items-center justify-center px-2 text-white transition-colors hover:bg-white/[0.04]">
        <div className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-white/20 border border-white/35 shadow-sm backdrop-blur-xs transition-transform hover:scale-105">
          <Play className="size-4 sm:size-4.5 fill-white text-white ml-0.5" />
        </div>

        <div className="mt-1.5 flex flex-col items-center text-center leading-tight">
          <span className="text-xs sm:text-sm font-bold tracking-wide text-white drop-shadow-xs">
            Başlat / Duraklat
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/80 font-medium mt-0.5">
            Boşluk veya Dokun
          </span>
          <span className="mt-0.5 text-[9px] sm:text-[10px] text-sky-200/90 font-mono">
            <span className="sm:hidden">Hız: Dikey Kaydır ↕</span>
            <span className="hidden sm:inline">Hız: Tekerlek ↕ veya [↑/↓]</span>
          </span>
        </div>
      </div>

      {/* Sağ %25 Bölge: Sonraki Cümle */}
      <div className="flex h-full w-1/4 flex-col items-center justify-center border-l border-white/10 px-1 text-white/90 transition-colors hover:bg-white/[0.04]">
        <ChevronRight className="size-5 sm:size-6 text-white/80 animate-pulse stroke-[2]" />
        <span className="mt-1 text-center text-[10px] sm:text-xs font-semibold tracking-wide text-white">
          Sonraki Cümle
        </span>
        <span className="mt-0.5 text-[9px] text-white/60 font-mono">
          [→]
        </span>
      </div>
    </div>
  )
}
