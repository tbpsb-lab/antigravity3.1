'use client'

import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  QrCode,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react'
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
  onOpenSync?: () => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

// Bionic için Beyin İkonu
function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M12 5v13" />
      <path d="M16 8h2" />
      <path d="M6 8h2" />
      <path d="M16 13h2" />
      <path d="M6 13h2" />
    </svg>
  )
}

// Temaların Özel Malzeme ve Şekil İkonları
function CamShape() {
  return (
    <span className="relative block size-4.5 sm:size-5 rounded-full backdrop-blur-md border border-white/80 dark:border-white/40 bg-gradient-to-br from-white/70 via-white/20 to-white/5 dark:from-white/25 dark:via-white/10 dark:to-transparent shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_6px_rgba(0,0,0,0.08)] shrink-0">
      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-2 h-[1.5px] rounded-full bg-white/95 dark:bg-white/70 pointer-events-none" />
    </span>
  )
}

function NeonShape() {
  return (
    <span className="relative block w-5.5 sm:w-6 h-3 sm:h-3.5 rounded-full bg-black/95 dark:bg-[#08080a] border border-purple-500/80 shadow-[0_0_8px_rgba(168,85,247,0.5),inset_0_0_6px_rgba(168,85,247,0.3)] flex items-center justify-center shrink-0">
      <span className="w-2 h-1 rounded-full bg-purple-400 shadow-[0_0_5px_#c084fc] pointer-events-none" />
    </span>
  )
}

function KagitShape() {
  return (
    <span className="relative block size-4.5 sm:size-5 rounded-md bg-[#fbf0d9] dark:bg-[#2e261d] border border-[#cfbe96] dark:border-[#524433] shadow-[0_1px_3px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.4)] flex flex-col items-center justify-center gap-[2px] shrink-0">
      <span className="w-2 h-[1px] bg-[#998664]/70 dark:bg-[#857357]/70 rounded-full pointer-events-none" />
      <span className="w-1.5 h-[1px] bg-[#998664]/70 dark:bg-[#857357]/70 rounded-full pointer-events-none" />
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
  onOpenSync,
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
          'panel panel-solid absolute -right-12 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] origin-top-right p-2 sm:p-2.5 sm:right-0 transition-all duration-200 ease-out shadow-2xl flex flex-col gap-1',
          'max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain touch-pan-y landscape-short:max-h-[calc(100dvh-3.75rem)] landscape-short:w-[min(24rem,calc(100vw-1.5rem))] landscape-short:p-2.5',
          open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        {/* Üst Alan: Sol Kolon (Temalar + Yazı Ailesi + Kelime Öbeği) & Sağ Kolon (En Üstten En Alta Uzanan Dikey Kadran) */}
        <div className="grid grid-cols-[1fr_auto] gap-1.5 items-stretch">
          {/* Sol Kolon: Temalar (Satır 1), Yazı Ailesi (Satır 2), Kelime Öbekleri (Satır 3) */}
          <div className="flex flex-col gap-1 min-w-0">
            {/* 1. Tema Seçimi (Sola doğru kompakt haplar - Kadrana yer açar) */}
            {onThemeChange && (
              <div role="radiogroup" aria-label="Tasarım teması" className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === 'ios'}
                  onClick={() => onThemeChange('ios')}
                  className={cn(
                    'relative flex items-center justify-center gap-1 py-1 px-1 rounded-lg border transition-all cursor-pointer select-none text-center',
                    theme === 'ios'
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-xs'
                      : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground',
                  )}
                  title="Cam Teması (Kısayol: T)"
                >
                  <CamShape />
                  <span className="text-[11px] sm:text-xs font-semibold">Cam</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'desktop-shortcut-badge hidden md:block absolute bottom-0.5 right-1 text-[8px] font-mono font-bold leading-none select-none transition-colors',
                      theme === 'ios' ? 'text-primary' : 'text-muted-foreground/40',
                    )}
                  >
                    t
                  </span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === 'linear'}
                  onClick={() => onThemeChange('linear')}
                  className={cn(
                    'relative flex items-center justify-center gap-1 py-1 px-1 rounded-lg border transition-all cursor-pointer select-none text-center',
                    theme === 'linear'
                      ? 'border-purple-400 bg-purple-500/10 text-foreground ring-1 ring-purple-400/40 shadow-xs'
                      : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground',
                  )}
                  title="Neon Teması (Kısayol: T)"
                >
                  <NeonShape />
                  <span className="text-[11px] sm:text-xs font-semibold">Neon</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'desktop-shortcut-badge hidden md:block absolute bottom-0.5 right-1 text-[8px] font-mono font-bold leading-none select-none transition-colors',
                      theme === 'linear' ? 'text-purple-400' : 'text-muted-foreground/40',
                    )}
                  >
                    t
                  </span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === 'kindle'}
                  onClick={() => onThemeChange('kindle')}
                  className={cn(
                    'relative flex items-center justify-center gap-1 py-1 px-1 rounded-lg border transition-all cursor-pointer select-none text-center',
                    theme === 'kindle'
                      ? 'border-amber-600/70 bg-amber-500/10 text-foreground ring-1 ring-amber-600/40 shadow-xs'
                      : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground',
                  )}
                  title="Kağıt Teması (Kısayol: T)"
                >
                  <KagitShape />
                  <span className="text-[11px] sm:text-xs font-semibold">Kağıt</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'desktop-shortcut-badge hidden md:block absolute bottom-0.5 right-1 text-[8px] font-mono font-bold leading-none select-none transition-colors',
                      theme === 'kindle' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/40',
                    )}
                  >
                    t
                  </span>
                </button>
              </div>
            )}

            {/* 2. Yazı Tipi Ailesi (Aa Tema, Aa Mono, Aa Sans, Aa Serif) */}
            <div role="radiogroup" aria-label="Yazı tipi ailesi" className="grid grid-cols-4 gap-1">
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
                      'flex flex-col items-center justify-center py-0.5 px-0.5 rounded-lg transition-all cursor-pointer select-none text-center',
                      active
                        ? 'bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/40 font-semibold'
                        : 'border border-border/60 hover:bg-muted/50 text-foreground/80 hover:text-foreground',
                    )}
                    title={f.label}
                  >
                    <span
                      className="text-xs sm:text-sm leading-none font-bold"
                      style={{ fontFamily: f.family ?? 'var(--reader-font)' }}
                    >
                      {f.sample}
                    </span>
                    <span className="text-[9.5px] font-medium mt-0.5 opacity-90">{f.label}</span>
                  </button>
                )
              })}
            </div>

            {/* 3. Kelime Öbeği (1 kelime, 2 kelime, 3 kelime) */}
            {onChunkSizeChange && (
              <div role="radiogroup" aria-label="Kelime öbeği boyutu" className="grid grid-cols-3 gap-1">
                {[1, 2, 3].map((size) => {
                  const active = chunkSize === size
                  return (
                    <button
                      key={size}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onChunkSizeChange(size)}
                      data-wheel="chunk-size"
                      className={cn(
                        'relative flex items-center justify-center py-1 px-1 rounded-lg transition-all cursor-pointer select-none text-center text-xs font-semibold',
                        active
                          ? 'bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/40'
                          : 'border border-border/60 hover:bg-muted/50 text-foreground/80 hover:text-foreground',
                      )}
                      title={`${size} kelime (Kısayol: ${size})`}
                    >
                      <span>{size} kelime</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'desktop-shortcut-badge hidden md:block absolute bottom-0.5 right-1 text-[8px] font-mono font-bold leading-none select-none transition-colors',
                          active ? 'text-primary-foreground/80' : 'text-muted-foreground/50',
                        )}
                      >
                        {size}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sağ Kolon: Dikey Yazı Boyutu Kadranı (En Üst Tema Sınırından En Alt Kelime Öbeği Sınırına Kadar Uzanır) */}
          <div
            data-wheel="font-scale"
            onWheel={(e) => {
              e.preventDefault()
              e.stopPropagation()
              step(e.deltaY < 0 ? FONT_SCALE_STEP : -FONT_SCALE_STEP)
            }}
            className="w-11 sm:w-11.5 h-full flex flex-col items-center justify-between py-1 px-0.5 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/60 hover:border-primary/50 transition-all select-none shadow-xs group cursor-ns-resize shrink-0"
            title={`Yazı Boyutu: %${Math.round(scale * 100)} (Tıkla veya Farenin Tekerleğiyle Kaydır)`}
            role="group"
            aria-label="Dikey Yazı Boyutu Kadranı"
          >
            {/* A+ Butonu */}
            <button
              type="button"
              onClick={() => step(FONT_SCALE_STEP)}
              disabled={scale >= FONT_SCALE_MAX}
              className="w-full flex flex-col items-center justify-center py-0.5 text-foreground hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              aria-label="Yazı Boyutunu Büyüt"
              title="Büyüt"
            >
              <div className="flex items-start font-serif font-bold text-sm sm:text-base leading-none">
                <span>A</span>
                <span className="text-[10px] font-sans -mt-0.5 ml-0.5 font-extrabold">+</span>
              </div>
              <ChevronUp className="size-3 text-muted-foreground/60 group-hover:text-primary transition-colors -mt-0.5" />
            </button>

            {/* Dikey Seviye Göstergesi (Estetik Çizgiler & Yüzde) */}
            <div className="flex flex-col items-center justify-center gap-1 my-0.5 w-full px-1 flex-1" aria-hidden="true">
              {[1.5, 1.3, 1.1, 0.9, 0.7].map((lvl) => {
                const isReached = scale >= lvl - 0.05
                const isCurrent = Math.abs(scale - lvl) < 0.1
                return (
                  <span
                    key={lvl}
                    className={cn(
                      'h-1 rounded-full transition-all duration-200',
                      isCurrent
                        ? 'w-5 bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.7)]'
                        : isReached
                          ? 'w-3.5 bg-primary/60'
                          : 'w-2 bg-muted-foreground/30',
                    )}
                  />
                )
              })}
              <span className="font-mono text-[9px] font-bold text-muted-foreground/90 tabular-nums mt-0.5 leading-none">
                %{Math.round(scale * 100)}
              </span>
            </div>

            {/* A- Butonu */}
            <button
              type="button"
              onClick={() => step(-FONT_SCALE_STEP)}
              disabled={scale <= FONT_SCALE_MIN}
              className="w-full flex flex-col items-center justify-center py-0.5 text-foreground hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              aria-label="Yazı Boyutunu Küçült"
              title="Küçült"
            >
              <ChevronDown className="size-3 text-muted-foreground/60 group-hover:text-primary transition-colors -mb-0.5" />
              <div className="flex items-start font-serif font-bold text-sm sm:text-base leading-none">
                <span>A</span>
                <span className="text-[10px] font-sans -mt-0.5 ml-0.5 font-extrabold">-</span>
              </div>
            </button>
          </div>
        </div>

        {/* 4. Özellik Satırları (Daha dar, kompakt satırlar; G harfi ve ikonlar temaya uygun renkte) */}
        <div className="flex flex-col border-t border-border/40 divide-y divide-border/25 pt-0.5">
          {/* Akıllı Bionic Öbekleme */}
          {onBionicChange && (
            <div className="flex items-center justify-between gap-2 py-1 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <BrainIcon
                  className={cn(
                    'size-3.5 shrink-0 transition-colors',
                    bionicEnabled ? 'text-primary' : 'text-muted-foreground/50',
                  )}
                />
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-foreground truncate leading-tight">
                    Akıllı <span className="desktop-shortcut-key font-semibold md:font-bold md:text-primary md:underline md:underline-offset-2 md:decoration-2 md:decoration-primary/70">B</span>ionic Öbekleme
                  </p>
                  <p className="text-[9.5px] text-muted-foreground truncate leading-none mt-0.5">
                    2K-3K modlarında kökleri vurgular
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={bionicEnabled}
                onClick={() => onBionicChange(!bionicEnabled)}
                className={cn(
                  'relative inline-flex h-4 w-7.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  bionicEnabled ? 'bg-primary' : 'bg-muted/70',
                )}
                aria-label="Akıllı Bionic Öbekleme (Kısayol: B)"
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block size-3 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out',
                    bionicEnabled ? 'translate-x-3.5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          )}

          {/* Nöroakustik Odak Sesi */}
          {onNeuroAudioChange && (
            <div className="flex items-center justify-between gap-2 py-1 px-1">
              <div className="flex items-center gap-2 min-w-0">
                {neuroAudioEnabled ? (
                  <Volume2 className="size-3.5 text-primary shrink-0 transition-colors animate-pulse" />
                ) : (
                  <VolumeX className="size-3.5 text-muted-foreground/50 shrink-0 transition-colors" />
                )}
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-foreground truncate leading-tight">
                    <span className="desktop-shortcut-key font-semibold md:font-bold md:text-primary md:underline md:underline-offset-2 md:decoration-2 md:decoration-primary/70">N</span>öroakustik Odak Sesi
                  </p>
                  <p className="text-[9.5px] text-muted-foreground truncate leading-none mt-0.5">
                    Pembe gürültü & 40Hz Gama
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={neuroAudioEnabled}
                onClick={() => onNeuroAudioChange(!neuroAudioEnabled)}
                className={cn(
                  'relative inline-flex h-4 w-7.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  neuroAudioEnabled ? 'bg-primary' : 'bg-muted/70',
                )}
                aria-label="Nöroakustik Odak Sesi (Kısayol: N)"
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block size-3 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out',
                    neuroAudioEnabled ? 'translate-x-3.5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          )}

          {/* Göz & Dikkat İzleme (G harfi ve ikon diğerleriyle uyumlu tema renginde) */}
          {onEyeTrackingChange && (
            <div className="flex items-center justify-between gap-2 py-1 px-1">
              <div className="flex items-center gap-2 min-w-0">
                {eyeTrackingEnabled ? (
                  <Eye className="size-3.5 text-primary shrink-0 transition-colors animate-pulse" />
                ) : (
                  <EyeOff className="size-3.5 text-muted-foreground/50 shrink-0 transition-colors" />
                )}
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-foreground truncate leading-tight">
                    <span className="desktop-shortcut-key font-semibold md:font-bold md:text-primary md:underline md:underline-offset-2 md:decoration-2 md:decoration-primary/70">G</span>öz & Dikkat İzleme
                  </p>
                  <p className="text-[9.5px] text-muted-foreground truncate leading-none mt-0.5">
                    Ekrandan kopunca otomatik duraklatır
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={eyeTrackingEnabled}
                onClick={() => onEyeTrackingChange(!eyeTrackingEnabled)}
                className={cn(
                  'relative inline-flex h-4 w-7.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  eyeTrackingEnabled ? 'bg-primary' : 'bg-muted/70',
                )}
                aria-label="Göz & Dikkat İzleme (Kısayol: G)"
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block size-3 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out',
                    eyeTrackingEnabled ? 'translate-x-3.5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          )}

          {/* Cihaz Eşleştir */}
          <div className="flex items-center justify-between gap-2 py-1 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <QrCode className="size-3.5 text-primary shrink-0 transition-colors" />
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold text-foreground truncate leading-tight">
                  Cihaz <span className="desktop-shortcut-key font-semibold md:font-bold md:text-primary md:underline md:underline-offset-2 md:decoration-2 md:decoration-primary/70">E</span>şleştir
                </p>
                <p className="text-[9.5px] text-muted-foreground truncate leading-none mt-0.5">
                  Ekranlar arası senkronizasyon
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenSync?.()
              }}
              className="ctl px-2 py-0.5 text-[10.5px] font-semibold rounded-lg text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
              aria-label="Cihaz Eşleştir (Kısayol: E)"
              title="Karekod ve Eşleme Menüsünü Aç (E)"
            >
              <span>Eşle</span>
              <ArrowRight className="size-2.5" />
            </button>
          </div>
        </div>

        {/* 5. Okuma Hızı Testi (Her zaman aktif renkte, kompakt buton) */}
        {onOpenSpeedTest && (
          <div className="pt-0.5 border-t border-border/30">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenSpeedTest()
              }}
              className="w-full flex items-center justify-between px-2.5 py-1 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary transition-all text-xs font-semibold shadow-xs cursor-pointer group"
            >
              <span className="group-hover:translate-x-0.5 transition-transform">Okuma Hızı Testi</span>
              <Zap className="size-3 text-primary fill-primary/30 shrink-0 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
})
