'use client'

import { Eye, EyeOff, Minus, Plus, Type, Volume2, VolumeX, Zap } from 'lucide-react'
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { type ThemeId } from '@/lib/rsvp'
import { useFocusTrap } from '@/lib/use-focus-trap'

export type FontFace = 'theme' | 'sans' | 'serif' | 'mono'

export const FONT_FACES: { id: FontFace; label: string; sample: string; family: string }[] = [
  {
    id: 'theme',
    label: 'Tema',
    sample: 'Aa',
    family: 'var(--reader-font)',
  },
  {
    id: 'mono',
    label: 'Mono',
    sample: 'Aa',
    family: 'var(--font-geist-mono), ui-monospace, monospace',
  },
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
]

export const FONT_SCALE_MIN = 0.5
export const FONT_SCALE_MAX = 1.6
export const FONT_SCALE_STEP = 0.1

type FontSettingsProps = {
  theme?: ThemeId
  onThemeChange?: (theme: ThemeId) => void
  face: FontFace
  scale: number
  onFaceChange: (face: FontFace) => void
  onScaleChange: (scale: number) => void
  chunkSize?: number
  onChunkSizeChange?: (size: number) => void
  bionicEnabled?: boolean
  onBionicChange?: (val: boolean) => void
  neuroAudioEnabled?: boolean
  onNeuroAudioChange?: (val: boolean) => void
  eyeTrackingEnabled?: boolean
  onEyeTrackingChange?: (val: boolean) => void
  eyeTrackingStatus?: 'inactive' | 'initializing' | 'active' | 'attention-lost' | 'error'
  onOpenSpeedTest?: () => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

// Temaların Özel Malzeme ve Şekil İkonları
function CamShape() {
  return (
    <span className="relative block size-6.5 rounded-full backdrop-blur-md border border-white/80 dark:border-white/40 bg-gradient-to-br from-white/70 via-white/20 to-white/5 dark:from-white/25 dark:via-white/10 dark:to-transparent shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_6px_rgba(0,0,0,0.08)] shrink-0">
      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-[1.5px] rounded-full bg-white/95 dark:bg-white/70 pointer-events-none" />
    </span>
  )
}

function NeonShape() {
  return (
    <span className="relative block w-7.5 h-4.5 rounded-full bg-black/95 dark:bg-[#08080a] border border-purple-500/80 shadow-[0_0_10px_rgba(168,85,247,0.5),inset_0_0_6px_rgba(168,85,247,0.3)] flex items-center justify-center shrink-0">
      <span className="w-3.5 h-1 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc] pointer-events-none" />
    </span>
  )
}

function KagitShape() {
  return (
    <span className="relative block size-6 rounded-md bg-[#fbf0d9] dark:bg-[#2e261d] border border-[#cfbe96] dark:border-[#524433] shadow-[0_1px_3px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.4)] flex flex-col items-center justify-center gap-[2px] shrink-0">
      <span className="w-2.5 h-[1px] bg-[#998664]/70 dark:bg-[#857357]/70 rounded-full pointer-events-none" />
      <span className="w-2 h-[1px] bg-[#998664]/70 dark:bg-[#857357]/70 rounded-full pointer-events-none" />
    </span>
  )
}

export const FontSettings = memo(function FontSettings({
  theme = 'ios',
  onThemeChange,
  face,
  scale,
  onFaceChange,
  onScaleChange,
  chunkSize = 1,
  onChunkSizeChange,
  bionicEnabled = true,
  onBionicChange,
  neuroAudioEnabled = false,
  onNeuroAudioChange,
  eyeTrackingEnabled = false,
  onEyeTrackingChange,
  eyeTrackingStatus = 'inactive',
  onOpenSpeedTest,
  isOpen: controlledOpen,
  onOpenChange,
}: FontSettingsProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const nextVal = typeof next === 'function' ? next(open) : next
      if (!isControlled) {
        setUncontrolledOpen(nextVal)
      }
      onOpenChange?.(nextVal)
    },
    [isControlled, open, onOpenChange],
  )

  const rootRef = useRef<HTMLDivElement>(null)
  const dialogRef = useFocusTrap<HTMLDivElement>(open)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

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
        aria-label="Görünüm ve Okuma Ayarları (Aa)"
        title="Görünüm ve Okuma Ayarları (Aa)"
        data-wheel="font-scale"
        className={cn('ctl panel size-10 md:size-12 landscape-short:size-9 cursor-pointer', open && 'ctl-primary')}
      >
        <span className="font-serif font-bold text-sm md:text-base tracking-tighter select-none">Aa</span>
      </button>

      <div
        ref={dialogRef}
        id={panelId}
        role="dialog"
        aria-modal={open ? 'true' : undefined}
        aria-label="Görünüm ve okuma ayarları"
        inert={!open}
        className={cn(
          'panel panel-solid absolute -right-12 top-full z-50 mt-2 w-[min(19rem,calc(100vw-1.5rem))] origin-top-right p-3 sm:right-0 transition-all duration-200 ease-out shadow-xl flex flex-col gap-2.5',
          'max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain touch-pan-y landscape-short:max-h-[calc(100dvh-3.75rem)] landscape-short:w-[min(24rem,calc(100vw-1.5rem))] landscape-short:p-2.5',
          open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        {/* 1. Tema Seçimi (Simgeler aynı boyutta, sol üstte mini 1, 2, 3) */}
        {onThemeChange && (
          <div role="radiogroup" aria-label="Tasarım teması" className="grid grid-cols-3 gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'ios'}
              onClick={() => onThemeChange('ios')}
              className={cn(
                'relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer text-center select-none',
                theme === 'ios'
                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-sm'
                  : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1 left-1.5 text-[9px] font-mono font-bold leading-none select-none transition-colors',
                  theme === 'ios' ? 'text-primary' : 'text-muted-foreground/50',
                )}
              >
                T
              </span>
              <div className="h-7 flex items-center justify-center">
                <CamShape />
              </div>
              <span className="text-[11px] font-medium">Cam</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={theme === 'linear'}
              onClick={() => onThemeChange('linear')}
              className={cn(
                'relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer text-center select-none',
                theme === 'linear'
                  ? 'border-purple-400 bg-purple-500/10 text-foreground ring-1 ring-purple-400/40 shadow-sm'
                  : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1 left-1.5 text-[9px] font-mono font-bold leading-none select-none transition-colors',
                  theme === 'linear' ? 'text-purple-400' : 'text-muted-foreground/50',
                )}
              >
                T
              </span>
              <div className="h-7 flex items-center justify-center">
                <NeonShape />
              </div>
              <span className="text-[11px] font-medium">Neon</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={theme === 'kindle'}
              onClick={() => onThemeChange('kindle')}
              className={cn(
                'relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer text-center select-none',
                theme === 'kindle'
                  ? 'border-amber-600/70 bg-amber-500/10 text-foreground ring-1 ring-amber-600/40 shadow-sm'
                  : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1 left-1.5 text-[9px] font-mono font-bold leading-none select-none transition-colors',
                  theme === 'kindle' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/50',
                )}
              >
                T
              </span>
              <div className="h-7 flex items-center justify-center">
                <KagitShape />
              </div>
              <span className="text-[11px] font-medium">Kağıt</span>
            </button>
          </div>
        )}

        {/* 2. Yazı Boyutu (Tek satır: Type simgesi, eksi, slider, artı, %) */}
        <div className="flex items-center gap-2 pt-1" role="group" aria-label="Yazı boyutu">
          <Type className="size-4 text-muted-foreground/80 shrink-0 select-none" aria-hidden="true" />
          <button
            type="button"
            onClick={() => step(-FONT_SCALE_STEP)}
            disabled={scale <= FONT_SCALE_MIN}
            className="ctl size-8 shrink-0 disabled:opacity-40"
            aria-label="Yazıyı küçült"
          >
            <Minus className="size-3.5" />
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
            className="ctl size-8 shrink-0 disabled:opacity-40"
            aria-label="Yazıyı büyüt"
          >
            <Plus className="size-3.5" />
          </button>
          <span className="w-9 text-right font-mono text-[11px] tabular-nums font-semibold text-foreground/85 shrink-0 select-none">
            %{Math.round(scale * 100)}
          </span>
        </div>

        {/* 3. Yazı Tipi Ailesi (Başlık kaldırıldı, doğrudan 4 seçenek) */}
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
                  'ctl flex-col gap-0.5 rounded-xl py-1.5',
                  active ? 'ctl-primary' : 'bg-transparent text-muted-foreground',
                )}
              >
                <span
                  className="text-base leading-none"
                  style={{ fontFamily: f.family ?? 'var(--reader-font)' }}
                >
                  {f.sample}
                </span>
                <span className="text-[10px] font-medium">{f.label}</span>
              </button>
            )
          })}
        </div>

        {/* 4. Kelime Öbeği (Tek satır, sol üstte mini 1-3) */}
        {onChunkSizeChange && (
          <div className="relative pt-2.5 border-t border-border/40">
            <span
              aria-hidden="true"
              className="absolute -top-1.5 left-1 px-1 py-0 rounded text-[9px] font-mono font-bold bg-background border border-border/70 text-muted-foreground/80 leading-none select-none shadow-xs"
            >
              1-3
            </span>
            <div role="radiogroup" aria-label="Kelime öbeği boyutu" className="grid grid-cols-3 gap-1 w-full">
              {[1, 2, 3].map((size) => {
                const active = chunkSize === size
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChunkSizeChange(size)}
                    className={cn(
                      'ctl h-7 text-xs font-mono font-medium rounded-lg',
                      active ? 'ctl-primary' : 'bg-transparent text-muted-foreground hover:text-foreground',
                    )}
                    title={`${size} kelime (${size})`}
                  >
                    {size} kelime
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 5. Akıllı Bionic Öbekleme (2K-3K modlarında devreye giren kök vurgusu, sol üstte mini b) */}
        {onBionicChange && (
          <div className="relative pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'absolute -top-1.5 left-1 px-1 py-0 rounded text-[9px] font-mono font-bold bg-background border leading-none select-none shadow-xs transition-colors',
                bionicEnabled && chunkSize > 1
                  ? 'border-primary/50 text-primary'
                  : 'border-border/70 text-muted-foreground/80',
              )}
            >
              b
            </span>
            <div className="min-w-0 pr-1 pl-1">
              <p className="text-xs font-medium text-foreground truncate">Akıllı Bionic Öbekleme</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {chunkSize === 1
                  ? '2K–3K modlarında kökleri vurgular'
                  : bionicEnabled
                    ? `${chunkSize}K modunda bilişsel çıpa açık`
                    : '2K–3K öbeklerde kök vurgusu'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={bionicEnabled}
              onClick={() => onBionicChange(!bionicEnabled)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                bionicEnabled ? 'bg-primary' : 'bg-muted/60',
              )}
              aria-label="Akıllı Bionic Öbekleme"
            >
              <span
                className={cn(
                  'pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out',
                  bionicEnabled ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        )}

        {/* 6. Nöroakustik Odak Sesi (Kompakt switch, sol üstte mini m) */}
        {onNeuroAudioChange && (
          <div className="relative pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'absolute -top-1.5 left-1 px-1 py-0 rounded text-[9px] font-mono font-bold bg-background border leading-none select-none shadow-xs transition-colors',
                neuroAudioEnabled ? 'border-primary/50 text-primary' : 'border-border/70 text-muted-foreground/80',
              )}
            >
              m
            </span>
            <div className="min-w-0 pr-1 pl-1">
              <div className="flex items-center gap-1.5">
                {neuroAudioEnabled ? (
                  <Volume2 className="size-3.5 text-primary shrink-0 animate-pulse" />
                ) : (
                  <VolumeX className="size-3.5 text-muted-foreground shrink-0" />
                )}
                <p className="text-xs font-medium text-foreground truncate">Nöroakustik Odak Sesi</p>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {neuroAudioEnabled ? '40Hz Gama & Pembe Gürültü açık' : 'Pembe gürültü & 40Hz Gama'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={neuroAudioEnabled}
              onClick={() => onNeuroAudioChange(!neuroAudioEnabled)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                neuroAudioEnabled ? 'bg-primary' : 'bg-muted/60',
              )}
              aria-label="Nöroakustik Odak Sesi"
            >
              <span
                className={cn(
                  'pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out',
                  neuroAudioEnabled ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        )}

        {/* 7. Göz & Dikkat İzleme (Web Kamerası, sol üstte mini g) */}
        {onEyeTrackingChange && (
          <div className="relative pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'absolute -top-1.5 left-1 px-1 py-0 rounded text-[9px] font-mono font-bold bg-background border leading-none select-none shadow-xs transition-colors',
                eyeTrackingEnabled ? 'border-emerald-500/60 text-emerald-500' : 'border-border/70 text-muted-foreground/80',
              )}
            >
              g
            </span>
            <div className="min-w-0 pr-1 pl-1">
              <div className="flex items-center gap-1.5">
                {eyeTrackingEnabled ? (
                  <Eye className="size-3.5 text-emerald-500 shrink-0 animate-pulse" />
                ) : (
                  <EyeOff className="size-3.5 text-muted-foreground shrink-0" />
                )}
                <p className="text-xs font-medium text-foreground truncate">Göz & Dikkat İzleme</p>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {!eyeTrackingEnabled
                  ? 'Ekrandan kopunca otomatik duraklatır'
                  : eyeTrackingStatus === 'initializing'
                    ? 'Kamera izni / yüz modeli hazırlanıyor...'
                    : eyeTrackingStatus === 'attention-lost'
                      ? 'Dikkat kaybı — Okuma duraklatıldı'
                      : 'EAR & yüz takibi aktif (Cihaz içi)'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={eyeTrackingEnabled}
              onClick={() => onEyeTrackingChange(!eyeTrackingEnabled)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                eyeTrackingEnabled ? 'bg-emerald-500' : 'bg-muted/60',
              )}
              aria-label="Göz ve Dikkat İzleme"
            >
              <span
                className={cn(
                  'pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out',
                  eyeTrackingEnabled ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        )}

        {/* 8. Okuma Hızı Testi (Yalnızca başlık ve sonda şimşek simgesi) */}
        {onOpenSpeedTest && (
          <div className="pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenSpeedTest()
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted/30 hover:bg-muted/70 text-foreground transition-colors text-xs font-medium cursor-pointer"
            >
              <span>Okuma Hızı Testi</span>
              <Zap className="size-3.5 text-primary shrink-0" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
})
