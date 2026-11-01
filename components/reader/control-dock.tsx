'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CSSProperties, Ref } from 'react'
import { cn } from '@/lib/utils'
import { formatRemaining } from '@/lib/rsvp'

type ControlDockProps = {
  ref?: Ref<HTMLElement>
  hidden: boolean
  index: number
  total: number
  wpm: number
  playing: boolean
  chunkSize?: number
  step?: number
  onToggle?: () => void
  onSeek: (index: number) => void
  onStepPrev?: () => void
  onStepNext?: () => void
  onWpmChange?: (delta: number) => void
}

export function ControlDock({
  ref,
  hidden,
  index,
  total,
  wpm,
  chunkSize = 1,
  step = 10,
  onSeek,
  onStepPrev,
  onStepNext,
}: ControlDockProps) {
  const last = Math.max(0, total - 1)
  const progress = last > 0 ? (index / last) * 100 : 0

  return (
    <footer
      ref={ref}
      aria-hidden={hidden}
      inert={hidden}
      className={cn(
        'absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:px-6 sm:pb-3 landscape-short:pb-1.5',
        hidden && 'pointer-events-none translate-y-8 opacity-0',
      )}
    >
      {/* Ultra Kompakt İlerleme ve Kontrol Çubuğu (OKU butonu kaldırıldı, pencereye dokunarak okunur) */}
      <div className="panel mx-auto flex max-w-xl flex-col gap-1.5 p-2 sm:p-2.5 sm:px-4 landscape-short:max-w-3xl landscape-short:gap-1 landscape-short:p-1.5 landscape-short:px-3">
        {/* İlerleme Kaydırıcısı (Scrubber) */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor="scrubber" className="sr-only">
            Metin içinde konum
          </label>
          <input
            id="scrubber"
            type="range"
            min={0}
            max={last}
            step={1}
            value={index}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="scrubber"
            style={{ '--progress': `${progress}%` } as CSSProperties}
          />
        </div>

        {/* Bilgi ve Navigasyon Satırı */}
        <div className="flex items-center justify-between gap-2 px-0.5">
          {/* Sol: Konum ve Kalan Süre */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-muted-foreground sm:text-xs">
            <span>
              {total === 0 ? 0 : index + 1}/{total}
              {chunkSize > 1 ? ` (${chunkSize}K)` : ''}
            </span>
            <span className="opacity-40">·</span>
            <span>{formatRemaining(total - index - 1, wpm, chunkSize)} kaldı</span>
          </div>

          {/* Sağ: Hız Göstergesi ve Sayfa/Blok Atla Butonları */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 font-mono text-xs text-muted-foreground"
              role="status"
              aria-label={`Okuma hızı: ${wpm} kelime/dakika`}
            >
              <span className="text-xs font-semibold tabular-nums text-foreground sm:text-sm">{wpm}</span>
              <span className="text-[10px]">k/dk</span>
            </div>

            <div className="flex items-center gap-0.5" role="group" aria-label="Kelime atla">
              <button
                type="button"
                onClick={onStepPrev ?? (() => onSeek(Math.max(0, index - step)))}
                disabled={index === 0}
                className="ctl size-7.5 rounded-md disabled:opacity-40 sm:size-8"
                aria-label={`${step} öbek geri`}
                title={`${step} öbek geri`}
                aria-keyshortcuts="Shift+ArrowLeft"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={onStepNext ?? (() => onSeek(Math.min(last, index + step)))}
                disabled={index >= last}
                className="ctl size-7.5 rounded-md disabled:opacity-40 sm:size-8"
                aria-label={`${step} öbek ileri`}
                title={`${step} öbek ileri`}
                aria-keyshortcuts="Shift+ArrowRight"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-1.5 hidden max-w-xl text-center text-[11px] text-muted-foreground lg:block landscape-short:hidden">
        <kbd className="font-mono">Space</kbd> oku/dur · <kbd className="font-mono">← →</kbd> gez ·{' '}
        <kbd className="font-mono">↕</kbd> kaydır (hız) · <kbd className="font-mono">C</kbd> öbek ({chunkSize}K) · <kbd className="font-mono">1 2 3</kbd> tema
      </p>
    </footer>
  )
}
