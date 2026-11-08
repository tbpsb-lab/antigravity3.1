'use client'

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type TouchEvent,
} from 'react'
import { cn } from '@/lib/utils'
import { calculateTurkishORP, formatBionicChunk, WPM_STEP, type ChunkItem } from '@/lib/rsvp'
import { triggerHaptic } from '@/lib/haptics'
import { useElementSize } from '@/lib/use-element-size'
import { TapGuide } from './tap-guide'
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react'

type RsvpDisplayProps = {
  word: string
  chunk?: ChunkItem
  chunkSize?: number
  bionicEnabled?: boolean
  playing: boolean
  wpm: number
  index?: number
  total?: number
  isResting?: boolean
  fontFamily?: string
  fontScale: number
  maxSide: number
  isPulsing?: boolean
  onToggle: () => void
  onPrev?: () => void
  onNext?: () => void
  onSeek?: (index: number) => void
  onWpmChange?: (delta: number) => void
  onWpmSet?: (newWpm: number) => void
  onWpmDragEnd?: () => void
  onCycleChunkSize?: () => void
}

export const RsvpDisplay = memo(function RsvpDisplay({
  word,
  chunk,
  chunkSize = 1,
  bionicEnabled = true,
  playing,
  wpm,
  index = 0,
  total = 0,
  fontFamily,
  fontScale,
  isPulsing = false,
  onToggle,
  onPrev,
  onNext,
  onSeek,
  onWpmSet,
  onWpmDragEnd,
  onCycleChunkSize,
}: RsvpDisplayProps) {
  const [containerRef, containerSize] = useElementSize<HTMLDivElement>()

  // İlerleme Çubuğu İki Aşamalı Güvenli Etkinleştirme & Sürükleme Kontrolleri
  const [isBarActive, setIsBarActive] = useState(false)
  const isBarActiveRef = useRef(false)
  const barActiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isScrubbing, setIsScrubbing] = useState(false)
  const isScrubbingRef = useRef(false)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const lastScrubIndexRef = useRef<number>(-1)
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null)
  const activationTimeRef = useRef<number>(0)

  // İlk Ziyaret İçin 1K / 2K / 3K / 4K Kelime Öbeği Tanıtım Penceresi (Onboarding Callout)
  const [showChunkCallout, setShowChunkCallout] = useState(false)
  const [chunkCalloutFading, setChunkCalloutFading] = useState(false)
  const chunkCalloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chunkCalloutFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chunkCalloutDismissedRef = useRef(false)
  const chunkCalloutRef = useRef<HTMLDivElement>(null)

  const dismissChunkCallout = useCallback(() => {
    if (chunkCalloutDismissedRef.current) return
    chunkCalloutDismissedRef.current = true
    if (chunkCalloutTimerRef.current) clearTimeout(chunkCalloutTimerRef.current)
    if (chunkCalloutFadeTimerRef.current) clearTimeout(chunkCalloutFadeTimerRef.current)
    setChunkCalloutFading(true)
    try {
      window.dispatchEvent(new Event('chunk-guide-completed'))
    } catch {}
    chunkCalloutFadeTimerRef.current = setTimeout(() => {
      setShowChunkCallout(false)
    }, 350)
  }, [])

  useEffect(() => {
    // TapGuide (Okuma jestleri kılavuzu) bittiğinde 1K kelime öbeği tanıtımını aç
    const handleTapGuideCompleted = () => {
      try {
        const hasSeen = localStorage.getItem('hasSeenTapGuide_v2')
        if (!hasSeen && !chunkCalloutDismissedRef.current && !playing) {
          setShowChunkCallout(true)
          if (chunkCalloutTimerRef.current) clearTimeout(chunkCalloutTimerRef.current)
          chunkCalloutTimerRef.current = setTimeout(() => {
            dismissChunkCallout()
          }, 2200)
        }
      } catch {}
    }

    // Güvenlik yedek zamanlayıcısı: TapGuide kaçırılırsa 5 sn sonra devreye girer
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    try {
      const hasSeen = localStorage.getItem('hasSeenTapGuide_v2')
      if (!hasSeen) {
        fallbackTimer = setTimeout(() => {
          handleTapGuideCompleted()
        }, 5000)
      }
    } catch {}

    window.addEventListener('tap-guide-completed', handleTapGuideCompleted)
    return () => {
      window.removeEventListener('tap-guide-completed', handleTapGuideCompleted)
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
  }, [playing, dismissChunkCallout])

  // Okuma başladığında veya dışarıdan onboarding kapatıldığında callout'u kapat
  useEffect(() => {
    if (playing && showChunkCallout) {
      dismissChunkCallout()
    }
  }, [playing, showChunkCallout, dismissChunkCallout])

  useEffect(() => {
    const handleExternalDismiss = () => {
      if (chunkCalloutDismissedRef.current) return
      chunkCalloutDismissedRef.current = true
      if (chunkCalloutTimerRef.current) clearTimeout(chunkCalloutTimerRef.current)
      if (chunkCalloutFadeTimerRef.current) clearTimeout(chunkCalloutFadeTimerRef.current)
      setChunkCalloutFading(true)
      chunkCalloutFadeTimerRef.current = setTimeout(() => {
        setShowChunkCallout(false)
      }, 350)
    }
    window.addEventListener('dismiss-onboarding', handleExternalDismiss)
    return () => {
      window.removeEventListener('dismiss-onboarding', handleExternalDismiss)
      if (chunkCalloutTimerRef.current) clearTimeout(chunkCalloutTimerRef.current)
      if (chunkCalloutFadeTimerRef.current) clearTimeout(chunkCalloutFadeTimerRef.current)
    }
  }, [])

  // Callout açıkken sayfanın herhangi bir yerine tıklandığında kapat
  useEffect(() => {
    if (!showChunkCallout) return

    const handlePointerDown = (e: globalThis.PointerEvent) => {
      if (chunkCalloutRef.current && !chunkCalloutRef.current.contains(e.target as Node)) {
        dismissChunkCallout()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [showChunkCallout, dismissChunkCallout])



  const activeText = chunk ? chunk.text : word
  const isFootnote = chunk?.isFootnote || /^\[dipnot/i.test(activeText)
  const isSingleWordMode = chunkSize === 1 && !isFootnote

  const cleanDisplayText = activeText
  const displayWords = chunk ? chunk.words : [word]

  // Single word Turkish ORP split (Noktalamadan arındırılmış Türkçe kök odaklı ORP)
  const { leftPart, focusChar, rightPart } = calculateTurkishORP(cleanDisplayText)
  const maxSideChars = Math.max(Array.from(leftPart).length, Array.from(rightPart).length, 1)

  // Yatay taşmayı %100 önleyen dinamik Fit-to-Width oranı (Mobil + Masaüstü md: font tabanlarıyla tam uyumlu)
  // Kelime sayısına göre font büyüklüğünü %20'şer puan düşür:
  // - 1 kelime: fontScale (örn. %150 ise %150, %100 ise %100)
  // - 2 kelime: fontScale - 0.20 (örn. %150 -> %130, %100 -> %80)
  // - 3 kelime: fontScale - 0.40 (örn. %150 -> %110, %100 -> %60)
  // - 1 kelimeye tekrar dönünce başlangıçtaki fontScale değerine otomatik çıkar.
  // Bu sayede yatay eksende sıkışmalar önlenir ve görüş alanı rahatlar.
  const chunkFontDelta = chunkSize === 2 ? -0.2 : chunkSize >= 3 ? -0.4 : 0
  const effectiveFontScale = Math.max(0.4, Math.round((fontScale + chunkFontDelta) * 100) / 100)

  let autoFitScale = 1
  const containerWidth = containerSize.width || 0

  if (containerWidth > 0) {
    const isDesktop = containerWidth >= 1024
    const isTablet = containerWidth >= 680 && containerWidth < 1024
    const padding = containerWidth < 540 ? 16 : 36
    const availableHalfWidth = Math.max(80, containerWidth / 2 - padding)
    const availableFullWidth = Math.max(160, containerWidth - padding * 2)

    // Tablet ve telefon görünümünde varsayılan font tabanı %20 artırıldı, masaüstü font tabanı aynı kaldı
    const estimatedBasePx = isDesktop
      ? Math.min(57.6, Math.max(30.7, containerWidth * 0.0544))
      : isTablet
        ? Math.min(69.1, Math.max(36.8, containerWidth * 0.065))
        : Math.min(53.8, Math.max(26.9, containerWidth * 0.05))

    const currentPx = estimatedBasePx * effectiveFontScale

    if (isSingleWordMode) {
      // Tek kelime modu: Merkeze göre kanat hesabı (geniş karakterler için 0.66ch güvenli çarpan)
      const requiredHalfWidth = maxSideChars * currentPx * 0.66
      if (requiredHalfWidth > availableHalfWidth) {
        autoFitScale = Math.min(1, Math.max(0.28, availableHalfWidth / requiredHalfWidth))
      }
    } else {
      // Çoklu kelime modu: Tüm öbeğin genişliği hesabı
      const totalChars = Array.from(cleanDisplayText).length
      const requiredFullWidth = totalChars * currentPx * 0.58
      if (requiredFullWidth > availableFullWidth) {
        autoFitScale = Math.min(1, Math.max(0.28, availableFullWidth / requiredFullWidth))
      }
    }
  }

  const finalScale = effectiveFontScale * autoFitScale

  const wordStyle = {
    fontSize: `calc(var(--word-base) * ${finalScale})`,
    fontFamily: fontFamily || 'var(--reader-font)',
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum", "zero"',
    fontVariantLigatures: 'none',
  } as CSSProperties

  const resetBarActiveTimer = useCallback(() => {
    if (barActiveTimerRef.current) clearTimeout(barActiveTimerRef.current)
    barActiveTimerRef.current = setTimeout(() => {
      setIsBarActive(false)
      isBarActiveRef.current = false
    }, 6000)
  }, [])

  useEffect(() => {
    if (playing) {
      setIsBarActive(false)
      isBarActiveRef.current = false
      if (barActiveTimerRef.current) clearTimeout(barActiveTimerRef.current)
    }
  }, [playing])

  useEffect(() => {
    if (!isBarActive) return
    const handleOutsidePointer = (e: MouseEvent | TouchEvent | Event) => {
      if (isScrubbingRef.current) return
      // Tablet ve mobilde ilk dokunuş anında veya 400ms içinde tetiklenen sentetik dış tıklamaları yok say
      if (Date.now() - activationTimeRef.current < 450) return
      if (progressBarRef.current && !progressBarRef.current.contains(e.target as Node)) {
        setIsBarActive(false)
        isBarActiveRef.current = false
        if (barActiveTimerRef.current) clearTimeout(barActiveTimerRef.current)
      }
    }
    window.addEventListener('pointerdown', handleOutsidePointer)
    return () => {
      window.removeEventListener('pointerdown', handleOutsidePointer)
    }
  }, [isBarActive])

  useEffect(() => {
    return () => {
      if (barActiveTimerRef.current) clearTimeout(barActiveTimerRef.current)
    }
  }, [])

  const seekFromPointerEvent = useCallback(
    (clientX: number) => {
      const el = progressBarRef.current
      if (!el || !onSeek || total <= 0) return
      if (total === 1) {
        onSeek(0)
        return
      }
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0) return
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const targetIdx = Math.max(0, Math.min(total - 1, Math.round(pct * (total - 1))))
      if (targetIdx !== lastScrubIndexRef.current) {
        lastScrubIndexRef.current = targetIdx
        onSeek(targetIdx)
        triggerHaptic('step')
      }
    },
    [onSeek, total],
  )

  const handleProgressPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY }

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}

    // Bar zaten aktifse: İkinci dokunuşta hemen konumu güncelle ve sürüklemeyi başlat
    if (isBarActiveRef.current) {
      // Sentetik mükerrer event'leri önle (aynı dokunuşun 300ms içinde çift algılanmasını engelle)
      if (Date.now() - activationTimeRef.current < 320) return
      isScrubbingRef.current = true
      setIsScrubbing(true)
      resetBarActiveTimer()
      seekFromPointerEvent(e.clientX)
      return
    }

    // Bar pasifken: İlk dokunuşta barı aktif et ve büyüt (kazara konum atlatmaz!)
    activationTimeRef.current = Date.now()
    isBarActiveRef.current = true
    setIsBarActive(true)
    triggerHaptic('tap')
    resetBarActiveTimer()
  }

  const handleProgressPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (isScrubbingRef.current) {
      e.stopPropagation()
      resetBarActiveTimer()
      seekFromPointerEvent(e.clientX)
      return
    }

    // Kullanıcı ilk dokunuşta parmağını yatayda kaydırmaya başladıysa (drag) kasıtlıdır -> Sürüklemeyi başlat
    if (pointerDownPosRef.current) {
      const dx = Math.abs(e.clientX - pointerDownPosRef.current.x)
      if (dx > 6) {
        e.stopPropagation()
        isScrubbingRef.current = true
        setIsScrubbing(true)
        resetBarActiveTimer()
        seekFromPointerEvent(e.clientX)
      }
    }
  }

  const handleProgressPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointerDownPosRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}

    if (!isScrubbingRef.current) {
      resetBarActiveTimer()
      return
    }

    e.stopPropagation()
    isScrubbingRef.current = false
    setIsScrubbing(false)
    lastScrubIndexRef.current = -1
    triggerHaptic('jump')
    resetBarActiveTimer()
  }

  // Tablet ve Dokunmatik Cihazlar İçin Doğrudan Native Touch Yöneticileri (zenOverlay'e sızmayı kesin olarak durdurur)
  const handleProgressTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    pointerDownPosRef.current = { x: touch.clientX, y: touch.clientY }

    if (isBarActiveRef.current) {
      if (Date.now() - activationTimeRef.current < 320) return
      isScrubbingRef.current = true
      setIsScrubbing(true)
      resetBarActiveTimer()
      seekFromPointerEvent(touch.clientX)
      return
    }

    activationTimeRef.current = Date.now()
    isBarActiveRef.current = true
    setIsBarActive(true)
    triggerHaptic('tap')
    resetBarActiveTimer()
  }

  const handleProgressTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (e.touches.length !== 1) return
    const touch = e.touches[0]

    if (isScrubbingRef.current) {
      resetBarActiveTimer()
      seekFromPointerEvent(touch.clientX)
      return
    }

    if (pointerDownPosRef.current) {
      const dx = Math.abs(touch.clientX - pointerDownPosRef.current.x)
      if (dx > 6) {
        isScrubbingRef.current = true
        setIsScrubbing(true)
        resetBarActiveTimer()
        seekFromPointerEvent(touch.clientX)
      }
    }
  }

  const handleProgressTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation()
    pointerDownPosRef.current = null
    if (!isScrubbingRef.current) {
      resetBarActiveTimer()
      return
    }
    isScrubbingRef.current = false
    setIsScrubbing(false)
    lastScrubIndexRef.current = -1
    triggerHaptic('jump')
    resetBarActiveTimer()
  }

  const progressPct =
    total > 1 ? Math.min(100, Math.max(0, (index / (total - 1)) * 100)) : total === 1 ? 100 : 0

  return (
    <section aria-label="Okuma penceresi" className="relative w-full">
      <div
        ref={containerRef}
        className={cn(
          'rsvp-stage group relative flex flex-col justify-center min-h-[102px] sm:min-h-[114px] md:min-h-[144px] lg:min-h-[140px] w-full px-4 py-3.5 text-left outline-none transition-[border-color,background-color,box-shadow] duration-300 sm:px-8 sm:py-5 md:px-10 md:py-6 [@media(max-height:640px)]:py-2.5 landscape-short:py-1.5 select-none touch-none overscroll-none',
          showChunkCallout ? 'overflow-visible' : 'overflow-hidden',
          isPulsing && 'pulse-jump',
          playing
            ? 'border-transparent bg-transparent shadow-none'
            : 'panel focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {/* Dokunma jestleri ve hız kontrolü ReaderApp ana katmanından tam ekran / orta %50 olarak yönetilir */}

        {/* İlk Açılış İçin Yarı Saydam Dokunma Rehberi (Tap Guide Overlay) */}
        <TapGuide />

        {/* Dipnot Rozeti */}
        {isFootnote && (
          <div className="pointer-events-none absolute left-1/2 top-3.5 -translate-x-1/2 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono text-[11px] font-medium text-amber-700 dark:text-amber-400">
              Dipnot
            </span>
          </div>
        )}

        {/* RSVP Göstergesi (Aktif okuma sırasında ekran okuyuculardan izole edilir) */}
        <span aria-hidden={playing} className="@container block w-full">
          {isSingleWordMode ? (
            /* 1. TEK KELİME MODU: Sabit Odak Noktası (Fixed Reticle) ve Kırmızı ORP Harfi */
            <span
              aria-live="off"
              style={wordStyle}
              className="reader-word relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline whitespace-pre py-[0.08em] leading-[1.3] [--word-base:clamp(1.68rem,5.04cqi,3.36rem)] md:[--word-base:clamp(2.28rem,6.48cqi,4.32rem)] lg:[--word-base:clamp(1.9rem,5.4cqi,3.6rem)] landscape-short:[--word-base:clamp(1.32rem,7.68vh,2.4rem)] select-none tracking-normal"
            >
              {/* Sol parça: Sağa yaslı */}
              <span className="min-w-0 text-right overflow-visible">
                {leftPart}
              </span>

              {/* Sabit Merkez Hücre: Tema Uyumlu (var(--pivot)) Odak Harfi ve Üst/Alt Dikey Kılavuz Çizgileri */}
              <span className="relative inline-block shrink-0 text-center">
                {/* Üst Dikey Kılavuz Çizgisi (Top Reticle Tick) */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-[0.52em] left-1/2 h-[0.38em] w-[2px] -translate-x-1/2 rounded-full bg-pivot"
                />

                {/* Odak Harfi */}
                <span className="text-pivot font-bold text-center inline-block drop-shadow-[0_0_6px_rgba(239,68,68,0.28)]">
                  {focusChar || '\u00A0'}
                </span>

                {/* Alt Dikey Kılavuz Çizgisi (Bottom Reticle Tick) */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-[0.52em] left-1/2 h-[0.38em] w-[2px] -translate-x-1/2 rounded-full bg-pivot"
                />
              </span>

              {/* Sağ parça: Sola yaslı */}
              <span className="min-w-0 text-left overflow-visible">
                {rightPart}
              </span>
            </span>
          ) : (
            /* 2. ÇOKLU KELİME (CHUNK > 1) VEYA DİPNOT MODU */
            <span
              aria-live="off"
              style={wordStyle}
              className={cn(
                'reader-word relative flex w-full items-center justify-center py-[0.08em] text-center select-none max-w-full flex-nowrap gap-x-[0.3em] items-baseline leading-[1.3] [--word-base:clamp(1.68rem,5.04cqi,3.36rem)] md:[--word-base:clamp(2.28rem,6.48cqi,4.32rem)] lg:[--word-base:clamp(1.9rem,5.4cqi,3.6rem)] landscape-short:[--word-base:clamp(1.32rem,7.68vh,2.4rem)]',
                isFootnote && 'italic text-amber-800 dark:text-amber-300 flex-wrap text-balance',
              )}
            >
              {bionicEnabled && !isFootnote
                ? formatBionicChunk(displayWords).map((part, idx) => (
                    <span
                      key={idx}
                      className="inline-block max-w-full whitespace-nowrap"
                    >
                      {part.leading && (
                        <span className="font-normal text-foreground/60">{part.leading}</span>
                      )}
                      {part.anchor && (
                        <span className="font-bold text-foreground">{part.anchor}</span>
                      )}
                      <span
                        className={cn(
                          'font-normal',
                          part.isConnector ? 'text-foreground/55' : 'text-foreground/68',
                        )}
                      >
                        {part.tail}
                      </span>
                    </span>
                  ))
                : displayWords.map((w, idx) => (
                    <span
                      key={idx}
                      className="inline-block max-w-full whitespace-nowrap"
                    >
                      {w}
                    </span>
                  ))}
            </span>
          )}
        </span>

        {/* Hız ve Öbek Göstergesi */}
        <div
          className={cn(
            'absolute right-4 top-3 sm:right-6 sm:top-4 md:right-8 md:top-5 flex items-center gap-2 md:gap-3 font-mono text-[11px] md:text-xs tabular-nums text-muted-foreground transition-opacity duration-500 [@media(max-height:640px)]:top-2 z-30 pointer-events-auto',
            playing ? 'opacity-0 pointer-events-none' : 'opacity-100',
          )}
        >
          <div className="relative inline-flex items-center" data-wheel="chunk-size">
            {onCycleChunkSize ? (
              <button
                type="button"
                data-wheel="chunk-size"
                onClick={(e) => {
                  e.stopPropagation()
                  onCycleChunkSize()
                  if (showChunkCallout) {
                    dismissChunkCallout()
                  }
                }}
                className={cn(
                  'rounded-full border px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-mono font-medium transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 select-none',
                  showChunkCallout
                    ? 'border-primary/80 bg-primary/15 text-primary ring-2 ring-primary/30 scale-105 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                    : 'border-foreground/15 hover:border-foreground/35 bg-foreground/[0.04] hover:bg-foreground/[0.08] text-foreground/85',
                )}
                title="Kelime Öbeği (1 / 2 / 3) — 1K / 2K / 3K"
              >
                {chunkSize}K
              </button>
            ) : chunkSize > 1 ? (
              <span
                data-wheel="chunk-size"
                className="rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs text-foreground/85 font-mono font-medium select-none"
              >
                {chunkSize}K
              </span>
            ) : null}

            {/* İlk Ziyaret İçin 1K / 2K / 3K Kelime Öbeği Cam Tanıtım Penceresi */}
            {showChunkCallout && (
              <div
                ref={chunkCalloutRef}
                role="tooltip"
                aria-label="Kelime Öbeği Tanıtımı (1K / 2K / 3K)"
                onClick={(e) => {
                  e.stopPropagation()
                  onCycleChunkSize?.()
                  dismissChunkCallout()
                }}
                className={cn(
                  'panel absolute bottom-full mb-3 z-50 select-none cursor-pointer transition-all duration-300 ease-out',
                  'right-0 w-[205px] sm:w-[220px]',
                  'p-2 sm:p-2.5 rounded-2xl shadow-xl',
                  'bg-[var(--panel)] border border-[var(--panel-border)] backdrop-blur-[var(--panel-blur)]',
                  'text-foreground text-left',
                  'animate-in fade-in slide-in-from-bottom-2 duration-300',
                  chunkCalloutFading
                    ? 'opacity-0 scale-95 pointer-events-none'
                    : 'opacity-100 scale-100 pointer-events-auto',
                )}
              >
                {/* 1K Butonunu İşaret Eden Sağ Alt Köşedeki Cam Ok (Arrow Pointer) */}
                <div
                  className="absolute -bottom-1.5 right-3 sm:right-3.5 size-3 rotate-45 border-b border-r border-[var(--panel-border)] bg-[var(--panel)] shadow-2xs backdrop-blur-[var(--panel-blur)]"
                  aria-hidden="true"
                />

                <div className="relative z-10 flex items-start gap-2">
                  <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-foreground leading-tight">
                        Kelime Bloklama
                      </p>
                      <span className="rounded bg-primary/15 px-1 py-0.2 text-[9px] font-mono font-bold text-primary">
                        1K–3K
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Akan kelime adedi (<kbd className="px-1 py-0.2 rounded bg-foreground/10 border border-foreground/20 font-mono text-[9px] font-bold text-foreground">1</kbd>, <kbd className="px-1 py-0.2 rounded bg-foreground/10 border border-foreground/20 font-mono text-[9px] font-bold text-foreground">2</kbd>, <kbd className="px-1 py-0.2 rounded bg-foreground/10 border border-foreground/20 font-mono text-[9px] font-bold text-foreground">3</kbd>)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <span>{wpm} k/dk</span>
        </div>

        {/* Entegre Alt İlerleme Çizgisi: Sadece duraklatıldığında görünür, aktif okumada KESİNLİKLE GİZLENİR */}
        {!playing && total > 0 && (
          <div
            ref={progressBarRef}
            role="progressbar"
            aria-label={
              isBarActive
                ? 'Okuma İlerlemesi (Kaydırmak veya atlamak için dokunun)'
                : 'Okuma İlerlemesini Etkinleştirmek İçin Dokunun'
            }
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={Math.max(0, total - 1)}
            onPointerDown={handleProgressPointerDown}
            onPointerMove={handleProgressPointerMove}
            onPointerUp={handleProgressPointerUp}
            onPointerCancel={handleProgressPointerUp}
            onTouchStart={handleProgressTouchStart}
            onTouchMove={handleProgressTouchMove}
            onTouchEnd={handleProgressTouchEnd}
            onTouchCancel={handleProgressTouchEnd}
            className={cn(
              'group absolute inset-x-0 bottom-0 flex flex-col justify-end select-none touch-none z-30 transition-all duration-200 cursor-pointer',
              isBarActive
                ? 'h-14 sm:h-16 md:h-18 pb-2.5 sm:pb-3 px-3 sm:px-4 md:px-6 bg-gradient-to-t from-background/60 via-background/30 to-transparent'
                : 'h-12 sm:h-14 md:h-16 pb-2 sm:pb-2.5 px-3 sm:px-4 md:px-6 hover:bg-foreground/[0.03]',
            )}
          >
            {/* Aktif olduğunda beliren mikro yüzde, kılavuz ve hızlı adım düğmeleri */}
            {isBarActive && (
              <div className="flex items-center justify-between px-1 mb-1.5 md:mb-2 pointer-events-auto animate-in fade-in zoom-in-95 duration-150 select-none">
                {onPrev ? (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPrev()
                      triggerHaptic('step')
                      resetBarActiveTimer()
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/15 text-[11px] md:text-xs font-semibold text-foreground transition-all cursor-pointer active:scale-95 shadow-2xs"
                    title="Önceki cümle başına sar"
                  >
                    <ChevronLeft className="size-3.5 md:size-4" />
                    <span>Cümle</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2 md:gap-3 pointer-events-none">
                  <span className="text-xs md:text-sm font-bold text-primary tracking-wide tabular-nums">
                    %{Math.round(progressPct)}
                  </span>
                  <span className="text-[11px] md:text-xs font-medium text-muted-foreground/85 hidden sm:inline">
                    Kaydırın veya dokunun
                  </span>
                  <span className="text-xs md:text-sm tabular-nums font-semibold text-muted-foreground">
                    {index + 1} / {total}
                  </span>
                </div>

                {onNext ? (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onNext()
                      triggerHaptic('step')
                      resetBarActiveTimer()
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/15 text-[11px] md:text-xs font-semibold text-foreground transition-all cursor-pointer active:scale-95 shadow-2xs"
                    title="Sonraki cümle başına sar"
                  >
                    <span>Cümle</span>
                    <ChevronRight className="size-3.5 md:size-4" />
                  </button>
                ) : <div />}
              </div>
            )}

            {/* Arka plan izi (Track) */}
            <div
              className={cn(
                'relative w-full overflow-hidden transition-all duration-200 rounded-full',
                isBarActive
                  ? 'h-3 sm:h-3.5 md:h-4 bg-foreground/20 ring-1 ring-primary/40 shadow-inner'
                  : 'h-2 sm:h-2.5 md:h-3 bg-foreground/15 group-hover:h-2.5 group-hover:bg-foreground/20',
              )}
            >
              {/* Doluluk göstergesi */}
              <div
                className={cn(
                  'h-full transition-[width] duration-75 ease-out rounded-full',
                  isBarActive
                    ? 'bg-primary shadow-[0_0_12px_rgba(59,130,246,0.8)]'
                    : 'bg-primary/90',
                )}
                style={{
                  width: `${progressPct}%`,
                }}
              />
            </div>

            {/* Parmak altındaki veya mevcut konumdaki odak noktası (Thumb Indicator) - Hem pasif hem aktifte her an görünür */}
            <div
              className={cn(
                'pointer-events-none absolute -translate-x-1/2 rounded-full bg-primary border-2 border-background shadow-md transition-all duration-100',
                isBarActive
                  ? isScrubbing
                    ? 'bottom-2 sm:bottom-2.5 size-6 sm:size-7 md:size-8 scale-110 shadow-[0_0_16px_rgba(59,130,246,0.95)] ring-2 ring-primary/30'
                    : 'bottom-2 sm:bottom-2.5 size-5.5 sm:size-6.5 md:size-7 shadow-[0_0_12px_rgba(59,130,246,0.8)]'
                  : 'bottom-1.5 size-4 sm:size-4.5 md:size-5.5 shadow-sm opacity-95 group-hover:scale-110',
              )}
              style={{
                left: `${progressPct}%`,
              }}
            />
          </div>
        )}
      </div>
    </section>
  )
})
