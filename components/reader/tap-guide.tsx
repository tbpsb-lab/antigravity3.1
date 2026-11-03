'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, FileText, Mouse, MoveVertical, Play, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type TapGuideProps = {
  onDismiss?: () => void
}

/**
 * odak Etkileşim ve Tanıtım Rehberi (İlk Ziyaret Onboarding Overlay)
 * Adım 0: Hız Kontrolü (Kaydırma / Tekerlek / Ok Tuşları)
 * Adım 1: Oynat / Durdur & Cümle Gezinme
 * Adım 2: Metin, PDF & Web/YouTube İçe Aktarma
 */
export function TapGuide({ onDismiss }: TapGuideProps) {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const [guideStep, setGuideStep] = useState<0 | 1 | 2>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepTimer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepTimer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (stepTimer1Ref.current) clearTimeout(stepTimer1Ref.current)
    if (stepTimer2Ref.current) clearTimeout(stepTimer2Ref.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    setFading(true)
    try {
      localStorage.setItem('hasSeenTapGuide', 'true')
    } catch {}
    fadeTimerRef.current = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 450)
  }, [onDismiss])

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem('hasSeenTapGuide')
      if (!hasSeen) {
        setVisible(true)

        // Adım 1: Oynat / Durdur (2.4 sn sonra)
        stepTimer1Ref.current = setTimeout(() => {
          setGuideStep(1)
        }, 2400)

        // Adım 2: Metin & PDF Ekle (4.8 sn sonra)
        stepTimer2Ref.current = setTimeout(() => {
          setGuideStep(2)
        }, 4800)

        // Otomatik Kapanış (8.4 sn sonra)
        timerRef.current = setTimeout(() => {
          dismiss()
        }, 8400)
      }
    } catch {}

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (stepTimer1Ref.current) clearTimeout(stepTimer1Ref.current)
      if (stepTimer2Ref.current) clearTimeout(stepTimer2Ref.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [dismiss])

  if (!visible) return null

  return (
    <div
      role="tooltip"
      aria-label="odak etkileşim ve içerik tanıtım rehberi"
      onClick={(e) => {
        e.stopPropagation()
        dismiss()
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        dismiss()
      }}
      className={cn(
        'absolute inset-0 z-30 flex items-center justify-between overflow-hidden rounded-[inherit] bg-black/60 backdrop-blur-[6px] transition-all duration-400 ease-out select-none cursor-pointer touch-none overscroll-none',
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto',
      )}
    >
      {/* 3 ADIM İLERLEME NOKTALARI (ALT ORTA) */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
        {[0, 1, 2].map((s) => (
          <span
            key={s}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              guideStep === s
                ? 'w-5 bg-primary shadow-[0_0_10px_rgba(56,189,248,0.8)]'
                : 'w-1.5 bg-white/30',
            )}
          />
        ))}
      </div>

      {/* ADIM 0 VE 1: OKUMA ALANI JESTLERİ VE KONTROLLERİ */}
      {guideStep !== 2 ? (
        <>
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
                guideStep === 0
                  ? 'border-sky-400/70 bg-sky-500/25 text-white shadow-[0_0_16px_rgba(56,189,248,0.4)] scale-105'
                  : 'border-white/20 bg-white/10 text-white/70 scale-95 opacity-80 sm:opacity-70',
              )}
            >
              <span className="flex sm:hidden items-center gap-1">
                <MoveVertical className="size-3.5 animate-bounce text-sky-300" />
                <span className="font-semibold">Kaydır: Hız (WPM)</span>
              </span>

              <span className="hidden sm:flex items-center gap-1.5">
                <Mouse className={cn('size-3.5 text-sky-300', guideStep === 0 && 'animate-bounce')} />
                <span className="font-semibold">Tekerlek ↕ veya [↑/↓] : Hız</span>
              </span>
            </div>

            <div
              className={cn(
                'flex size-9 sm:size-11 items-center justify-center rounded-full border transition-all duration-400',
                guideStep === 1
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
                  guideStep === 1 ? 'text-emerald-200' : 'text-white',
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
        </>
      ) : (
        /* ADIM 2: METİN, PDF & İÇERİK MERKEZİ TANITIMI */
        <div className="relative w-full h-full flex flex-col items-center justify-center px-4 animate-in zoom-in-95 fade-in duration-400 text-center">
          {/* Sağ Üstteki Butona Yönlendiren İşaret Rozeti */}
          <div className="absolute top-2.5 right-3 sm:top-3 sm:right-6 flex items-center gap-1 rounded-full bg-primary/20 border border-primary/50 px-2.5 py-0.5 text-primary text-[10px] sm:text-xs font-semibold shadow-[0_0_16px_rgba(56,189,248,0.4)] animate-bounce pointer-events-none">
            <span>Metin & PDF [ 📄 ]</span>
            <ArrowUpRight className="size-3.5" />
          </div>

          {/* Merkez Bilgi Kartı */}
          <div className="flex flex-col items-center max-w-sm">
            <div className="size-11 sm:size-13 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mb-2 shadow-[0_0_24px_rgba(56,189,248,0.4)]">
              <FileText className="size-5 sm:size-6 text-primary animate-pulse" />
            </div>

            <div className="flex items-center gap-1.5 text-primary text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider mb-0.5">
              <Sparkles className="size-3" />
              <span>İçerik Merkezi</span>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Kendi Metninizi veya PDF Ekleyin
            </h4>

            <p className="text-[11px] sm:text-xs text-white/85 mt-1 leading-relaxed font-normal">
              Sağ üstteki <strong>[ 📄 ]</strong> simgesinden dilediğiniz metni yapıştırabilir, <strong>PDF</strong> yükleyebilir veya <strong>Web/YouTube</strong> linklerini anında damıtabilirsiniz.
            </p>

            <span className="mt-2 text-[10px] text-white/60 font-mono">
              Kapatmak için ekrana tıklayın
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
