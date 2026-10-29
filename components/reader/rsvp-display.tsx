'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { splitAtPivot, type ChunkItem } from '@/lib/rsvp'
import { useElementSize } from '@/lib/use-element-size'

type RsvpDisplayProps = {
  word: string
  chunk?: ChunkItem
  chunkSize?: number
  playing: boolean
  wpm: number
  fontFamily?: string
  fontScale: number
  maxSide: number
  onToggle: () => void
}

export function RsvpDisplay({
  word,
  chunk,
  chunkSize = 1,
  playing,
  wpm,
  fontFamily,
  fontScale,
  onToggle,
}: RsvpDisplayProps) {
  const [containerRef, containerSize] = useElementSize<HTMLButtonElement>()

  const activeText = chunk ? chunk.text : word
  const isHeading = chunk?.isHeading || activeText.startsWith('#')
  const isFootnote = chunk?.isFootnote || /^\[dipnot/i.test(activeText)
  const isSingleWordMode = chunkSize === 1 && !isHeading && !isFootnote

  // Clean heading text
  const cleanDisplayText = isHeading ? activeText.replace(/^#+\s*/, '') : activeText
  const displayWords = chunk ? (isHeading ? cleanDisplayText.split(/\s+/) : chunk.words) : [word]

  // Single word ORP split
  const [before, pivot, after] = splitAtPivot(cleanDisplayText)
  const maxSideChars = Math.max(before.length, after.length, 1)

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
      // Tek kelime modu: Merkeze göre kanat hesabı
      const requiredHalfWidth = maxSideChars * currentPx * 0.58
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

  const wordStyle = {
    fontSize: `calc(var(--word-base) * ${finalScale})`,
    ...(fontFamily ? { '--reader-font': fontFamily } : {}),
  } as CSSProperties

  return (
    <section aria-label="Okuma penceresi" className="relative w-full">
      <button
        ref={containerRef}
        type="button"
        onClick={onToggle}
        aria-label={playing ? 'Duraklat' : 'Okumaya başla'}
        className="panel group relative block w-full overflow-hidden px-4 py-11 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-8 sm:py-15 [@media(max-height:640px)]:py-8 landscape-short:py-6"
      >
        {/* Üst ve Alt Odak Çentikleri: Yalnızca tek kelime ORP modunda gösterilir */}
        {isSingleWordMode && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-3 h-3.5 w-px -translate-x-1/2 bg-(--guide) sm:top-5 sm:h-4 [@media(max-height:640px)]:top-2 [@media(max-height:640px)]:h-3 landscape-short:top-2"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3 left-1/2 h-3.5 w-px -translate-x-1/2 bg-(--guide) sm:bottom-5 sm:h-4 [@media(max-height:640px)]:bottom-2 [@media(max-height:640px)]:h-3 landscape-short:bottom-2"
            />
          </>
        )}

        {/* Başlık veya Dipnot Rozeti */}
        {(isHeading || isFootnote) && (
          <div className="absolute left-1/2 top-3.5 -translate-x-1/2 text-center pointer-events-none">
            {isHeading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-mono font-medium uppercase tracking-wider text-primary">
                Bölüm Başlığı
              </span>
            )}
            {isFootnote && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-mono font-medium text-amber-500 dark:text-amber-400">
                Dipnot
              </span>
            )}
          </div>
        )}

        {/* RSVP Göstergesi */}
        <span className="@container block w-full">
          {isSingleWordMode ? (
            /* 1. TEK KELİME MODU: ORP Odak Kırmızı Harfi ile 3 Parçalı Izgara */
            <span
              aria-live="off"
              style={wordStyle}
              className="reader-word relative grid grid-cols-[1fr_auto_1fr] items-baseline whitespace-pre py-[0.08em] leading-[1.3] transition-[font-size] duration-100 ease-out [--word-base:clamp(1.75rem,5.2cqi,3.5rem)] landscape-short:[--word-base:clamp(1.4rem,8vh,2.5rem)]"
            >
              <span className="min-w-0 text-right">{before}</span>
              <span className="text-pivot pivot-glow shrink-0 px-[0.02em]">{pivot || '\u00A0'}</span>
              <span className="min-w-0 text-left">{after}</span>
            </span>
          ) : (
            /* 2. ÇOKLU KELİME (CHUNK > 1) VEYA BAŞLIK/DİPNOT MODU: Kırmızı Harfsiz, Doğal Merkezli Blok */
            <span
              aria-live="off"
              style={wordStyle}
              className={cn(
                'reader-word relative flex w-full items-baseline justify-center gap-x-[0.3em] py-[0.08em] leading-[1.3] text-center transition-[font-size] duration-100 ease-out [--word-base:clamp(1.75rem,5.2cqi,3.5rem)] landscape-short:[--word-base:clamp(1.4rem,8vh,2.5rem)]',
                isHeading && 'font-bold tracking-tight text-foreground',
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
      </button>
    </section>
  )
}
