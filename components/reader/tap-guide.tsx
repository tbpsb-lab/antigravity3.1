'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Mouse, MoveVertical, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

type TapGuideProps = {
  onDismiss?: () => void
}

/**
 * odak Etkileşim ve Kontrol Rehberi (Mobile & Desktop Responsive Overlay)
 */
export function TapGuide({ onDismiss }: TapGuideProps) {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const [desktopStep, setDesktopStep] = useState<0 | 1>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    setFading(true)
    try {
      localStorage.setItem('hasSeenTapGuide', 'true')
    } catch {}
    fadeTimerRef.current = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 500)
  }, [onDismiss])

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('hasSeenTapGuide')
      if (!hasSeen) {
        setVisible(true)
        stepTimerRef.current = setTimeout(() => {
          setDesktopStep(1)
        }, 2400)

        timerRef.current = setTimeout(() => {
          dismiss()
        }, 5400)
      }
    } catch {}

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [dismiss])

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
        <div
          className={cn(
            'mb-2 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] sm:text-[11px] font-medium transition-all duration-400 backdrop-blur-xs',
            desktopStep === 0
              ? 'border-sky-400/70 bg-sky-500/25 text-white shadow-[0_0_16px_rgba(56,189,248,0.4)] scale-105'
              : 'border-white/20 bg-white/10 text-white/70 scale-95 opacity-80 sm:opacity-70',
          )}
        >
          <span className="flex sm:hidden items-center gap-1">
            <MoveVertical className="size-3.5 animate-bounce text-sky-300" />
            <span className="font-semibold">Kaydır: Hız (WPM)</span>
          </span>

          <span className="hidden sm:flex items-center gap-1.5">
            <Mouse className={cn('size-3.5 text-sky-300', desktopStep === 0 && 'animate-bounce')} />
            <span className="font-semibold">Tekerlek ↕ veya [↑/↓] : Hız</span>
          </span>
        </div>

        <div
          className={cn(
            'flex size-9 sm:size-11 items-center justify-center rounded-full border transition-all duration-400',
            desktopStep === 1
              ? 'border-emerald-400/80 bg-emerald-500/25 shadow-[0_0_24px_rgba(52,211,153,0.5)] scale-110'
              : 'border-white/30 bg-white/15 shadow-[0_0_16px_rgba(255,255,255,0.25)]',
          )}
        >
          <Play className="size-4 sm:size-4.5 fill-white text-white ml-0.5" />
        </div>

        <div className="mt-1.5 flex flex-col items-center">
          <span
            className={cn(
              'font-mono text-[10px] sm:text-xs font-semibold tracking-wider transition-colors duration-400',
              desktopStep === 1 ? 'text-emerald-200' : 'text-white',
            )}
          >
            Oynat / Durdur
          </span>
          <span className="mt-0.5 hidden sm:inline text-[9px] text-white/70 font-mono">
            [Boşluk] veya Tık
          </span>
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
