'use client'

import { Minus, Plus, Type } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type FontFace = 'theme' | 'sans' | 'serif' | 'mono'

export const FONT_FACES: { id: FontFace; label: string; sample: string; family?: string }[] = [
  { id: 'theme', label: 'Tema', sample: 'Aa' },
  {
    id: 'sans',
    label: 'Sans',
    sample: 'Aa',
    family: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'serif',
    label: 'Serif',
    sample: 'Aa',
    family: 'var(--font-literata), ui-serif, Georgia, serif',
  },
  {
    id: 'mono',
    label: 'Mono',
    sample: 'Aa',
    family: 'var(--font-geist-mono), ui-monospace, monospace',
  },
]

export const FONT_SCALE_MIN = 0.5
export const FONT_SCALE_MAX = 1.6
export const FONT_SCALE_STEP = 0.1

type FontSettingsProps = {
  face: FontFace
  scale: number
  onFaceChange: (face: FontFace) => void
  onScaleChange: (scale: number) => void
  chunkSize?: number
  onChunkSizeChange?: (size: number) => void
  readFootnotes?: boolean
  onReadFootnotesChange?: (val: boolean) => void
}

export function FontSettings({
  face,
  scale,
  onFaceChange,
  onScaleChange,
  chunkSize = 1,
  onChunkSizeChange,
  readFootnotes = true,
  onReadFootnotesChange,
}: FontSettingsProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const step = (delta: number) =>
    onScaleChange(
      Math.round(Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, scale + delta)) * 10) / 10,
    )

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Görünüm ve okuma ayarları"
        className={cn('ctl panel size-10 landscape-short:size-9', open && 'ctl-primary')}
      >
        <Type className="size-4" />
      </button>

      <div
        id={panelId}
        role="dialog"
        aria-label="Görünüm ve okuma ayarları"
        inert={!open}
        className={cn(
          'panel panel-solid absolute -right-12 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] origin-top-right p-3.5 sm:right-0 transition-all duration-200 ease-out shadow-xl',
          open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        {/* Yazı Tipi Ailesi */}
        <p className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Yazı tipi
        </p>
        <div role="radiogroup" aria-label="Yazı ailesi" className="grid grid-cols-4 gap-1">
          {FONT_FACES.map((f) => {
            const active = f.id === face
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onFaceChange(f.id)}
                className={cn(
                  'ctl flex-col gap-0.5 rounded-xl py-2',
                  active ? 'ctl-primary' : 'bg-transparent text-muted-foreground',
                )}
              >
                <span
                  className="text-lg leading-none"
                  style={{ fontFamily: f.family ?? 'var(--reader-font)' }}
                >
                  {f.sample}
                </span>
                <span className="text-[10px] font-medium">{f.label}</span>
              </button>
            )
          })}
        </div>

        {/* Yazı Boyutu */}
        <p className="mb-2 mt-4 px-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Boyut
        </p>
        <div className="flex items-center gap-2" role="group" aria-label="Yazı boyutu">
          <button
            type="button"
            onClick={() => step(-FONT_SCALE_STEP)}
            disabled={scale <= FONT_SCALE_MIN}
            className="ctl size-9 shrink-0 disabled:opacity-40"
            aria-label="Yazıyı küçült"
          >
            <Minus className="size-4" />
          </button>
          <label htmlFor={`${panelId}-scale`} className="sr-only">
            Yazı boyutu
          </label>
          <input
            id={`${panelId}-scale`}
            type="range"
            min={FONT_SCALE_MIN}
            max={FONT_SCALE_MAX}
            step={FONT_SCALE_STEP}
            value={scale}
            onChange={(e) => onScaleChange(Number(e.target.value))}
            className="scrubber min-w-0 flex-1"
            style={
              {
                '--progress': `${((scale - FONT_SCALE_MIN) / (FONT_SCALE_MAX - FONT_SCALE_MIN)) * 100}%`,
              } as CSSProperties
            }
          />
          <button
            type="button"
            onClick={() => step(FONT_SCALE_STEP)}
            disabled={scale >= FONT_SCALE_MAX}
            className="ctl size-9 shrink-0 disabled:opacity-40"
            aria-label="Yazıyı büyüt"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
          %{Math.round(scale * 100)}
        </p>

        {/* Kelime Öbeği (Chunk Size) */}
        {onChunkSizeChange && (
          <>
            <div className="mb-2 mt-4 flex items-center justify-between px-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <span>Kelime Öbeği (Chunk)</span>
              <span className="font-mono text-[10px] text-muted-foreground/70 normal-case">(C tuşu)</span>
            </div>
            <div role="radiogroup" aria-label="Kelime öbeği boyutu" className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((size) => {
                const active = chunkSize === size
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChunkSizeChange(size)}
                    className={cn(
                      'ctl h-8 text-xs font-mono font-medium rounded-xl',
                      active ? 'ctl-primary' : 'bg-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {size} {size === 1 ? 'kelime' : 'k'}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Akıllı Dipnot Okuma */}
        {onReadFootnotesChange && (
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-foreground">Metin İçi Dipnotlar</p>
              <p className="text-[10px] text-muted-foreground">Yeri gelince oku ve cümleye dön</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={readFootnotes}
              onClick={() => onReadFootnotesChange(!readFootnotes)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                readFootnotes ? 'bg-primary' : 'bg-muted/60',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out',
                  readFootnotes ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
