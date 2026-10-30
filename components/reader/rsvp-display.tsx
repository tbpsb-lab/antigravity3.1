'use client'

import { useRef, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { calculateTurkishORP, WPM_STEP, type ChunkItem } from '@/lib/rsvp'
import { useElementSize } from '@/lib/use-element-size'
import { TapGuide } from './tap-guide'

type RsvpDisplayProps = {
  word: string
  chunk?: ChunkItem
  chunkSize?: number
  playing: boolean
  wpm: number
  fontFamily?: string
  fontScale: number
  maxSide: number
  isPulsing?: boolean
  onToggle: () => void
  onPrev?: () => void
  onNext?: () => void
  onWpmChange?: (delta: number) => void
  onWpmSet?: (newWpm: number) => void
  onWpmDragEnd?: () => void
}

export function RsvpDisplay({
  word,
  chunk,
  chunkSize = 1,
  playing,
  wpm,
  fontFamily,
  fontScale,
  isPulsing = false,
  onToggle,
  onPrev,
  onNext,
  onWpmChange,
  onWpmSet,
  onWpmDragEnd,
}: RsvpDisplayProps) {
  const [containerRef, containerSize] = useElementSize<HTMLDivElement>()

  // 1 & 2. KURAL: Piksel Eşiği (25px) ve Kademe (25 WPM) ile Canlı Hız Kontrolü
  const touchStateRef = useRef<{
    startY: number
    startX: number
    startWpm: number
    isSwiping: boolean
    hasSwiped: boolean
  } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    touchStateRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      startWpm: wpm,
      isSwiping: false,
      hasSwiped: false,
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStateRef.current || e.touches.length !== 1) return
    const touch = e.touches[0]
    const deltaY = touch.clientY - touchStateRef.current.startY
    const deltaX = touch.clientX - touchStateRef.current.startX

    if (!touchStateRef.current.isSwiping && Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
      touchStateRef.current.isSwiping = true
      touchStateRef.current.hasSwiped = true
    }

    if (touchStateRef.current.isSwiping) {
      // Dikey eksendeki her 25 piksel = 1 kademe (25 WPM)
      const pixelDistance = -deltaY // Yukarı = pozitif
      const steps = Math.trunc(pixelDistance / 25)
      const targetWpm = touchStateRef.current.startWpm + steps * WPM_STEP
      onWpmSet?.(targetWpm)
    }
  }

  const handleTouchEnd = () => {
    if (!touchStateRef.current) return
    const wasSwiping = touchStateRef.current.hasSwiped
    touchStateRef.current = null

    if (wasSwiping) {
      onWpmDragEnd?.()
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (onWpmChange && Math.abs(e.deltaY) > 15) {
      onWpmChange(e.deltaY < 0 ? WPM_STEP : -WPM_STEP)
    }
  }

  const handleChildClick = (action?: () => void) => {
    if (touchStateRef.current?.hasSwiped) {
      return
    }
    action?.()
  }

  const activeText = chunk ? chunk.text : word
  const isHeading = chunk?.isHeading || activeText.startsWith('#')
  const isFootnote = chunk?.isFootnote || /^\[dipnot/i.test(activeText)
  const isSingleWordMode = chunkSize === 1 && !isHeading && !isFootnote

  // Clean heading text
  const cleanDisplayText = isHeading ? activeText.replace(/^#+\s*/, '') : activeText
  const displayWords = chunk ? (isHeading ? cleanDisplayText.split(/\s+/) : chunk.words) : [word]

  // Single word Turkish ORP split (Noktalamadan arındırılmış Türkçe kök odaklı ORP)
  const { leftPart, focusChar, rightPart } = calculateTurkishORP(cleanDisplayText)
  const maxSideChars = Math.max(leftPart.length, rightPart.length, 1)

  // Yatay taşmayı %100 önleyen dinamik Fit-to-Width oranı
  let autoFitScale = 1
  const containerWidth = containerSize.width || 0

  if (containerWidth > 0) {
    const padding = containerWidth < 540 ? 20 : 36
    const availableHalfWidth = Math.max(80, containerWidth / 2 - padding)
    const availableFullWidth = Math.max(160, containerWidth - padding * 2)

    const estimatedBasePx = Math.min(56, Math.max(26, containerWidth * 0.052))
    const currentPx = estimatedBasePx * fontScale

    if (isSingleWordMode) {
      // Tek kelime modu: Merkeze göre kanat hesabı (monospace 0.60ch çarpanı)
      const requiredHalfWidth = maxSideChars * currentPx * 0.6
      if (requiredHalfWidth > availableHalfWidth) {
        autoFitScale = Math.min(1, Math.max(0.38, availableHalfWidth / requiredHalfWidth))
      }
    } else {
      // Çoklu kelime modu: Tüm öbeğin genişliği hesabı
      const totalChars = cleanDisplayText.length
      const requiredFullWidth = totalChars * currentPx * 0.52
      if (requiredFullWidth > availableFullWidth) {
        autoFitScale = Math.min(1, Math.max(0.35, availableFullWidth / requiredFullWidth))
      }
    }
  }

  const finalScale = fontScale * autoFitScale

  // Harf genişliklerinin oynamaması için yüksek okunabilirlikli monospace / optik hizalı font
  const defaultMonoFont =
    'var(--font-geist-mono), "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

  const wordStyle = {
    fontSize: `calc(var(--word-base) * ${finalScale})`,
    fontFamily: fontFamily || defaultMonoFont,
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum", "zero"',
    fontVariantLigatures: 'none',
  } as CSSProperties

  return (
    <section aria-label="Okuma penceresi" className="relative w-full">
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={cn(
          'rsvp-stage group relative block w-full overflow-hidden px-4 py-11 text-left outline-none transition-all duration-500 sm:px-8 sm:py-15 [@media(max-height:640px)]:py-8 landscape-short:py-6 select-none',
          isPulsing && 'pulse-jump',
          playing
            ? 'border-transparent bg-transparent shadow-none'
            : 'panel focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {/* 1. KURAL: 3 Görünmez Dokunma Bölgesi (Tap Zones) */}
        <div className="absolute inset-0 z-20 flex select-none pointer-events-auto">
          {/* Sol %25: Akıllı Cümle Başı Geri Sarma */}
          <button
            type="button"
            aria-label="Önceki cümle başına sar"
            className="h-full w-1/4 cursor-pointer outline-none active:bg-foreground/[0.03] transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              handleChildClick(onPrev)
            }}
          />

          {/* Orta %50: Oynat / Durdur */}
          <button
            type="button"
            aria-label={playing ? 'Duraklat' : 'Okumaya başla'}
            className="h-full w-1/2 cursor-pointer outline-none active:bg-foreground/[0.03] transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              handleChildClick(onToggle)
            }}
          />

          {/* Sağ %25: 1 kelime ileri sar */}
          <button
            type="button"
            aria-label="1 kelime ileri sar"
            className="h-full w-1/4 cursor-pointer outline-none active:bg-foreground/[0.03] transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              handleChildClick(onNext)
            }}
          />
        </div>

        {/* İlk Açılış İçin Yarı Saydam Dokunma Rehberi (Tap Guide Overlay) */}
        <TapGuide />

        {/* Üst ve Alt Odak Çentikleri: Yalnızca tek kelime ORP modunda gösterilir */}
        {isSingleWordMode && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-3 h-3.5 w-[1.5px] -translate-x-1/2 rounded-full bg-[#ef4444]/35 sm:top-5 sm:h-4 [@media(max-height:640px)]:top-2 [@media(max-height:640px)]:h-3 landscape-short:top-2"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3 left-1/2 h-3.5 w-[1.5px] -translate-x-1/2 rounded-full bg-[#ef4444]/35 sm:bottom-5 sm:h-4 [@media(max-height:640px)]:bottom-2 [@media(max-height:640px)]:h-3 landscape-short:bottom-2"
            />
          </>
        )}

        {/* Dipnot Rozeti (Bölüm Başlığı rozeti yerine başlık tipografik vurgu ile sunulur) */}
        {isFootnote && (
          <div className="pointer-events-none absolute left-1/2 top-3.5 -translate-x-1/2 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono text-[11px] font-medium text-amber-500 dark:text-amber-400">
              Dipnot
            </span>
          </div>
        )}

        {/* RSVP Göstergesi */}
        <span className="@container block w-full">
          {isSingleWordMode ? (
            /* 1. TEK KELİME MODU: Sabit Odak Noktası (Fixed Reticle) ve Kırmızı ORP Harfi */
            <span
              aria-live="off"
              style={wordStyle}
              className="reader-word relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline whitespace-pre py-[0.08em] leading-[1.3] transition-[font-size] duration-100 ease-out [--word-base:clamp(1.75rem,5.2cqi,3.5rem)] landscape-short:[--word-base:clamp(1.4rem,8vh,2.5rem)] select-none tracking-normal"
            >
              {/* Sol parça: Sağa yaslı */}
              <span className="min-w-0 text-right overflow-visible">
                {leftPart}
              </span>

              {/* Sabit Merkez Hücre: Kırmızı (#ef4444) Odak Harfi ve Üst/Alt Dikey Kılavuz Çizgileri (Reticle Ticks) */}
              <span className="relative inline-block shrink-0 text-center">
                {/* Üst Dikey Kılavuz Çizgisi (Top Reticle Tick) */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-[0.52em] left-1/2 h-[0.38em] w-[2px] -translate-x-1/2 rounded-full bg-[#ef4444]"
                />

                {/* Kırmızı Odak Harfi: Harf genişliğine tam oturan, taşma ve üst üste binmeyi önleyen doğal boyutlandırma */}
                <span className="text-[#ef4444] font-bold text-center inline-block drop-shadow-[0_0_6px_rgba(239,68,68,0.35)]">
                  {focusChar || '\u00A0'}
                </span>

                {/* Alt Dikey Kılavuz Çizgisi (Bottom Reticle Tick) */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-[0.52em] left-1/2 h-[0.38em] w-[2px] -translate-x-1/2 rounded-full bg-[#ef4444]"
                />
              </span>

              {/* Sağ parça: Sola yaslı */}
              <span className="min-w-0 text-left overflow-visible">
                {rightPart}
              </span>
            </span>
          ) : (
            /* 2. ÇOKLU KELİME (CHUNK > 1) VEYA BAŞLIK/DİPNOT MODU: Kırmızı Harfsiz, Doğal Merkezli Blok */
            <span
              aria-live="off"
              style={wordStyle}
              className={cn(
                'reader-word relative flex w-full items-baseline justify-center gap-x-[0.3em] py-[0.08em] leading-[1.3] text-center transition-[font-size] duration-100 ease-out [--word-base:clamp(1.75rem,5.2cqi,3.5rem)] landscape-short:[--word-base:clamp(1.4rem,8vh,2.5rem)]',
                isHeading && 'font-extrabold tracking-tight text-primary drop-shadow-xs transition-all sm:scale-[1.03]',
                isFootnote && 'italic text-amber-600/90 dark:text-amber-300/90',
              )}
            >
              {displayWords.map((w, idx) => (
                <span key={idx} className="inline-block whitespace-nowrap">
                  {w}
                </span>
              ))}
            </span>
          )}
        </span>

        {/* Hız ve Öbek Göstergesi */}
        <div
          className={cn(
            'absolute right-4 top-3 flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground transition-opacity duration-500 sm:right-6 sm:top-4 [@media(max-height:640px)]:top-2',
            playing ? 'opacity-0' : 'opacity-100',
          )}
        >
          {chunkSize > 1 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground font-medium">
              {chunkSize}K
            </span>
          )}
          <span>{wpm} k/dk</span>
        </div>
      </div>
    </section>
  )
}
