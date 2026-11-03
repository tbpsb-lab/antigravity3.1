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
import { calculateTurkishORP, WPM_STEP, type ChunkItem } from '@/lib/rsvp'
import { triggerHaptic } from '@/lib/haptics'
import { useElementSize } from '@/lib/use-element-size'
import { TapGuide } from './tap-guide'

type RsvpDisplayProps = {
  word: string
  chunk?: ChunkItem
  chunkSize?: number
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
  const stageNodeRef = useRef<HTMLDivElement | null>(null)
  const lastHapticStepRef = useRef<number>(0)

  const setStageRef = useCallback(
    (node: HTMLDivElement | null) => {
      stageNodeRef.current = node
      containerRef(node)
    },
    [containerRef],
  )

  // İlerleme Çubuğu Sürükleme / Scrubbing Kontrolleri (Mobil Touch + Masaüstü Mouse Drag)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const isScrubbingRef = useRef(false)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const lastScrubIndexRef = useRef<number>(-1)

  // 1 & 2. KURAL: Piksel Eşiği (25px) ve Kademe (25 WPM) ile Canlı Hız Kontrolü
  const touchStateRef = useRef<{
    startY: number
    startX: number
    startWpm: number
    isSwiping: boolean
    hasSwiped: boolean
  } | null>(null)

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1 || isScrubbingRef.current) return
    const target = e.target as HTMLElement | null
    if (target?.closest('[role="progressbar"]')) return

    const touch = e.touches[0]
    lastHapticStepRef.current = 0
    touchStateRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      startWpm: wpm,
      isSwiping: false,
      hasSwiped: false,
    }
  }

  // Mobil Chrome'da aşağı kaydırma (swipe down) sırasında tarayıcının pull-to-refresh
  // yenileme animasyonunu %100 engelleyen tekil native pasif-olmayan touchmove dinleyicisi
  useEffect(() => {
    const el = stageNodeRef.current
    if (!el) return

    const onNativeTouchMove = (e: globalThis.TouchEvent) => {
      if (!touchStateRef.current || e.touches.length !== 1 || isScrubbingRef.current) return
      const touch = e.touches[0]
      const deltaY = touch.clientY - touchStateRef.current.startY
      const deltaX = touch.clientX - touchStateRef.current.startX

      if (!touchStateRef.current.isSwiping && Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        touchStateRef.current.isSwiping = true
        touchStateRef.current.hasSwiped = true
      }

      if (touchStateRef.current.isSwiping) {
        if (e.cancelable) {
          e.preventDefault()
        }
        // Dikey eksendeki her 25 piksel = 1 kademe (25 WPM)
        const pixelDistance = -deltaY // Yukarı = pozitif
        const steps = Math.trunc(pixelDistance / 25)
        if (steps !== lastHapticStepRef.current) {
          lastHapticStepRef.current = steps
          triggerHaptic('step')
        }
        const targetWpm = touchStateRef.current.startWpm + steps * WPM_STEP
        onWpmSet?.(targetWpm)
      }
    }

    el.addEventListener('touchmove', onNativeTouchMove, { passive: false })
    return () => {
      el.removeEventListener('touchmove', onNativeTouchMove)
    }
  }, [onWpmSet])

  const handleTouchEnd = () => {
    if (!touchStateRef.current) return
    const wasSwiping = touchStateRef.current.hasSwiped
    touchStateRef.current = null

    if (wasSwiping) {
      onWpmDragEnd?.()
    }
  }

  const handleChildClick = (action?: () => void) => {
    if (touchStateRef.current?.hasSwiped) {
      return
    }
    action?.()
  }

  const activeText = chunk ? chunk.text : word
  const isFootnote = chunk?.isFootnote || /^\[dipnot/i.test(activeText)
  const isSingleWordMode = chunkSize === 1 && !isFootnote

  const cleanDisplayText = activeText
  const displayWords = chunk ? chunk.words : [word]

  // Single word Turkish ORP split (Noktalamadan arındırılmış Türkçe kök odaklı ORP)
  const { leftPart, focusChar, rightPart } = calculateTurkishORP(cleanDisplayText)
  const maxSideChars = Math.max(Array.from(leftPart).length, Array.from(rightPart).length, 1)

  // Yatay taşmayı %100 önleyen dinamik Fit-to-Width oranı (Mobil + Masaüstü md: font tabanlarıyla tam uyumlu)
  let autoFitScale = 1
  const containerWidth = containerSize.width || 0

  if (containerWidth > 0) {
    const isDesktopStage = containerWidth >= 680
    const padding = containerWidth < 540 ? 16 : 36
    const availableHalfWidth = Math.max(80, containerWidth / 2 - padding)
    const availableFullWidth = Math.max(160, containerWidth - padding * 2)

    const estimatedBasePx = isDesktopStage
      ? Math.min(72, Math.max(38.4, containerWidth * 0.068))
      : Math.min(56, Math.max(28, containerWidth * 0.052))

    const currentPx = estimatedBasePx * fontScale

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

  const finalScale = fontScale * autoFitScale

  const wordStyle = {
    fontSize: `calc(var(--word-base) * ${finalScale})`,
    fontFamily: fontFamily || 'var(--reader-font)',
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum", "zero"',
    fontVariantLigatures: 'none',
  } as CSSProperties

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
    isScrubbingRef.current = true
    setIsScrubbing(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    seekFromPointerEvent(e.clientX)
  }

  const handleProgressPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return
    e.stopPropagation()
    seekFromPointerEvent(e.clientX)
  }

  const handleProgressPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return
    e.stopPropagation()
    isScrubbingRef.current = false
    setIsScrubbing(false)
    lastScrubIndexRef.current = -1
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    triggerHaptic('jump')
  }

  const progressPct =
    total > 1 ? Math.min(100, Math.max(0, (index / (total - 1)) * 100)) : total === 1 ? 100 : 0

  return (
    <section aria-label="Okuma penceresi" className="relative w-full">
      <div
        ref={setStageRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={cn(
          'rsvp-stage group relative flex flex-col justify-center min-h-[96px] sm:min-h-[110px] md:min-h-[140px] w-full overflow-hidden px-4 py-3.5 text-left outline-none transition-all duration-500 sm:px-8 sm:py-5 md:px-10 md:py-6 [@media(max-height:640px)]:py-2.5 landscape-short:py-1.5 select-none touch-none overscroll-none',
          isPulsing && 'pulse-jump',
          playing
            ? 'border-transparent bg-transparent shadow-none'
            : 'panel focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {/* 1. KURAL: 3 Görünmez Dokunma Bölgesi (Tap Zones) */}
        <div className="absolute inset-0 z-20 flex select-none pointer-events-auto touch-none overscroll-none">
          {/* Sol %25: Akıllı Cümle Başı Geri Sarma */}
          <button
            type="button"
            aria-label="Önceki cümle başına sar"
            className="h-full w-1/4 cursor-pointer outline-none active:bg-foreground/[0.03] transition-colors touch-none"
            onClick={(e) => {
              e.stopPropagation()
              handleChildClick(onPrev)
            }}
          />

          {/* Orta %50: Oynat / Durdur */}
          <button
            type="button"
            aria-label={playing ? 'Duraklat' : 'Okumaya başla'}
            className="h-full w-1/2 cursor-pointer outline-none active:bg-foreground/[0.03] transition-colors touch-none"
            onClick={(e) => {
              e.stopPropagation()
              handleChildClick(onToggle)
            }}
          />

          {/* Sağ %25: Sonraki Cümle Başı */}
          <button
            type="button"
            aria-label="Sonraki cümle başına atla"
            className="h-full w-1/4 cursor-pointer outline-none active:bg-foreground/[0.03] transition-colors touch-none"
            onClick={(e) => {
              e.stopPropagation()
              handleChildClick(onNext)
            }}
          />
        </div>

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
              className="reader-word relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline whitespace-pre py-[0.08em] leading-[1.3] [--word-base:clamp(1.75rem,5.2cqi,3.5rem)] md:[--word-base:clamp(2.4rem,6.8cqi,4.5rem)] landscape-short:[--word-base:clamp(1.4rem,8vh,2.5rem)] select-none tracking-normal"
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
                'reader-word relative flex w-full items-center justify-center py-[0.08em] text-center select-none max-w-full flex-nowrap gap-x-[0.3em] items-baseline leading-[1.3] [--word-base:clamp(1.75rem,5.2cqi,3.5rem)] md:[--word-base:clamp(2.4rem,6.8cqi,4.5rem)] landscape-short:[--word-base:clamp(1.4rem,8vh,2.5rem)]',
                isFootnote && 'italic text-amber-800 dark:text-amber-300 flex-wrap text-balance',
              )}
            >
              {displayWords.map((w, idx) => (
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
            'absolute right-4 top-3 sm:right-6 sm:top-4 md:right-8 md:top-5 flex items-center gap-2 md:gap-3 font-mono text-[11px] md:text-xs tabular-nums text-muted-foreground transition-opacity duration-500 [@media(max-height:640px)]:top-2 z-20',
            playing ? 'opacity-0 pointer-events-none' : 'opacity-100',
          )}
        >
          {onCycleChunkSize ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCycleChunkSize()
              }}
              className="rounded-full border border-foreground/15 hover:border-foreground/35 bg-foreground/[0.04] hover:bg-foreground/[0.08] px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-mono font-medium text-foreground/85 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 select-none"
              title="Kelime Öbeğini Değiştir (C) — 1K / 2K / 3K"
            >
              {chunkSize}K
            </button>
          ) : chunkSize > 1 ? (
            <span className="rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs text-foreground/85 font-mono font-medium select-none">
              {chunkSize}K
            </span>
          ) : null}
          <span>{wpm} k/dk</span>
        </div>

        {/* Entegre Alt İlerleme Çizgisi: Sadece duraklatıldığında görünür, aktif okumada KESİNLİKLE GİZLENİR */}
        {!playing && total > 0 && (
          <div
            ref={progressBarRef}
            role="progressbar"
            aria-label="Okuma İlerlemesi (Kaydırmak için sürükleyin)"
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={Math.max(0, total - 1)}
            onPointerDown={handleProgressPointerDown}
            onPointerMove={handleProgressPointerMove}
            onPointerUp={handleProgressPointerUp}
            onPointerCancel={handleProgressPointerUp}
            className="group absolute inset-x-0 bottom-0 h-3 sm:h-3.5 md:h-4 flex items-end cursor-ew-resize select-none touch-none z-30"
          >
            {/* Arka plan izi (Track) */}
            <div
              className={cn(
                'relative w-full overflow-hidden transition-all duration-150 rounded-b-2xl sm:rounded-b-3xl',
                isScrubbing ? 'h-1.5 sm:h-2 bg-foreground/25' : 'h-1 group-hover:h-1.5 bg-foreground/15',
              )}
            >
              {/* Doluluk göstergesi */}
              <div
                className="h-full bg-primary/85 transition-[width] duration-75 ease-out rounded-full"
                style={{
                  width: `${progressPct}%`,
                }}
              />
            </div>

            {/* Sürükleme sırasında parmak/imleç altında beliren aktif odak noktası (Thumb Indicator) */}
            {isScrubbing && (
              <div
                className="pointer-events-none absolute bottom-0 -translate-x-1/2 size-3 sm:size-3.5 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.7)] border-2 border-background transition-transform"
                style={{
                  left: `${progressPct}%`,
                }}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
})
